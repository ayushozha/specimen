import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { launchWithExtension, pngSize } from './helpers';

// Runs the Firefox/Safari code path (standard extension APIs, no DevTools Protocol) inside Chromium.
test('the Firefox/Safari adapter captures sections, hover and motion without DevTools', async () => {
  test.setTimeout(240_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    const site = context.pages()[0];
    await site.goto('http://localhost:4321/landing.html');
    const [tab] = await context.serviceWorkers()[0].evaluate(() => chrome.tabs.query({}));
    // As in Safari: the panel in its own window, so the site stays the visible tab of its window.
    const opened = context.waitForEvent('page');
    await context.serviceWorkers()[0].evaluate(
      ([id, url]) => chrome.windows.create({ url, type: 'popup', width: 420, height: 800 }),
      [tab.id, `chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}&adapter=extension`] as const,
    );
    const panel = await opened;
    const progress = setInterval(async () => console.log('progress:', await panel.locator('.progress').innerText().catch(() => '-')), 10_000);
    await expect(panel.getByRole('button', { name: 'Capture everything' })).toBeEnabled({ timeout: 60_000 });
    await expect(panel.getByText('5 sections')).toBeVisible();

    const zip = panel.evaluate(
      () =>
        new Promise<string>((resolve) =>
          window.addEventListener('specimen:done', (e) => {
            const z = (e as CustomEvent<{ zip: Uint8Array }>).detail.zip;
            let s = '';
            for (let i = 0; i < z.length; i += 0x8000) s += String.fromCharCode(...z.subarray(i, i + 0x8000));
            resolve(btoa(s));
          }),
        ),
    );
    await panel.getByRole('button', { name: 'Capture everything' }).click();
    const files = unzipSync(Buffer.from(await zip, 'base64'));
    const manifest = JSON.parse(strFromU8(files['manifest.json']));
    console.log('fallback errors:', JSON.stringify(manifest.errors));

    // Screenshots by scroll-and-stitch at the desktop width reached by resizing the window.
    const hero = files['sections/02-ship-exact-designs/desktop.png'];
    expect(hero, 'stitched hero screenshot').toBeTruthy();
    // The desktop width is whatever this screen allows; the bundle records it.
    const desktop = manifest.breakpoints.find((b: { name: string }) => b.name === 'desktop');
    expect(desktop.captured).toBeGreaterThan(700);
    expect(pngSize(hero).width).toBeGreaterThanOrEqual(desktop.captured);
    expect(files['sections/03-features/03-features.html']).toBeTruthy();

    // Hover simulated from the page's own :hover rules, JS hover from simulated pointer events.
    const heroHover = JSON.parse(strFromU8(files['sections/02-ship-exact-designs/interactions.json']));
    expect(heroHover[0].changes).toEqual(expect.arrayContaining([expect.objectContaining({ prop: 'transform', to: 'matrix(1, 0, 0, 1, 0, -2)' })]));
    const cards = JSON.parse(strFromU8(files['sections/03-features/interactions.json']));
    expect(cards[0].sources).toEqual(['js']);

    // Deep mode through a registered MAIN-world content script.
    expect(manifest.motion.hooks.observed).toContain('#pricing > h2');
    expect(manifest.motion.libraries.gsap.tweens).toHaveLength(1);

    // What this path can't do is reported, not silently missing.
    expect(files['page/page.mhtml']).toBeUndefined();
    expect(manifest.browser).toBe('chromium');
    for (const e of manifest.errors) expect(e.message).toMatch(/Captured at \d+px instead of \d+px/);
    clearInterval(progress);
  } finally {
    await context.close();
  }
});
