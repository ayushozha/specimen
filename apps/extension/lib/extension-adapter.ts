import type * as Core from '@specimen/core';
import type { Breakpoint, Rect, StyleSheetText } from '@specimen/core';
import type { Capabilities, CoreFn, PageAdapter, ScreencastFrame } from './adapter';
import { CONFIG } from './config';
import { SafariCaptureTarget } from './safari-screenshot';

const CORE_SCRIPT = '/core.js';
const HOOKS_SCRIPT = '/hooks.js';
const HOOKS_ID = 'specimen-hooks';
/** Smallest window size worth asking for; browsers enforce their own minimum anyway. */
const MIN_WINDOW = 200;

/** `browser.*` where it exists (Firefox, Safari), else `chrome.*`; both return promises in MV3. */
const api: typeof chrome = (globalThis as unknown as { browser?: typeof chrome }).browser ?? chrome;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Drives a tab with standard WebExtension APIs only (scripting, tabs, windows) for browsers without
 * the DevTools Protocol: Firefox and Safari. Screenshots use Firefox's `tabs.captureTab` with a page
 * rect, or scroll-and-stitch `captureVisibleTab` elsewhere; breakpoints resize the window; hover is
 * simulated from the page's own :hover rules.
 */
export class ExtensionAdapter implements PageAdapter {
  readonly browser: 'firefox' | 'safari' | 'chromium';
  readonly capabilities: Capabilities;
  private detachListeners: ((reason: string) => void)[] = [];
  private originalSize: { width?: number; height?: number } | null = null;
  private windowId: number | null = null;
  private sheetTexts: string[] = [];
  private captureTab = (api.tabs as unknown as { captureTab?: (tabId: number, options: object) => Promise<string> }).captureTab;
  private lastVisibleCapture = 0;
  private safariTarget: SafariCaptureTarget | undefined;
  private scannedDocumentId: string | undefined;
  private captureDocumentId: string | undefined;

  constructor(
    private tabId: number,
    browser: 'firefox' | 'safari' | 'chromium',
  ) {
    this.browser = browser;
    if (browser === 'safari') this.safariTarget = new SafariCaptureTarget(api.tabs, tabId);
    this.capabilities = {
      exactFullPage: !!this.captureTab,
      mhtml: false,
      allStyleSheets: true,
      screencast: false,
      hooks: true,
      frameStepping: !!this.captureTab,
      realPointer: false,
      deviceEmulation: false,
    };
    api.tabs.onRemoved.addListener(this.onRemoved);
  }

  private onRemoved = (id: number) => {
    if (id === this.tabId) this.detachListeners.forEach((l) => l('target_closed'));
  };

  onDetach(listener: (reason: string) => void): void {
    this.detachListeners.push(listener);
  }

  get captureTargetChanged(): boolean {
    return this.safariTarget?.changed ?? false;
  }

  async startCapture(url: string): Promise<void> {
    if (!this.safariTarget) return;
    this.windowId = await this.safariTarget.start(url);
    await this.refreshCaptureDocument(this.safariTarget, this.scannedDocumentId);
  }

  stopCapture(): void {
    this.safariTarget?.stop();
    this.captureDocumentId = undefined;
  }

  private async refreshCaptureDocument(target: SafariCaptureTarget, expectedDocumentId?: string): Promise<void> {
    const results = await api.scripting.executeScript({ target: { tabId: this.tabId }, func: () => location.href }).catch(() => []);
    const [page] = results;
    target.checkDocument(!expectedDocumentId || page?.documentId === expectedDocumentId ? page?.result : undefined);
    this.captureDocumentId = page?.documentId;
  }

  private scriptTarget(): chrome.scripting.InjectionTarget {
    if (this.captureDocumentId) return { tabId: this.tabId, documentIds: [this.captureDocumentId] };
    // Without a document ID, a stale tab must not receive any page cleanup scripts.
    if (this.safariTarget?.changed) this.safariTarget.checkDocument(undefined);
    return { tabId: this.tabId };
  }

  private async executeScript<T>(func: (...args: never[]) => T, args: unknown[] = [], world: 'ISOLATED' | 'MAIN' = 'ISOLATED') {
    const [res] = await api.scripting.executeScript({ target: this.scriptTarget(), func: func as never, args: args as never[], world } as chrome.scripting.ScriptInjection<unknown[], T>);
    if ((res as { error?: unknown }).error) throw new Error(String((res as { error?: unknown }).error));
    return res;
  }

