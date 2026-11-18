import { chromium, type BrowserContext } from '@playwright/test';
import { join } from 'node:path';

export const EXTENSION_DIR = join(import.meta.dirname, '../../apps/extension/.output/chrome-mv3');
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

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
