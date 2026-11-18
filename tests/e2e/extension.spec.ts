import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { launchWithExtension, pngSize } from './helpers';

test('Capture everything produces a complete bundle', async () => {
  const { context, extensionId } = await launchWithExtension();
  try {
    const site = context.pages()[0] ?? (await context.newPage());
    await site.setViewportSize({ width: 1200, height: 800 });
    await site.goto('http://localhost:4321/landing.html');

    const worker = context.serviceWorkers()[0];
    const [tab] = await worker.evaluate(() => chrome.tabs.query({}));
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}`);

    // The panel analyses the page on open.
    const button = panel.getByRole('button', { name: 'Capture everything' });
    await expect(button).toBeEnabled({ timeout: 60_000 });
    await expect(panel.getByText('5 sections')).toBeVisible();
    await expect(panel.getByText('Cookie banner: clicked “Reject all”.')).toBeVisible();
    await panel.screenshot({ path: 'test-results/panel-sections.png' });

    const zipBase64 = panel.evaluate(
      () =>
        new Promise<string>((resolve) => {
          window.addEventListener('specimen:done', (e) => {
            const zip = (e as CustomEvent<{ zip: Uint8Array }>).detail.zip;
            let bin = '';
            for (let i = 0; i < zip.length; i += 0x8000) bin += String.fromCharCode(...zip.subarray(i, i + 0x8000));
            resolve(btoa(bin));
          });
        }),
    );
    await button.click();
    const files = unzipSync(Buffer.from(await zipBase64, 'base64'));
    await expect(panel.getByText(/^Saved /)).toBeVisible();
    await panel.screenshot({ path: 'test-results/panel-done.png' });

    const manifest = JSON.parse(strFromU8(files['manifest.json']));
    expect(manifest.errors).toEqual([]);
    expect(manifest.sections.map((s: { id: string }) => s.id)).toEqual([
      '01-header',
      '02-ship-exact-designs',
      '03-features',
      '04-pricing',
      '05-footer',
    ]);

    for (const path of ['index.html', 'palette.json', 'stack.json', 'design/palette.css', 'design/media-colors.json', 'page/page.mhtml']) {
      expect(files[path], path).toBeTruthy();
    }
    for (const bp of ['desktop', 'tablet', 'mobile']) {
      expect(files[`page/full-${bp}.png`], `full page at ${bp}`).toBeTruthy();
      expect(files[`sections/03-features/${bp}.png`], `features at ${bp}`).toBeTruthy();
    }

    // Screenshots use the emulated breakpoint widths, and a 100vh hero stays one viewport tall.
    expect(pngSize(files['page/full-desktop.png']).width).toBe(1440);
    expect(pngSize(files['page/full-mobile.png']).width).toBe(390);
    expect(pngSize(files['sections/02-ship-exact-designs/desktop.png'])).toEqual({ width: 1440, height: 900 });

    // Section HTML points at bundled assets instead of the live site.
    const html = strFromU8(files['sections/03-features/03-features.html']);
    const asset = html.match(/src="\.\.\/\.\.\/(assets\/hero-[0-9a-f]{8}\.svg)"/);
    expect(asset, 'image rewritten to the bundled copy').toBeTruthy();
    expect(files[asset![1]]).toBeTruthy();

    const stack = JSON.parse(strFromU8(files['stack.json']));
    expect(stack.map((s: { name: string }) => s.name)).toEqual(expect.arrayContaining(['GSAP', 'Next.js']));

    const media = JSON.parse(strFromU8(files['design/media-colors.json']));
    const hero = media.find((m: { src: string }) => m.src?.endsWith('hero.svg'));
    expect(hero.colors.map((c: { hex: string }) => c.hex)).toEqual(expect.arrayContaining(['#f97316', '#1e3a8a']));

    // The palette tab renders the captured colours.
    await panel.getByRole('tab', { name: 'Palette' }).click();
    await panel.getByRole('button', { name: /^#[0-9a-f]{6}, used/ }).first().click();
    await expect(panel.getByText('Exact values')).toBeVisible();
    await panel.screenshot({ path: 'test-results/panel-palette.png', fullPage: true });
    await panel.getByRole('tab', { name: 'Stack' }).click();
    await expect(panel.getByText('GSAP', { exact: true })).toBeVisible();
    await panel.screenshot({ path: 'test-results/panel-stack.png', fullPage: true });
  } finally {
    await context.close();
  }
});
