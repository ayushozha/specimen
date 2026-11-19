import { expect, test } from '@playwright/test';
import { CORE_SCRIPT } from './helpers';

// Runs the built core bundle (the same file the extension injects) against the fixture page.
type Core = typeof import('@specimen/core');
declare global {
  interface Window {
    __specimenCore: Core;
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/landing.html');
  await page.addScriptTag({ path: CORE_SCRIPT });
});

test('detects sections in page order with readable names', async ({ page }) => {
  const sections = await page.evaluate(() => window.__specimenCore.detectSections());
  expect(sections.map((s) => s.name)).toEqual(['Header', 'Ship exact designs', 'Features', 'Pricing', 'Footer']);
  expect(sections.map((s) => s.id)).toEqual(['01-header', '02-ship-exact-designs', '03-features', '04-pricing', '05-footer']);
  expect(sections[1].rect).toMatchObject({ y: 64, width: 1440, height: 900 });
  for (const s of sections) expect(await page.locator(s.selector!).count()).toBe(1);
});

test('extracts exact colours, variables, gradients and contrast', async ({ page }) => {
  const palette = await page.evaluate(() => window.__specimenCore.extractPalette());
  const byValue = (v: string) => palette.colors.find((c) => c.values.some((x) => x.startsWith(v)));

  const brand = byValue('oklch(0.62 0.19 255)');
  expect(brand, 'oklch colour kept in its own space').toBeTruthy();
  expect(brand!.space).toBe('oklch');
  expect(brand!.variables).toContain('--brand');
  expect(brand!.properties['background-color']).toBeGreaterThan(0);

  const p3 = byValue('color(display-p3 0.95 0.3 0.1)');
  expect(p3?.space).toBe('p3');
  expect(p3?.variables).toContain('--brand-p3');

  const header = palette.colors.find((c) => c.hex === '#ffffffd9');
  expect(header?.composited, 'translucent colour composited over its background').toBe('#ffffff');

  expect(palette.variables.map((v) => v.name)).toEqual(expect.arrayContaining(['--brand', '--surface', '--ink', '--muted']));
  expect(palette.variables.find((v) => v.name === '--surface')?.value).toBe('#f5f5f4');
  expect(palette.gradients[0].stops).toEqual(['#0f172a', '#312e81']);
  expect(palette.colors.some((c) => c.properties['box-shadow'])).toBe(true);
  expect(palette.colors.some((c) => c.hex === '#047857'), 'colours inside shadow DOM').toBe(true);

  const faint = palette.contrast.find((p) => p.fg === '#c4c4c4');
  expect(faint?.passesAA).toBe(false);
  expect(palette.colors.find((c) => c.roles.includes('accent'))?.hex).toBe(brand!.hex);
});

test('detects the tech stack with evidence and versions', async ({ page }) => {
  const stack = await page.evaluate(() => {
    const core = window.__specimenCore;
    const { paths, probes } = core.globalPaths();
    return core.detectStack(core.probeGlobals(paths, probes), ['--tw-ring-offset-width']);
  });
  const gsap = stack.find((s) => s.name === 'GSAP');
  expect(gsap).toMatchObject({ version: '3.12.5', confidence: 'high', category: 'animation' });
  expect(stack.find((s) => s.name === 'Next.js')?.confidence).toBe('high');
  expect(stack.find((s) => s.name === 'Tailwind CSS')?.confidence).toBe('medium');
  expect(stack.find((s) => s.name === 'Webflow')).toBeUndefined();
});

test('probeGlobals stays self-contained when stringified', async ({ page }) => {
  const result = await page.evaluate(() => {
    const src = window.__specimenCore.probeGlobals.toString();
    return new Function(`return (${src})(['gsap.version'], [])`)();
  });
  expect(result).toEqual({ 'gsap.version': '3.12.5' });
});

test('serialises a section into standalone HTML', async ({ page, browser }) => {
  const { html, resources } = await page.evaluate(() => window.__specimenCore.serializeElement('#features'));
  expect(html).toContain('<template shadowrootmode="open">');
  expect(html).not.toContain('<script');
  expect(resources).toContain('http://localhost:4321/hero.svg');

  // The standalone page renders at the same size as the original section.
  const original = await page.locator('#features').boundingBox();
  const copy = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await copy.setContent(html, { waitUntil: 'load' });
  const box = await copy.locator('body > section').boundingBox();
  expect(Math.abs(box!.height - original!.height)).toBeLessThan(2);
  expect(await copy.locator('fixture-badge').evaluate((el) => el.shadowRoot?.querySelector('span')?.textContent)).toBe('New');
  await copy.close();
});

