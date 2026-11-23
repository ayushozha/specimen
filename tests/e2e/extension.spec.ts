import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { launchWithExtension, openSiteAndPanel, pngSize, scan } from './helpers';

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

    // Nothing runs on open: no scrolling, no cookie banner dismissed, until Scan page.
    await expect(panel.getByRole('button', { name: 'Scan page' })).toBeVisible();
    await panel.waitForTimeout(1000);
    expect(await site.evaluate(() => [(window as unknown as { __consent?: string }).__consent ?? null, scrollY])).toEqual([null, 0]);
    await scan(panel, { motion: true });
    const button = panel.getByRole('button', { name: 'Capture everything' });
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
    // The capture shows its outputs under Screenshots and exports; nothing downloads by itself.
    await expect(panel.getByRole('heading', { name: 'Design tools' })).toBeVisible();
    await expect(panel.getByText(/^DESIGN\.md for Claude Code/)).toBeVisible({ timeout: 30_000 });
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
    for (const base of ['page/intro', 'page/scroll-desktop', 'sections/02-ship-exact-designs/pointer', 'sections/02-ship-exact-designs/motion/pulse-', 'sections/02-ship-exact-designs/states/get-started-1--hover']) {
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
    // The sweep crosses every section, but card hover effects are not mistaken for a pointer trail.
    expect(files['sections/03-features/pointer.json'], 'hover cards are not a pointer effect').toBeUndefined();

    // One capture, every part shown as its own block on one page: no tabs.
    await expect(panel.getByRole('tab')).toHaveCount(0);
    for (const block of ['Screenshots and exports', 'Palette', 'Motion', 'Stack', 'Sections']) await expect(panel.getByRole('heading', { name: block, exact: true })).toBeVisible();
    await expect(panel.getByText('Hover and focus effects')).toBeVisible();
    await expect(panel.getByText(/Elements follow the pointer/)).toBeVisible();
    await expect(panel.locator('.clip video')).toHaveCount(2);
    await expect(panel.getByText('The page changed.'), 'our own deep-mode reload is not reported').toHaveCount(0);
    await panel.screenshot({ path: 'test-results/panel-motion.png' });

    // The palette block renders the captured colours.
    await panel.getByRole('button', { name: /^#[0-9a-f]{6}, used/ }).first().click();
    await expect(panel.getByText('Exact values')).toBeVisible();
    await panel.screenshot({ path: 'test-results/panel-palette.png', fullPage: true });
    await expect(panel.getByText('GSAP', { exact: true })).toBeVisible();
    await panel.screenshot({ path: 'test-results/panel-stack.png', fullPage: true });
  } finally {
    await context.close();
  }
});

