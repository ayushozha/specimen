import type { Breakpoint, Rect, StyleSheetText } from '@specimen/core';
import type { Capabilities, CoreFn, PageAdapter } from './adapter';

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
  readonly capabilities: Capabilities = { exactFullPage: true, mhtml: true, allStyleSheets: true };

  private target: chrome.debugger.Debuggee;
  private contextId: number | null = null;
  private sheets = new Map<string, StyleSheetHeader>();
  private detachListeners: ((reason: string) => void)[] = [];
  private attached = true;
  private coreSource: Promise<string>;
  private resourceTree: Promise<ResourceTree> | null = null;

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
      if (!frame.parentId) this.contextId = null;
      this.resourceTree = null;
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

  private async evaluate(expression: string, contextId?: number): Promise<unknown> {
    const res = await this.send<{ result: { value?: unknown }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
      'Runtime.evaluate',
      { expression, contextId, awaitPromise: true, returnByValue: true, userGesture: true },
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
    return (await this.evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`)) as R;
  }

  async pageInfo(): Promise<{ url: string; title: string }> {
    return (await this.evaluate('({ url: location.href, title: document.title })')) as { url: string; title: string };
  }

  async setViewport(bp: Breakpoint | null, scale: number): Promise<void> {
    if (!bp) {
      await this.send('Emulation.clearDeviceMetricsOverride');
      await this.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      return;
    }
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: bp.width,
      height: bp.height,
      deviceScaleFactor: scale,
      mobile: bp.mobile,
    });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: bp.mobile });
  }

  async screenshot(clip: Rect): Promise<Uint8Array> {
    const { data } = await this.send<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
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