  private async exec<T>(func: (...args: never[]) => T, args: unknown[] = [], world: 'ISOLATED' | 'MAIN' = 'ISOLATED'): Promise<Awaited<T>> {
    const res = await this.executeScript(func, args, world);
    return res.result as Awaited<T>;
  }

  private async ensureCore(): Promise<void> {
    const loaded = await this.exec(() => !!(globalThis as unknown as { __specimenCore?: unknown }).__specimenCore);
    if (!loaded) await api.scripting.executeScript({ target: this.scriptTarget(), files: [CORE_SCRIPT] });
  }

  async call<K extends CoreFn>(fn: K, ...args: Parameters<(typeof Core)[K]>): Promise<Awaited<ReturnType<(typeof Core)[K]>>> {
    await this.ensureCore();
    return (await this.exec(
      ((name: string, a: unknown[]) => ((globalThis as unknown as { __specimenCore: Record<string, (...x: unknown[]) => unknown> }).__specimenCore[name](...a))) as never,
      [fn, args],
    )) as never;
  }

  async evaluateMain<A extends unknown[], R>(fn: (...args: A) => R, ...args: A): Promise<R> {
    // Page code (getters) runs during this call, so it gets a time limit.
    return Promise.race([
      this.exec(fn as never, args, 'MAIN') as Promise<R>,
      sleep(CONFIG.mainWorldTimeoutMs).then(() => {
        throw new Error('The page took too long to answer');
      }),
    ]);
  }

  async pageInfo(): Promise<{ url: string; title: string }> {
    const res = await this.executeScript(() => ({ url: location.href, title: document.title }));
    if (this.safariTarget && !this.safariTarget.watching) this.scannedDocumentId = res.documentId;
    return res.result as { url: string; title: string };
  }

  /**
   * Breakpoints by resizing the window until the page's viewport has the target width. Browsers keep
   * windows on screen and above a minimum width, so it returns the width actually reached.
   */
  async setViewport(bp: Breakpoint | null, _scale: number): Promise<number | null> {
    this.windowId ??= (await api.tabs.get(this.tabId)).windowId;
    const win = await api.windows.get(this.windowId);
    if (!bp) {
      if (this.originalSize) await api.windows.update(this.windowId, this.originalSize).catch(() => {});
      this.originalSize = null;
      return null;
    }
    this.originalSize ??= { width: win.width, height: win.height };
    for (let attempt = 0; attempt < 3; attempt++) {
      const vp = await this.call('viewportSize');
      const current = await api.windows.get(this.windowId);
      const dw = bp.width - vp.width;
      const dh = bp.height - vp.height;
      if (Math.abs(dw) <= 1 && Math.abs(dh) <= 1) break;
      // Some browsers don't report the window size; the viewport is then the best base.
      const width = Math.round(Math.max(MIN_WINDOW, Math.min(vp.screenWidth, (current.width || vp.width) + dw)));
      const height = Math.round(Math.max(MIN_WINDOW, Math.min(vp.screenHeight, (current.height || vp.height) + dh)));
      try {
        await api.windows.update(this.windowId, { width, height, left: 0, top: 0, state: 'normal' });
      } catch {
        break; // The browser refuses this size; keep what was reached.
      }
      await sleep(300);
    }
    return (await this.call('viewportSize')).width;
  }

  async screenshot(clip: Rect): Promise<Uint8Array> {
    if (this.captureTab) {
      const url = await this.captureTab(this.tabId, { format: 'png', rect: clip, scale: (await this.call('viewportSize')).dpr });
      return dataUrlBytes(url);
    }
    return this.stitch(clip);
  }

