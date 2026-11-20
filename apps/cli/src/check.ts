import type { Browser } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface BundleCheck {
  url: string;
  errors: string[];
  sections: { id: string; name: string; svgMatch: number | null }[];
  stack: string[];
  motion: Record<string, number> | null;
  exports: Record<string, number>;
}

/** Pixels whose channels differ by less than this count as matching (anti-aliasing tolerance). */
const MATCH_TOLERANCE = 32;

/**
 * Checks a bundle the way a person would open it: unzips it, opens each section's SVG export as a
 * file, and measures the share of pixels that match the section's real screenshot.
 */
export async function checkBundle(zip: Uint8Array, browser: Browser): Promise<BundleCheck> {
  const files = unzipSync(zip);
  const json = <T>(p: string): T => JSON.parse(strFromU8(files[p]));
  const manifest = json<{ url: string; errors: { step: string; message: string }[]; sections: { id: string; name: string }[]; motion: Record<string, unknown> | null }>('manifest.json');
  const dir = await mkdtemp(join(tmpdir(), 'specimen-check-'));
  try {
    for (const [path, data] of Object.entries(files)) {
      const target = join(dir, path);
      // Bundles can come from anyone: never write outside the temporary folder.
      if (!target.startsWith(dir + '/')) continue;
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
    }
    // Bundles can come from anyone: their SVGs are rendered with scripts off and no network, and the
    // pixels are compared in a separate, empty page.
    const view = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 1, offline: true });
    await view.route('**/*', (route) => (route.request().url().startsWith('file:') ? route.continue() : route.abort()));
    const svgPage = await view.newPage();
    const page = await browser.newPage();
    const sections: BundleCheck['sections'] = [];
    for (const s of manifest.sections) {
      const svg = `exports/svg/${s.id}.svg`;
      const png = files[`sections/${s.id}/desktop.png`];
      let svgMatch: number | null = null;
      if (files[svg] && png) {
        const size = new DataView(png.buffer, png.byteOffset);
        // Viewport = SVG size and a plain screenshot (full-page screenshots of SVG documents hang).
        await svgPage.setViewportSize({ width: size.getUint32(16), height: Math.min(size.getUint32(20), 8000) });
        await svgPage.goto(`file://${join(dir, svg)}`, { waitUntil: 'load' });
        const shot = await svgPage.screenshot();
        svgMatch = await page.evaluate(
          async ([a, b, tolerance]) => {
            const load = (src: string) =>
              new Promise<HTMLImageElement>((ok, fail) => {
                const img = new Image();
                img.onload = () => ok(img);
                img.onerror = fail;
                img.src = src;
              });
            const [x, y] = await Promise.all([load(a as string), load(b as string)]);
            const px = (img: HTMLImageElement) => {
              const c = new OffscreenCanvas(y.width, y.height);
              const ctx = c.getContext('2d')!;
              ctx.drawImage(img, 0, 0, y.width, y.height);
              return ctx.getImageData(0, 0, y.width, y.height).data;
            };
            const p = px(x);
            const q = px(y);
            let same = 0;
            for (let i = 0; i < p.length; i += 4) if (Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])) < (tolerance as number)) same++;
            return same / (p.length / 4);
          },
          [`data:image/png;base64,${Buffer.from(shot).toString('base64')}`, `data:image/png;base64,${Buffer.from(png).toString('base64')}`, MATCH_TOLERANCE] as const,
        );
      }
      sections.push({ id: s.id, name: s.name, svgMatch });
    }
    await page.close();
    await view.close();
    const count = (re: RegExp) => Object.keys(files).filter((k) => re.test(k)).length;
    const motion = manifest.motion as { animations?: number; interactions?: number; scrollEffects?: number; pointerEffects?: number; toggles?: number } | null;
    return {
      url: manifest.url,
      errors: manifest.errors.map((e) => `${e.step}: ${e.message}`),
      sections,
      stack: files['stack.json'] ? json<{ name: string; version: string | null }[]>('stack.json').map((s) => (s.version ? `${s.name} ${s.version}` : s.name)) : [],
      motion: motion && { animations: motion.animations ?? 0, hover: motion.interactions ?? 0, scroll: motion.scrollEffects ?? 0, pointer: motion.pointerEffects ?? 0, toggles: motion.toggles ?? 0 },
      exports: {
        svg: count(/^exports\/svg\//),
        psd: count(/^exports\/psd\//),
        lottie: count(/^exports\/lottie\//),
        code: count(/^exports\/code\/.*\.css$/),
        afterEffects: count(/specimen\.jsx$/),
        videos: count(/\.(mp4|webm)$/),
      },
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
