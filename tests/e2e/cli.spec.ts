import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { EXTENSION_DIR } from './helpers';

const run = promisify(execFile);
const CLI = join(import.meta.dirname, '../../apps/cli/src/cli.ts');
const specimen = (...args: string[]) => run('node', [CLI, ...args], { timeout: 280_000 });

test.describe.configure({ mode: 'serial', timeout: 300_000 });
let out: string;
let bundles: string[];

test('captures several pages in parallel with the real extension', async () => {
  out = await mkdtemp(join(tmpdir(), 'specimen-cli-'));
  const { stdout } = await specimen('capture', 'http://localhost:4321/landing.html', 'http://localhost:4321/landing-v2.html', '--out', join(out, 'captures'), '--concurrency', '2', '--extension', EXTENSION_DIR);
  expect(stdout.match(/→ .*\.specimen\.zip/g)).toHaveLength(2);
  bundles = (await readdir(join(out, 'captures'))).filter((f) => f.endsWith('.specimen.zip')).sort();
  expect(bundles).toHaveLength(2);
});

test('diffs two captures', async () => {
  // Which file is which: v2 has the extra Testimonials section.
  const [a, b] = bundles.map((f) => join(out, 'captures', f));
  const sizes = await Promise.all([a, b].map((f) => stat(f).then((s) => s.size)));
  const [before, after] = sizes[0] < sizes[1] ? [a, b] : [b, a];
  const { stdout } = await specimen('diff', before, after, '--out', join(out, 'diff'));
  expect(stdout).toMatch(/sections differ/);
  const report = JSON.parse(await readFile(join(out, 'diff', 'diff.json'), 'utf8'));
  expect(report.sections.find((s: { name: string }) => s.name === 'Testimonials')).toMatchObject({ status: 'added' });
  expect(report.colors.variables).toEqual(expect.arrayContaining([{ name: '--brand', before: 'oklch(0.62 0.19 255)', after: 'oklch(0.62 0.19 30)' }]));
  // The hero's button changed colour, so its screenshot differs; the header didn't.
  const hero = report.sections.find((s: { name: string }) => s.name === 'Ship exact designs');
  expect(hero.status).toBe('changed');
  expect(hero.changed).toBeGreaterThan(0);
  expect(hero.changed).toBeLessThan(0.1);
  expect((await stat(join(out, 'diff', hero.diffImage))).size).toBeGreaterThan(100);
  expect(report.sections.find((s: { name: string }) => s.name === 'Header').status).toBe('same');
  expect(await readFile(join(out, 'diff', 'index.html'), 'utf8')).toContain('Testimonials');
});

test('downloads the original videos, including an HLS stream through ffmpeg', async () => {
  const v2 = (await Promise.all(bundles.map(async (f) => ({ f, size: (await stat(join(out, 'captures', f))).size })))).sort((x, y) => y.size - x.size)[0].f;
  const { stdout } = await specimen('media', join(out, 'captures', v2), '--out', join(out, 'media'));
  expect(stdout).toContain('saved');
  const saved = await readdir(join(out, 'media'));
  expect(saved.sort()).toEqual(['video-1.mp4', 'video-2.mp4']);
  for (const f of saved) expect((await stat(join(out, 'media', f))).size).toBeGreaterThan(1000);
});

test('a bundle from someone else cannot write outside the diff folder', async ({ page }) => {
  const { zipSync, strToU8 } = await import('fflate');
  const { diffBundles } = await import('../../apps/cli/src/diff.ts');
  // 1×1 PNGs, black and white.
  const png = (white: boolean) => Buffer.from(white ? 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+p5qgoAAAAABJRU5ErkJggg==' : 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==', 'base64');
  const bundle = (white: boolean) =>
    zipSync({
      'manifest.json': strToU8(JSON.stringify({ url: 'x', title: 'x', capturedAt: 'x', motion: null, sections: [{ id: '../../../escape', name: 'Evil', files: [] }] })),
      '../../../escape/desktop.png': new Uint8Array(png(white)),
      'sections/../../../escape/desktop.png': new Uint8Array(png(white)),
      'palette.json': strToU8(JSON.stringify({ colors: [], variables: [] })),
      'stack.json': strToU8('[]'),
    });
  const { report, images } = await diffBundles(bundle(true), bundle(false), page);
  for (const path of Object.keys(images)) expect(path).toMatch(/^diff\/[a-z0-9-]+\.png$/i);
  expect(report.sections[0].diffImage).toBe('diff/escape.png');
});