test('Capture everything scans and captures in one click, with motion on by default', async () => {
  test.setTimeout(240_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    const { panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/landing.html');
    await expect(panel.getByLabel(/Record motion/)).toBeChecked();
    const done = panel.evaluate(
      () =>
        new Promise<string[]>((resolve) =>
          window.addEventListener('specimen:done', (e) => resolve(Object.keys((e as CustomEvent<{ files: Record<string, unknown> }>).detail.files))),
        ),
    );
    // No Scan page first: the one button does both.
    await panel.getByRole('button', { name: 'Capture everything' }).click();
    const files = await done;
    expect(files).toContain('manifest.json');
    expect(files.some((f) => /^sections\/02-ship-exact-designs\/pointer\.(mp4|webm)$/.test(f)), 'the pointer sweep ran without being asked').toBe(true);
    for (const block of ['Screenshots and exports', 'Palette', 'Motion', 'Stack', 'Sections']) await expect(panel.getByRole('heading', { name: block, exact: true })).toBeVisible();
    await panel.setViewportSize({ width: 420, height: 2400 });
    await panel.screenshot({ path: 'test-results/panel-one-capture.png', fullPage: true });
  } finally {
    await context.close();
  }
});

test('Capture a section picks one element and captures only it, with its motion', async () => {
  test.setTimeout(240_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { site, panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/landing.html');
    const done = panel.evaluate(
      () =>
        new Promise<{ sections: string[]; files: string[] }>((resolve) =>
          window.addEventListener('specimen:done', (e) => {
            const r = (e as CustomEvent<{ files: Record<string, unknown>; manifest: { sections: { id: string }[] } }>).detail;
            resolve({ sections: r.manifest.sections.map((s) => s.id), files: Object.keys(r.files) });
          }),
        ),
    );
    // No scan first: the button scans, then waits for a click on the page.
    await panel.getByRole('button', { name: /^Capture a section/ }).click();
    await expect(panel.getByRole('button', { name: /Click a section, header or button/ })).toBeVisible({ timeout: 60_000 });
    await site.locator('a.btn').hover();
    await site.mouse.down();
    await site.mouse.up();
    const r = await done;
    expect(r.sections).toHaveLength(1);
    await expect(panel.locator('.capture-head .name')).toHaveText('Get started');
    const id = r.sections[0];
    expect(r.files.some((f) => f.startsWith(`sections/${id}/states/`) && f.endsWith('--hover.png')), 'the button\'s hover state').toBe(true);
    expect(r.files.some((f) => f.startsWith(`sections/${id}/pointer`)), 'the pointer sweep covers a small element too').toBe(true);
    // Nothing from the rest of the page was probed.
    expect(r.files.filter((f) => /^sections\/[^/]+\/interactions\.json$/.test(f) && !f.startsWith(`sections/${id}/`))).toEqual([]);

    // Copy everything puts one markdown document on the clipboard.
    await panel.getByRole('button', { name: 'Copy everything' }).click();
    const md = await panel.evaluate(() => navigator.clipboard.readText());
    expect(md).toContain('## Stack');
    expect(md).toContain('## Motion');
    await panel.getByRole('button', { name: 'Copy motion' }).click();
    expect(await panel.evaluate(() => navigator.clipboard.readText())).toMatch(/^## Motion/);
    await panel.getByRole('button', { name: 'Copy stack' }).click();
    expect(await panel.evaluate(() => navigator.clipboard.readText())).toMatch(/^## Stack/);
    await panel.getByRole('button', { name: 'Copy CSS' }).click();
    expect(await panel.evaluate(() => navigator.clipboard.readText())).toMatch(/^:root \{/);
    await panel.setViewportSize({ width: 420, height: 900 });
    await panel.evaluate(() => scrollTo(0, 0));
    await panel.screenshot({ path: 'test-results/panel-capture-section.png' });
  } finally {
    await context.close();
  }
});

test('Pick element adds the clicked element as a section, and the button cancels', async () => {
  const { context, extensionId } = await launchWithExtension();
  try {
    const site = context.pages()[0] ?? (await context.newPage());
    await site.setViewportSize({ width: 1200, height: 800 });
    await site.goto('http://localhost:4321/landing.html');
    const [tab] = await context.serviceWorkers()[0].evaluate(() => chrome.tabs.query({}));
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}`);
    await scan(panel);
    await expect(panel.getByText('5 sections')).toBeVisible();

    await panel.getByRole('button', { name: 'Pick element' }).click();
    const picking = panel.getByRole('button', { name: /Click an element/ });
    await expect(picking).toBeEnabled();
    await site.locator('.features .card').nth(1).hover();
    await site.mouse.down();
    await site.mouse.up();
    await expect(panel.getByText('6 sections')).toBeVisible();
    await expect(panel.getByText('Exact', { exact: true })).toBeVisible();

    await panel.getByRole('button', { name: 'Pick element' }).click();
    await picking.click();
    await expect(panel.getByRole('button', { name: 'Pick element' })).toBeVisible();
    await expect(site.locator('#__specimen-overlay')).toBeHidden();
  } finally {
    await context.close();
  }
});

test('a single section capture gives paste-ready copies for design tools and a DESIGN.md for agents', async () => {
  test.setTimeout(120_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const site = context.pages()[0] ?? (await context.newPage());
    await site.setViewportSize({ width: 1200, height: 800 });
    await site.goto('http://localhost:4321/landing.html');
    const [tab] = await context.serviceWorkers()[0].evaluate(() => chrome.tabs.query({}));
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}`);
    await scan(panel);

    // One section, no motion: lands in Captures as its own card.
    await panel.getByRole('listitem').filter({ hasText: 'Features' }).getByRole('button', { name: 'Capture' }).click();
    const card = panel.locator('.capture').first();
    await expect(card.locator('.capture-head .name')).toHaveText('Features', { timeout: 60_000 });
    await expect(card.getByText(/no motion/)).toBeVisible();
    await expect(card.getByText(/^DESIGN\.md for Claude Code/)).toBeVisible({ timeout: 30_000 });
    await panel.screenshot({ path: 'test-results/panel-captures.png', fullPage: true });

    const clipboardText = () => panel.evaluate(() => navigator.clipboard.readText());
    const clipboardTypes = () => panel.evaluate(async () => (await navigator.clipboard.read()).flatMap((i) => i.types));

    // Figma, Sketch, Penpot, Framer, Illustrator: SVG markup with everything inside.
    await card.getByRole('listitem').filter({ hasText: 'Figma' }).getByRole('button', { name: 'Copy' }).click();
    await expect(card.getByRole('status')).toHaveText('Copied. Paste in Figma with ⌘V');
    const svg = await clipboardText();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('href="data:image/');
    expect(svg).not.toMatch(/(href=|url\()["']?\.\.\//);
    await card.getByRole('button', { name: 'Copy SVG' }).click();
    await expect(card.getByRole('status')).toHaveText('Copied SVG. Paste with ⌘V');
    expect(await clipboardText()).toBe(svg);

    // Paper: HTML with its images inline.
    await card.getByRole('listitem').filter({ hasText: 'Paper' }).getByRole('button', { name: 'Copy' }).click();
    await expect(card.getByRole('status')).toHaveText('Copied. Paste in Paper with ⌘V');
    expect(await clipboardTypes()).toEqual(expect.arrayContaining(['text/html', 'text/plain']));
    const html = await panel.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item.getType('text/html')).text();
    });
    expect(html).toContain('Fast');
    expect(html).not.toContain('../../assets/');

    // Everything else: a PNG.
    await card.getByRole('button', { name: 'Copy image' }).click();
    await expect(card.getByRole('status')).toHaveText('Image copied. Paste with ⌘V');
    expect(await clipboardTypes()).toContain('image/png');

    // Figma plugin input: figma.json and the images it uses.
    const [plugin] = await Promise.all([panel.waitForEvent('download'), card.getByRole('button', { name: 'Plugin file' }).click()]);
    expect(plugin.suggestedFilename()).toBe('localhost-landing-03-features.figma.zip');
    const pluginFiles = unzipSync(new Uint8Array(await (await import('node:fs/promises')).readFile((await plugin.path())!)));
    expect(JSON.parse(strFromU8(pluginFiles['exports/figma.json'])).sections.map((s: { id: string }) => s.id)).toEqual(['03-features']);
    expect(pluginFiles['sections/03-features/desktop.png']).toBeTruthy();

    // Agent spec: a folder where the browser can write one, else the same folder as a zip.
    await panel.evaluate(() => delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker);
    const [spec] = await Promise.all([panel.waitForEvent('download'), card.getByRole('button', { name: 'Save to folder' }).click()]);
    const specFiles = unzipSync(new Uint8Array(await (await import('node:fs/promises')).readFile((await spec.path())!)));
    expect(Object.keys(specFiles).sort()).toEqual(
      expect.arrayContaining(['design-spec/DESIGN.md', 'design-spec/tokens.json', 'design-spec/screenshots/03-features.png', 'design-spec/highlights/03-features.png']),
    );
    const md = strFromU8(specFiles['design-spec/DESIGN.md']);
    expect(md).toContain('### 1. Features');
    expect(md).toContain('![Features](screenshots/03-features.png)');
    expect(md).toContain('1. **Card (×3, same size) “Fast”** at 32,80');
    expect(md).toMatch(/\*\*Heading “(Fast|Exact)”\*\*/);
    expect(md).toContain('| accent | `#1d84f5` | `oklch(0.62 0.19 255)` | `--brand` |');
    expect(md).toContain('Motion was not recorded for this capture.');
    expect(pngSize(specFiles['design-spec/highlights/03-features.png'])).toEqual(pngSize(specFiles['design-spec/screenshots/03-features.png']));
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
    await scan(panel);
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
