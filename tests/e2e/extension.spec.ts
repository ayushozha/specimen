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
    // The 64px header strip is shown whole in the report; taller sections are cropped to fill their card.
    const report = new TextDecoder().decode(files['index.html']);
    expect(report).toContain('<img class="strip" src="sections/01-header/desktop.png"');
    expect(report).toContain('<img src="sections/02-ship-exact-designs/desktop.png"');
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

    // Phase 2: motion and interactions.
    const video = (base: string) => Object.keys(files).find((k) => k.startsWith(base) && /\.(mp4|webm)$/.test(k));
    for (const base of ['page/intro', 'page/scroll-desktop', 'page/pointer', 'sections/02-ship-exact-designs/motion/pulse-', 'sections/02-ship-exact-designs/states/get-started-1--hover']) {
      expect(video(base), base).toBeTruthy();
    }
    const heroHover = JSON.parse(strFromU8(files['sections/02-ship-exact-designs/interactions.json']));
    expect(heroHover[0].changes).toEqual(expect.arrayContaining([{ path: '', prop: 'transform', from: 'none', to: 'matrix(1, 0, 0, 1, 0, -2)' }]));
    expect(heroHover[0].transitions).toEqual(expect.arrayContaining([{ property: 'transform', duration: 200, delay: 0, easing: 'ease-out' }]));
    const cardHover = JSON.parse(strFromU8(files['sections/03-features/interactions.json']));
    expect(cardHover[0]).toMatchObject({ trigger: 'hover', sources: ['js'] });
    const heroMotion = JSON.parse(strFromU8(files['sections/02-ship-exact-designs/motion.json']));
    expect(heroMotion.animations[0]).toMatchObject({ kind: 'css-animation', name: 'pulse', duration: 1200, iterations: 'infinite' });
    expect(heroMotion.tracks.every((t: { kind: string }) => t.kind === 'time'), 'the looping pulse is time-based').toBe(true);
    const pricingMotion = JSON.parse(strFromU8(files['sections/04-pricing/motion.json']));
    expect(pricingMotion.tracks.find((t: { prop: string }) => t.prop === 'opacity')).toMatchObject({ kind: 'scroll-reveal', observed: true });
    expect(files['sections/04-pricing/states/is-there-a-free-tier-1--open.png']).toBeTruthy();
    expect(manifest.motion.libraries.gsap.tweens[0].vars).toEqual({ y: 40, opacity: 0, duration: 1, ease: 'power2.out' });
    expect(JSON.parse(strFromU8(files['page/pointer.json'])).some((t: { prop: string }) => t.prop === 'transform')).toBe(true);

    await panel.getByRole('tab', { name: 'Motion' }).click();
    await expect(panel.getByText('Hover and focus effects')).toBeVisible();
    await expect(panel.getByText('The page changed.'), 'our own deep-mode reload is not reported').toHaveCount(0);
    await panel.screenshot({ path: 'test-results/panel-motion.png' });

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

test('page code never gets user activation from the extension', async () => {
  const { context, extensionId } = await launchWithExtension();
  try {
    const site = context.pages()[0] ?? (await context.newPage());
    await site.goto('http://localhost:4321/hostile.html');
    const [tab] = await context.serviceWorkers()[0].evaluate(() => chrome.tabs.query({}));
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}`);
    await expect(panel.getByRole('button', { name: 'Capture everything' })).toBeEnabled({ timeout: 60_000 });
    // hostile.html records navigator.userActivation.isActive inside a getter the stack probe reads.
    expect(await site.evaluate(() => document.documentElement.dataset.activation)).toBe('false');
  } finally {
    await context.close();
  }
});

test('a hostile page cannot make Specimen fetch addresses the page never loaded', async () => {
  test.setTimeout(180_000);
  const hits: string[] = [];
  const server = (await import('node:http')).createServer((q, r) => (hits.push(q.url ?? ''), r.end('secret'))).listen(4398);
  try {
    const { captureBundle } = await import('./helpers');
    const files = await captureBundle('http://localhost:4321/hostile.html');
    expect(Object.keys(files).some((k) => k.startsWith('sections/'))).toBe(true);
    expect(hits).toEqual([]);
  } finally {
    server.close();
  }
});