test('rejects cookie banners and finds fixed elements', async ({ page }) => {
  const fixed = await page.evaluate(() => window.__specimenCore.findFixedElements());
  expect(fixed).toEqual(expect.arrayContaining(['#__next > header', '#cookie-consent']));
  expect(await page.evaluate(() => window.__specimenCore.rejectCookieBanner())).toBe('Reject all');
  expect(await page.evaluate(() => (window as unknown as { __consent: string }).__consent)).toBe('rejected');
});

test('measures text on gradients against the gradient, and picks a readable muted text colour', async ({ page }) => {
  const palette = await page.evaluate(() => window.__specimenCore.extractPalette());
  const onGradient = palette.contrast.find((p) => p.fg === '#f8fafc');
  expect(onGradient).toMatchObject({ approximate: true, passesAA: true });
  expect(palette.contrast.some((p) => p.fg === '#f8fafc' && p.bg === '#ffffff')).toBe(false);
  expect(palette.colors.find((c) => c.roles.includes('text-muted'))?.hex).toBe('#6b7280');
});

test.describe('hostile page', () => {
  test('saved section HTML never runs page scripts or keeps typed values', async ({ page, browser }) => {
    await page.goto('/hostile.html');
    await page.addScriptTag({ path: CORE_SCRIPT });
    const css = await (await fetch('http://localhost:4321/hostile.css')).text();
    const { html } = await page.evaluate(
      (text) => window.__specimenCore.serializeElement('#evil', [{ url: 'http://localhost:4321/hostile.css', text }]),
      css,
    );
    expect(html).toContain('Content-Security-Policy');
    expect(html).not.toMatch(/java\s*script:|srcdoc|<script/i);
    expect(html).not.toContain('user-typed@example.com');
    expect(html).not.toContain('typed private note');
    expect(html).not.toContain('SECRET-CSRF-TOKEN');

    // Load it the way a user would open the file, and try every injected path.
    const copy = await browser.newPage();
    await copy.setContent(html);
    await copy.locator('a').first().click().catch(() => {});
    await copy.locator('#tablink').click().catch(() => {});
    await copy.waitForTimeout(300);
    const ran = await copy.evaluate(() =>
      ['pwnedLang', 'pwnedCss', 'pwnedFont', 'pwnedHref', 'pwnedSvg', 'pwnedSrcdoc', 'pwnedTab', 'pwnedSvgTab'].filter((k) => k in window),
    );
    expect(ran).toEqual([]);
    // The hostile CSS string still renders as text: escaping changed the markup, not the design.
    expect(await copy.evaluate(() => getComputedStyle(document.querySelector('section')!, '::before').content)).toContain('</style>');
    await copy.close();
  });

  test('SVG kept for design exports has no script links, even split by tabs or newlines', async ({ page }) => {
    await page.goto('/hostile.html');
    await page.addScriptTag({ path: CORE_SCRIPT });
    const tree = await page.evaluate(() => window.__specimenCore.layoutTree('#evil'));
    const svgs: string[] = [];
    const walk = (n: { svg: string | null; children: unknown[] }) => (n.svg && svgs.push(n.svg), n.children.forEach((c) => walk(c as typeof n)));
    walk(tree.root);
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) expect(svg.replace(/[\u0000-\u0020]/g, '')).not.toMatch(/javascript:|<script/i);
  });
});

test('the text role is readable on the page background, even when a dark nav has more light text', async ({ page }) => {
  await page.setContent(`<body style="margin:0;background:#fff;color:#1d1d1f;font:16px sans-serif">
    <nav style="background:#000;color:#f5f5f7;height:200px">${'<a style="color:#f5f5f7">Link</a> '.repeat(30)}</nav>
    <main style="height:2000px"><p>Body copy</p><p>More body copy</p></main></body>`);
  await page.addScriptTag({ path: CORE_SCRIPT });
  const palette = await page.evaluate(() => window.__specimenCore.extractPalette());
  expect(palette.colors.find((c) => c.roles.includes('text'))?.hex).toBe('#1d1d1f');
});
