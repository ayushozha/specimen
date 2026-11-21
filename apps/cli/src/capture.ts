import { chromium, type BrowserContext } from '@playwright/test';

/** The extension API inside the service worker (evaluated there, not in Node). */
declare const chrome: { tabs: { query(q: object): Promise<{ id?: number }[]> }; windows: { create(o: object): Promise<unknown> } };

export interface CaptureOptions {
  /** Built Chromium extension folder (apps/extension/.output/chrome-mv3). */
  extensionDir: string;
  /** Run a visible browser instead of headless. */
  headed?: boolean;
  timeoutMs?: number;
  /** Record motion too (load and scroll video, animations, hover, menus). Default on: the CLI is an explicit request. */
  motion?: boolean;
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
  let panel: Awaited<ReturnType<BrowserContext['newPage']>> | null = null;
  try {
    await site.goto(url, { waitUntil: 'load', timeout: options.timeoutMs ?? 60_000 });
    // The panel gets its own window so the site stays the visible tab of its window, as beside a real
    // side panel: background tabs don't paint, so canvas and WebGL effects wouldn't be recorded.
    const opened = context.waitForEvent('page');
    await context.serviceWorkers()[0].evaluate(
      ([url]) => chrome.windows.create({ url, type: 'popup', width: 420, height: 900 }),
      [`chrome-extension://${extensionId}/sidepanel.html?tabId=${tabId}`] as const,
    );
    const page = await opened;
    panel = page;
    await page.waitForLoadState();
    const button = page.locator('.primary');
    // The panel waits for a person to start scanning; so does the CLI, one step at a time.
    await page.getByRole('button', { name: 'Scan page' }).click({ timeout: options.timeoutMs ?? 60_000 });
    await page.waitForFunction(() => {
      const b = document.querySelector('.primary');
      return (b && !b.hasAttribute('disabled')) || document.querySelector('.notice.error');
    }, null, { timeout: options.timeoutMs ?? 120_000 });
    const failed = await page.locator('.notice.error').textContent().catch(() => null);
    if (failed) throw new Error(failed);
    if (options.motion ?? true) await page.getByLabel(/Record motion/).check();

    const result = page.evaluate(
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
      const step = await page.locator('.progress .small').textContent().catch(() => null);
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
    await panel?.close();
    await site.close();
  }
}