  /** Scroll-and-stitch with captureVisibleTab, hiding fixed elements after the first tile. */
  private async stitch(clip: Rect): Promise<Uint8Array> {
    const vp = await this.call('viewportSize');
    const startY = vp.scrollY;
    const dpr = vp.dpr;
    const canvas = new OffscreenCanvas(Math.round(clip.width * dpr), Math.round(clip.height * dpr));
    const ctx = canvas.getContext('2d')!;
    const fixed = await this.call('findFixedElements');
    try {
      for (let y = clip.y, first = true; y < clip.y + clip.height; y += vp.height, first = false) {
        if (!first) await this.call('hideElements', fixed);
        const actual = await this.call('scrollToY', y);
        // Chromium allows two captureVisibleTab calls a second.
        await sleep(Math.max(0, 550 - (Date.now() - this.lastVisibleCapture)));
        this.lastVisibleCapture = Date.now();
        const url = this.safariTarget
          ? await this.safariTarget.snapshot()
          : await api.tabs.captureVisibleTab(this.windowId ?? (await api.tabs.get(this.tabId)).windowId, { format: 'png' });
        if (this.safariTarget) {
          const pageUrl = await this.exec(() => location.href).catch(() => undefined);
          this.safariTarget.checkDocument(pageUrl);
        }
        const bitmap = await createImageBitmap(new Blob([dataUrlBytes(url) as BlobPart]));
        const offset = y - actual; // the page may stop scrolling before y near the bottom
        const rows = Math.min(vp.height - offset, clip.y + clip.height - y);
        ctx.drawImage(bitmap, clip.x * dpr, offset * dpr, clip.width * dpr, rows * dpr, 0, (y - clip.y) * dpr, clip.width * dpr, rows * dpr);
        bitmap.close();
      }
    } finally {
      await this.call('restoreHidden');
      await this.call('scrollToY', startY);
    }
    return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
  }

  /** Readable sheets from the page, cross-origin ones fetched here (needs host permission). */
  async styleSheets(): Promise<StyleSheetText[]> {
    const { texts, unreadable } = await this.call('styleSheetTexts');
    for (const url of unreadable) {
      try {
        const res = await fetch(url, { cache: 'force-cache', credentials: 'omit' });
        if (res.ok) texts.push({ url, text: await res.text() });
      } catch {
        // No permission for that origin or offline; its colours still appear through computed styles.
      }
    }
    this.sheetTexts = texts.map((t) => t.text);
    return texts;
  }

  async resource(url: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    try {
      const res = await fetch(url, { cache: 'force-cache', credentials: 'omit' });
      if (!res.ok) return null;
      return { data: new Uint8Array(await res.arrayBuffer()), mimeType: (res.headers.get('content-type') ?? '').split(';')[0] };
    } catch {
      return null;
    }
  }

  async mhtml(): Promise<string | null> {
    return null;
  }

  async mouseMove(): Promise<void> {
    // No real pointer outside the DevTools Protocol; see hover().
  }

  async hover(selector: string, _box: Rect, on: boolean): Promise<void> {
    await this.call('simulateHover', selector, on, this.sheetTexts);
  }

  async startScreencast(): Promise<void> {}

  async stopScreencast(): Promise<ScreencastFrame[]> {
    return [];
  }

  /** Deep mode: a MAIN-world content script at document_start, registered for this origin, then a reload. */
  async reloadWithHooks(_source: string, timeoutMs: number): Promise<void> {
    const { url } = await this.pageInfo();
    await api.scripting.unregisterContentScripts({ ids: [HOOKS_ID] }).catch(() => {});
    await api.scripting.registerContentScripts([
      { id: HOOKS_ID, matches: [`${new URL(url).origin}/*`], js: [HOOKS_SCRIPT], runAt: 'document_start', world: 'MAIN', persistAcrossSessions: false },
    ]);
    const reload = async () => {
      const loaded = new Promise<void>((resolve) => {
        const listener = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
          if (id === this.tabId && info.status === 'complete') {
            api.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        api.tabs.onUpdated.addListener(listener);
        setTimeout(resolve, timeoutMs);
      });
      await api.tabs.reload(this.tabId);
      await loaded;
    };
    try {
      if (this.safariTarget) {
        await this.safariTarget.reload(reload);
        await this.refreshCaptureDocument(this.safariTarget);
        this.scannedDocumentId = this.captureDocumentId;
      } else await reload();
    } finally {
      await api.scripting.unregisterContentScripts({ ids: [HOOKS_ID] }).catch(() => {});
    }
  }

  async detach(): Promise<void> {
    api.tabs.onRemoved.removeListener(this.onRemoved);
    await this.setViewport(null, 1).catch(() => {});
  }
}

function dataUrlBytes(url: string): Uint8Array {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
