import type { Breakpoint, Rect, StyleSheetText } from '@specimen/core';
import type { Capabilities, CoreFn, PageAdapter, ScreencastFrame } from './adapter';
import { CONFIG } from './config';

const CORE_SCRIPT = '/core.js';
const WORLD_NAME = 'specimen';

interface StyleSheetHeader {
  styleSheetId: string;
  sourceURL: string;
  frameId: string;
}

/** Drives a tab through the Chrome DevTools Protocol via `chrome.debugger`. */
export class ChromiumAdapter implements PageAdapter {
  readonly browser = 'chromium';
  readonly capabilities: Capabilities = { exactFullPage: true, mhtml: true, allStyleSheets: true, screencast: true, hooks: true, frameStepping: true, realPointer: true, deviceEmulation: true };

  private target: chrome.debugger.Debuggee;
  private contextId: number | null = null;
  private sheets = new Map<string, StyleSheetHeader>();
  private detachListeners: ((reason: string) => void)[] = [];
  private attached = true;
  private coreSource: Promise<string>;
  private resourceTree: Promise<ResourceTree> | null = null;
  private frames: ScreencastFrame[] | null = null;
  private loadWaiters: (() => void)[] = [];

  private constructor(tabId: number) {
    this.target = { tabId };
    this.coreSource = fetch(chrome.runtime.getURL(CORE_SCRIPT)).then((r) => r.text());
    chrome.debugger.onEvent.addListener(this.onEvent);
    chrome.debugger.onDetach.addListener(this.onDetached);
  }

  static async attach(tabId: number): Promise<ChromiumAdapter> {
    await chrome.debugger.attach({ tabId }, '1.3');
    const adapter = new ChromiumAdapter(tabId);
    await adapter.send('Page.enable');
    await adapter.send('DOM.enable');
    await adapter.send('CSS.enable');
    return adapter;
  }

  get tabId(): number {
    return this.target.tabId!;
  }

  get isAttached(): boolean {
    return this.attached;
  }

  send<T = Record<string, unknown>>(method: string, params?: Record<string, unknown>): Promise<T> {
    return chrome.debugger.sendCommand(this.target, method, params) as Promise<T>;
  }

  private onEvent = (source: chrome.debugger.Debuggee, method: string, params?: object) => {
    if (source.tabId !== this.target.tabId) return;
    if (method === 'CSS.styleSheetAdded') {
      const header = (params as { header: StyleSheetHeader }).header;
      this.sheets.set(header.styleSheetId, header);
    } else if (method === 'CSS.styleSheetRemoved') {
      this.sheets.delete((params as { styleSheetId: string }).styleSheetId);
    } else if (method === 'Page.frameNavigated') {
      const frame = (params as { frame: { parentId?: string } }).frame;
      if (!frame.parentId) {
        this.contextId = null;
        this.sheets.clear();
      }
      this.resourceTree = null;
    } else if (method === 'Page.screencastFrame') {
      const { data, sessionId, metadata } = params as { data: string; sessionId: number; metadata: { timestamp?: number; scrollOffsetY: number } };
      void this.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      this.frames?.push({ data: base64ToBytes(data), type: 'image/jpeg', time: metadata.timestamp ?? performance.now() / 1000, scrollY: metadata.scrollOffsetY });
    } else if (method === 'Page.loadEventFired') {
      this.loadWaiters.splice(0).forEach((resolve) => resolve());
    }
  };

  private onDetached = (source: chrome.debugger.Debuggee, reason: string) => {
    if (source.tabId !== this.target.tabId) return;
    this.attached = false;
    this.cleanup();
    this.detachListeners.forEach((l) => l(reason));
  };

  onDetach(listener: (reason: string) => void): void {
    this.detachListeners.push(listener);
  }

  private async mainFrameId(): Promise<string> {
    const { frameTree } = await this.send<{ frameTree: { frame: { id: string } } }>('Page.getFrameTree');
    return frameTree.frame.id;
  }

  /** Creates the isolated world and loads the core script into it. */
  private async ensureWorld(): Promise<number> {
    if (this.contextId !== null) return this.contextId;
    const { executionContextId } = await this.send<{ executionContextId: number }>('Page.createIsolatedWorld', {
      frameId: await this.mainFrameId(),
      worldName: WORLD_NAME,
      grantUniveralAccess: false,
    });
    await this.evaluate(await this.coreSource, executionContextId);
    this.contextId = executionContextId;
    return executionContextId;
  }

