import { chromium, type BrowserContext } from '@playwright/test';

/** The extension API inside the service worker (evaluated there, not in Node). */
declare const chrome: { tabs: { query(q: object): Promise<{ id?: number }[]> } };

export interface CaptureOptions {
  /** Built Chromium extension folder (apps/extension/.output/chrome-mv3). */
  extensionDir: string;
  /** Run a visible browser instead of headless. */
  headed?: boolean;
  timeoutMs?: number;
  onProgress?: (url: string, step: string) => void;
}

/** Chromium with Specimen loaded. Headless mode supports extensions in Playwright's Chromium. */
export async function launch(options: CaptureOptions): Promise<{ context: BrowserContext; extensionId: string }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: !options.headed,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${options.extensionDir}`, `--load-extension=${options.extensionDir}`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  return { context, extensionId: new URL(worker.url()).host };
}

/**
 * Captures one URL with the real extension: opens it, opens Specimen's panel for that tab, runs
 * Capture everything and returns the zip. Exactly what a person gets from the toolbar button.
 */
export async function captureUrl(context: BrowserContext, extensionId: string, url: string, options: CaptureOptions): Promise<{ filename: string; zip: Uint8Array }> {
  const site = await context.newPage();
  // The site's tab is the newest one (tab ids only grow); read it before the panel opens its own tab.
  const tabId = await context.serviceWorkers()[0].evaluate(async () => Math.max(...(await chrome.tabs.query({})).map((t: { id?: number }) => t.id!)));
  const panel = await context.newPage();
  try {
    await site.goto(url, { waitUntil: 'load', timeout: options.timeoutMs ?? 60_000 });
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html?tabId=${tabId}`);
    const button = panel.locator('.primary');
    await panel.waitForFunction(() => {
      const b = document.querySelector('.primary');
      return (b && !b.hasAttribute('disabled')) || document.querySelector('.notice.error');
    }, null, { timeout: options.timeoutMs ?? 120_000 });
    const failed = await panel.locator('.notice.error').textContent().catch(() => null);
    if (failed) throw new Error(failed);

    const result = panel.evaluate(
      () =>
        new Promise<{ filename: string; zip: string }>((resolve, reject) => {
          window.addEventListener('specimen:done', (e) => {
            const { filename, zip } = (e as CustomEvent<{ filename: string; zip: Uint8Array }>).detail;
            let bin = '';
            for (let i = 0; i < zip.length; i += 0x8000) bin += String.fromCharCode(...zip.subarray(i, i + 0x8000));
            resolve({ filename, zip: btoa(bin) });
          });
          const watch = new MutationObserver(() => {
            const err = document.querySelector('.notice.error');
            if (err) reject(new Error(err.textContent ?? 'Capture failed'));
          });
          watch.observe(document.body, { subtree: true, childList: true });
        }),
    );
    const ticker = setInterval(async () => {
      const step = await panel.locator('.progress .small').textContent().catch(() => null);
      if (step) options.onProgress?.(url, step);
    }, 1000);
    try {
      await button.click();
      const { filename, zip } = await result;
      return { filename, zip: new Uint8Array(Buffer.from(zip, 'base64')) };
    } finally {
      clearInterval(ticker);
    }
  } finally {
    await panel.close();
    await site.close();
  }
}
