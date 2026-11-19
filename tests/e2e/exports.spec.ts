import { expect, test } from '@playwright/test';
import { readPsd, type Layer } from 'ag-psd';
import { strFromU8 } from 'fflate';
import { join, posix } from 'node:path';
import { captureBundle } from './helpers';

const LOTTIE_PLAYER = join(import.meta.dirname, '../../node_modules/lottie-web/build/player/lottie.min.js');
let files: Record<string, Uint8Array>;
const json = (path: string) => JSON.parse(strFromU8(files[path]));
const dataUrl = (bytes: Uint8Array, type: string) => `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  test.setTimeout(180_000);
  files = await captureBundle('http://localhost:4321/landing.html');
});

test('writes every export', () => {
  for (const path of ['exports/figma.json', 'exports/palette.ase', 'exports/tokens.json', 'exports/tailwind.theme.js', 'exports/after-effects/specimen.jsx']) {
    expect(files[path], path).toBeTruthy();
  }
  for (const id of ['01-header', '02-ship-exact-designs', '03-features', '04-pricing', '05-footer']) {
    expect(files[`exports/svg/${id}.svg`], `${id} svg`).toBeTruthy();
    expect(files[`exports/psd/${id}.psd`], `${id} psd`).toBeTruthy();
  }
  expect(json('manifest.json').errors).toEqual([]);
});

test('SVG export looks like the screenshot', async ({ page }) => {
  // Inline the bundled images the way a design tool would resolve them.
  let svg = strFromU8(files['exports/svg/03-features.svg']);
  svg = svg.replace(/href="\.\.\/\.\.\/(assets\/[^"]+)"/g, (_m, p: string) => `href="${dataUrl(files[p], p.endsWith('.svg') ? 'image/svg+xml' : 'image/png')}"`);
  const shot = dataUrl(files['sections/03-features/desktop.png'], 'image/png');
  const svgUrl = dataUrl(new TextEncoder().encode(svg), 'image/svg+xml');
  const similarity = await page.evaluate(
    async ([a, b]) => {
      const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => Object.assign(new Image(), { onload() { res(this as HTMLImageElement); }, onerror: rej, src }));
      const [img, ref] = await Promise.all([load(a), load(b)]);
      const draw = (i: HTMLImageElement) => {
        const c = new OffscreenCanvas(ref.width, ref.height);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(i, 0, 0, ref.width, ref.height);
        return ctx.getImageData(0, 0, ref.width, ref.height).data;
      };
      const x = draw(img);
      const y = draw(ref);
      let same = 0;
      for (let i = 0; i < x.length; i += 4) if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) < 32) same++;
      return same / (x.length / 4);
    },
    [svgUrl, shot],
  );
  expect(similarity, 'share of pixels matching the real screenshot').toBeGreaterThan(0.97);
});

test('Photoshop file has groups, background layers and editable text', () => {
  const psd = readPsd(files['exports/psd/03-features.psd'], { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true });
  expect(psd.width).toBe(1440);
  const all: Layer[] = [];
  const walk = (ls: Layer[] = []) => ls.forEach((l) => (all.push(l), walk(l.children)));
  walk(psd.children);
  expect(all[0]).toMatchObject({ name: 'Reference (screenshot)', hidden: true });
  expect(all.some((l) => l.name === 'Background')).toBe(true);
  const fast = all.find((l) => l.text?.text === 'Fast');
  expect(fast?.text?.style?.fontSize).toBeGreaterThan(10);
});

test('Lottie export plays in lottie-web with the captured keyframes', async ({ page }) => {
  const name = Object.keys(files).find((k) => /^exports\/lottie\/02-ship-exact-designs-pulse/.test(k))!;
  expect(name).toBeTruthy();
  const animationData = json(name);
  await page.setContent('<div id="c" style="width:200px;height:200px"></div>');
  await page.addScriptTag({ path: LOTTIE_PLAYER });
  const result = await page.evaluate((data) => {
    const anim = (window as any).lottie.loadAnimation({ container: document.getElementById('c'), renderer: 'svg', loop: false, autoplay: false, animationData: data });
    anim.goToAndStop(Math.round(anim.totalFrames / 2), true);
    const g = document.querySelector('#c svg g g') as SVGGElement;
    return { frames: anim.totalFrames, transform: g.getAttribute('transform'), opacity: g.getAttribute('opacity') };
  }, animationData);
  expect(result.frames).toBe(36);
  // Half way through the 1.2s pulse: scale 1.4 and opacity 0.4, as in the site's @keyframes.
  const [sx, , , sy] = result.transform!.match(/matrix\(([^)]+)\)/)![1].split(',').map(Number);
  expect(sx).toBeCloseTo(1.4, 4);
  expect(sy).toBeCloseTo(1.4, 4);
  expect(Number(result.opacity)).toBeCloseTo(0.4, 2);
});

test('After Effects script rebuilds the animations', () => {
  const script = strFromU8(files['exports/after-effects/specimen.jsx']);
  expect(() => new Function(script)).not.toThrow();
  expect(script).toContain('addComp("Ship exact designs", 1440, 900');
  expect(script).toContain('property("Scale").setValueAtTime(0.600, [140.00, 140.00])');
  expect(script).toContain('loopOut');
  for (const m of script.matchAll(/load\("([^"]+)"\)/g)) {
    const path = posix.normalize(`exports/after-effects/${m[1]}`);
    expect(files[path], path).toBeTruthy();
  }
});

test('Figma document and palette files', () => {
  const doc = json('exports/figma.json');
  expect(doc.sections).toHaveLength(5);
  const hero = doc.sections.find((s: { id: string }) => s.id === '02-ship-exact-designs');
  expect(hero.variants[0]).toMatchObject({ name: 'Get started', durationMs: 200, easing: [0, 0, 0.58, 1] });
  expect(files[hero.variants[0].hoverImage]).toBeTruthy();
  expect(Object.values(doc.assets).every((p) => files[p as string])).toBe(true);
  const title = JSON.stringify(hero.tree).includes('"content":"Ship exact designs"');
  expect(title).toBe(true);

  expect(json('exports/tokens.json').color.brand).toEqual({ $type: 'color', $value: '#1d84f5' });
  expect(strFromU8(files['exports/palette.ase'].slice(0, 4))).toBe('ASEF');
});

test('replicates the scroll reveal and the replica moves like the original', async ({ page }) => {
  const replication = json('exports/code/replication.json');
  const pricing = replication.find((s: { section: string }) => s.section === '04-pricing').replicas;
  const reveal = pricing.find((r: { trigger: string }) => r.trigger === 'scroll-reveal');
  expect(reveal).toMatchObject({ selector: '#pricing > h2', source: 'fitted' });
  expect(reveal.score).toBeGreaterThan(0.95);
  // The site uses `transition: opacity 600ms ease-out`.
  expect(Math.abs(reveal.spec.durationMs - 600)).toBeLessThan(40);

  // Play the generated CSS in a fresh page and record it, the same way Specimen recorded the site.
  const css = strFromU8(files['exports/code/04-pricing.css']);
  await page.setContent(`<style>${css}</style><section id="pricing"><h2>Pricing</h2></section>`);
  const replay = await page.evaluate(async () => {
    const el = document.querySelector('#pricing > h2')!;
    const out: [number, number][] = [];
    await new Promise((r) => requestAnimationFrame(r));
    const start = performance.now();
    el.classList.add('is-visible');
    await new Promise<void>((done) => {
      const tick = () => {
        const t = performance.now() - start;
        out.push([t, Number(getComputedStyle(el).opacity)]);
        if (t < 800) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    return out;
  });
  // Compare with the CSS ease-out curve the site actually used.
  const easeOut = (u: number) => {
    let lo = 0, hi = 1, t = u;
    for (let i = 0; i < 40; i++) { const x = 3 * 0 * t * (1 - t) ** 2 + 3 * 0.58 * t * t * (1 - t) + t ** 3; if (x < u) lo = t; else hi = t; t = (lo + hi) / 2; }
    return 3 * 0 * t * (1 - t) ** 2 + 3 * 1 * t * t * (1 - t) + t ** 3;
  };
  const err = Math.sqrt(replay.reduce((s, [t, v]) => s + (v - easeOut(Math.min(1, t / 600))) ** 2, 0) / replay.length);
  expect(err, 'RMS difference from the original curve').toBeLessThan(0.05);
});

test('writes code for every target and a preview page', async ({ page }) => {
  for (const ext of ['css', 'gsap.js', 'motion.tsx', 'preview.html']) expect(files[`exports/code/02-ship-exact-designs.${ext}`], ext).toBeTruthy();
  const hero = strFromU8(files['exports/code/02-ship-exact-designs.css']);
  expect(hero).toContain('@keyframes fx-02-ship-exact-designs-1 {');
  expect(hero).toMatch(/:hover \{\n(  .+;\n)*  transform: matrix\(1, 0, 0, 1, 0, -2\);/);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const html = strFromU8(files['exports/code/02-ship-exact-designs.preview.html']).replace(/src="\.\.\/(crops\/[^"]+)"/g, (_m, p: string) => `src="${dataUrl(files[`exports/${p}`], 'image/png')}"`);
  await page.setContent(html);
  expect(await page.locator('figure').count()).toBeGreaterThanOrEqual(2);
  expect(await page.locator('img').evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(errors).toEqual([]);
});
