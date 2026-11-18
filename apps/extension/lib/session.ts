import { ChromiumAdapter } from './chromium';
import type { CaptureResult } from './capture';

/** Keeps one debugger connection per side panel, for the tab being captured. */
export class Session {
  private adapter: ChromiumAdapter | null = null;

  async connect(tabId: number, onDetach: (reason: string) => void): Promise<ChromiumAdapter> {
    if (this.adapter?.isAttached && this.adapter.tabId === tabId) return this.adapter;
    await this.disconnect();
    this.adapter = await ChromiumAdapter.attach(tabId);
    this.adapter.onDetach(onDetach);
    return this.adapter;
  }

  async disconnect(): Promise<void> {
    const a = this.adapter;
    this.adapter = null;
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

export async function downloadBundle(result: CaptureResult): Promise<void> {
  const url = URL.createObjectURL(new Blob([result.zip as BlobPart], { type: 'application/zip' }));
  try {
    await chrome.downloads.download({ url, filename: result.filename, saveAs: false });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
