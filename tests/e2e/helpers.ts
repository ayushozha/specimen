import { chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { join } from 'node:path';

export const EXTENSION_DIR = join(import.meta.dirname, '../../apps/extension/.output/chrome-mv3-e2e');
export const CORE_SCRIPT = join(EXTENSION_DIR, 'core.js');

/** Chromium with the built extension loaded (headless new mode supports extensions). */
export async function launchWithExtension(): Promise<{ context: BrowserContext; extensionId: string }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  return { context, extensionId: new URL(worker.url()).host };
}

/** Scans the page from the panel (nothing runs before this) and turns on motion when asked. */
export async function scan(panel: Page, options: { motion?: boolean } = {}): Promise<void> {
  await panel.getByRole('button', { name: 'Scan page' }).click();
  await expect(panel.getByRole('button', { name: 'Capture everything' })).toBeEnabled({ timeout: 60_000 });
  if (options.motion) await panel.getByLabel(/Record motion/).check();
}

/**
 * Opens the site in a tab and the panel in its own window (as beside a real side panel), so the site
 * stays visible: background tabs don't paint, and canvas effects need painting.
 */
export async function openSiteAndPanel(context: BrowserContext, extensionId: string, url: string, viewport = { width: 1200, height: 800 }): Promise<{ site: Page; panel: Page }> {
  const site = context.pages()[0] ?? (await context.newPage());
  await site.setViewportSize(viewport);
  await site.goto(url);
  const worker = context.serviceWorkers()[0];
  const [tab] = await worker.evaluate(() => chrome.tabs.query({}));
  const opened = context.waitForEvent('page');
  await worker.evaluate(([u]) => chrome.windows.create({ url: u, type: 'popup', width: 420, height: 900 }), [`chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}`] as const);
  const panel = await opened;
  await panel.waitForLoadState();
  return { site, panel };
}

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Opens the panel for `url`, runs Capture everything and returns the bundle's files. */
export async function captureBundle(url: string): Promise<Record<string, Uint8Array>> {
  const { context, extensionId } = await launchWithExtension();
  try {
    await context.pages()[0].goto(url);
    const [tab] = await context.serviceWorkers()[0].evaluate(() => chrome.tabs.query({}));
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}`);
    await scan(panel, { motion: true });
    const zip = panel.evaluate(
      () =>
        new Promise<string>((resolve) =>
          window.addEventListener('specimen:done', (e) => {
            const z = (e as CustomEvent<{ zip: Uint8Array }>).detail.zip;
            let bin = '';
            for (let i = 0; i < z.length; i += 0x8000) bin += String.fromCharCode(...z.subarray(i, i + 0x8000));
            resolve(btoa(bin));
          }),
        ),
    );
    await panel.locator('.primary').click();
    const { unzipSync } = await import('fflate');
    return unzipSync(Buffer.from(await zip, 'base64'));
  } finally {
    await context.close();
  }
}
