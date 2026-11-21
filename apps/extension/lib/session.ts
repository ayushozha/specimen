import type { PageAdapter } from './adapter';
import { ExtensionAdapter } from './extension-adapter';

/**
 * Which adapter drives the page: the DevTools Protocol on Chromium browsers, standard extension APIs
 * on Firefox and Safari. `?adapter=extension` forces the latter (to test that path in Chromium).
 */
function useDevTools(): boolean {
  // Firefox and Safari builds never include the DevTools adapter.
  if (import.meta.env.FIREFOX || import.meta.env.SAFARI) return false;
  if (new URLSearchParams(location.search).get('adapter') === 'extension') return false;
  return typeof chrome !== 'undefined' && !!chrome.debugger;
}

function browserName(): 'firefox' | 'safari' | 'chromium' {
  if (import.meta.env.FIREFOX) return 'firefox';
  if (import.meta.env.SAFARI) return 'safari';
  return 'chromium';
}

/** Keeps one connection per panel, for the tab being captured. */
export class Session {
  private adapter: PageAdapter | null = null;
  private tabId: number | null = null;
  private attached = false;

  async connect(tabId: number, onDetach: (reason: string) => void): Promise<PageAdapter> {
    if (this.adapter && this.attached && this.tabId === tabId) return this.adapter;
    await this.disconnect();
    // The constant checks let the bundler drop the DevTools adapter from Firefox and Safari builds.
    if (!import.meta.env.FIREFOX && !import.meta.env.SAFARI && useDevTools()) {
      const { ChromiumAdapter } = await import('./chromium');
      this.adapter = await ChromiumAdapter.attach(tabId);
    } else this.adapter = new ExtensionAdapter(tabId, browserName());
    this.tabId = tabId;
    this.attached = true;
    this.adapter.onDetach((reason) => {
      this.attached = false;
      onDetach(reason);
    });
    return this.adapter;
  }

  /**
   * Firefox and Safari read cross-origin stylesheets and assets with host permission, asked for once,
   * from the click that starts a capture. Chromium uses the DevTools Protocol and needs none.
   */
  requestHostAccess(): Promise<boolean> {
    if (useDevTools() || !chrome.permissions) return Promise.resolve(true);
    return chrome.permissions.request({ origins: ['<all_urls>'] }).catch(() => false);
  }

  async disconnect(): Promise<void> {
    const a = this.adapter;
    this.adapter = null;
    this.attached = false;
    await a?.detach();
  }
}

/** Resolves the tab this panel captures: `?tabId=` when given (pop-out windows, tests), else the active tab. */
export async function targetTabId(): Promise<number | null> {
  const param = new URLSearchParams(location.search).get('tabId');
  if (param) return Number(param);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

/**
 * When the panel is its own window (Safari), brings the tab's window forward: Safari sends hover and
 * the first click only to the focused window, so picking on the page needs it in front. Resolves with
 * a function that puts the panel back in front.
 */
export async function focusTabWindow(tabId: number): Promise<() => Promise<void>> {
  const none = async () => {};
  if (!chrome.windows) return none;
  try {
    const [tab, panel] = await Promise.all([chrome.tabs.get(tabId), chrome.windows.getCurrent()]);
    if (tab.windowId === panel.id || panel.id === undefined) return none;
    await chrome.windows.update(tab.windowId, { focused: true });
    return async () => void (await chrome.windows.update(panel.id!, { focused: true }).catch(() => undefined));
  } catch {
    return none;
  }
}

/** Plain-language message for errors users can act on. */
export function explainError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Cannot access|cannot be scripted|chrome:\/\/|chrome-extension:\/\/|Cannot attach/i.test(msg)) {
    return "This page can't be captured. Browsers block extensions on their own pages and the extension stores.";
  }
  if (/Another debugger is already attached/i.test(msg)) {
    return 'DevTools or another extension is debugging this tab. Close it and try again.';
  }
  if (/Detached|not attached/i.test(msg)) return 'The capture was cancelled from the debugging bar.';
  return msg;
}