  /**
   * Never pass `userGesture`: page code can run during our calls (getters, click handlers), and a
   * gesture would let it open pop-ups or write to the clipboard as if the user had clicked.
   */
  private async evaluate(expression: string, contextId?: number, timeout?: number): Promise<unknown> {
    const res = await this.send<{ result: { value?: unknown }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
      'Runtime.evaluate',
      { expression, contextId, awaitPromise: true, returnByValue: true, timeout },
    );
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    }
    return res.result.value;
  }

  async call<K extends CoreFn>(fn: K, ...args: unknown[]): Promise<never> {
    const expression = `globalThis.__specimenCore.${fn}(...${JSON.stringify(args)})`;
    try {
      return (await this.evaluate(expression, await this.ensureWorld())) as never;
    } catch (err) {
      // The page navigated or the world was torn down: rebuild once and retry.
      if (!/context|__specimenCore/i.test(String(err))) throw err;
      this.contextId = null;
      return (await this.evaluate(expression, await this.ensureWorld())) as never;
    }
  }

  async evaluateMain<A extends unknown[], R>(fn: (...args: A) => R, ...args: A): Promise<R> {
    // Page code (getters on globals) runs during this call, so it gets a time limit.
    return (await this.evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`, undefined, CONFIG.mainWorldTimeoutMs)) as R;
  }

  async pageInfo(): Promise<{ url: string; title: string }> {
    return (await this.evaluate('({ url: location.href, title: document.title })')) as { url: string; title: string };
  }

  async setViewport(bp: Breakpoint | null, scale: number): Promise<number | null> {
    if (!bp) {
      await this.send('Emulation.clearDeviceMetricsOverride');
      await this.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      return null;
    }
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: bp.width,
      height: bp.height,
      deviceScaleFactor: scale,
      mobile: bp.mobile,
    });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: bp.mobile });
    return bp.width;
  }

  async screenshot(clip: Rect, options: { visible?: boolean } = {}): Promise<Uint8Array> {
    const { data } = await this.send<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: !options.visible,
      fromSurface: true,
      clip: { ...clip, scale: 1 },
    });
    return base64ToBytes(data);
  }

  async styleSheets(): Promise<StyleSheetText[]> {
    const out: StyleSheetText[] = [];
    for (const header of this.sheets.values()) {
      try {
        const { text } = await this.send<{ text: string }>('CSS.getStyleSheetText', { styleSheetId: header.styleSheetId });
        out.push({ url: header.sourceURL, text });
      } catch {
        // Sheet went away meanwhile.
      }
    }
    return out;
  }

  async resource(url: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    try {
      this.resourceTree ??= this.send<{ frameTree: ResourceTree }>('Page.getResourceTree').then((r) => r.frameTree);
      const frameTree = await this.resourceTree;
      const found = findResource(frameTree, url);
      const frameId = found?.frameId ?? frameTree.frame.id;
      const { content, base64Encoded } = await this.send<{ content: string; base64Encoded: boolean }>('Page.getResourceContent', { frameId, url });
      return {
        data: base64Encoded ? base64ToBytes(content) : new TextEncoder().encode(content),
        mimeType: found?.mimeType ?? '',
      };
    } catch {
      return null;
    }
  }

  async mouseMove(x: number, y: number): Promise<void> {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(x), y: Math.round(y), button: 'none' });
  }

  async hover(_selector: string, box: Rect, on: boolean): Promise<void> {
    if (on) await this.mouseMove(box.x + box.width / 2, box.y + box.height / 2);
    else await this.mouseMove(1, 1);
  }

  async startScreencast(maxWidth: number, maxHeight: number): Promise<void> {
    this.frames = [];
    await this.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth, maxHeight, everyNthFrame: 1 });
  }

  async stopScreencast(): Promise<ScreencastFrame[]> {
    await this.send('Page.stopScreencast').catch(() => {});
    const frames = this.frames ?? [];
    this.frames = null;
    return frames;
  }

  async reloadWithHooks(source: string, timeoutMs: number): Promise<void> {
    const { identifier } = await this.send<{ identifier: string }>('Page.addScriptToEvaluateOnNewDocument', { source });
    try {
      const loaded = new Promise<void>((resolve) => {
        this.loadWaiters.push(resolve);
        setTimeout(resolve, timeoutMs);
      });
      await this.send('Page.reload', { ignoreCache: false });
      await loaded;
    } finally {
      await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier }).catch(() => {});
    }
  }

  async mhtml(): Promise<string | null> {
    const { data } = await this.send<{ data: string }>('Page.captureSnapshot', { format: 'mhtml' });
    return data;
  }

  async detach(): Promise<void> {
    if (!this.attached) return;
    this.attached = false;
    this.cleanup();
    try {
      await chrome.debugger.detach(this.target);
    } catch {
      // Already detached (tab closed or the user cancelled the debugging bar).
    }
  }

  private cleanup() {
    chrome.debugger.onEvent.removeListener(this.onEvent);
    chrome.debugger.onDetach.removeListener(this.onDetached);
  }
}

interface ResourceTree {
  frame: { id: string };
  resources: { url: string; mimeType: string }[];
  childFrames?: ResourceTree[];
}

function findResource(tree: ResourceTree, url: string): { frameId: string; mimeType: string } | null {
  const r = tree.resources.find((x) => x.url === url);
  if (r) return { frameId: tree.frame.id, mimeType: r.mimeType };
  for (const child of tree.childFrames ?? []) {
    const hit = findResource(child, url);
    if (hit) return hit;
  }
  return null;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
