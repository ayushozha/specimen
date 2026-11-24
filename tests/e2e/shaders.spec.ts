import { expect, test } from '@playwright/test';
import { strFromU8 } from 'fflate';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchWithExtension, openSiteAndPanel } from './helpers';

test('shaders are captured with their section and uniforms, and reach DESIGN.md and Copy everything', async () => {
  test.setTimeout(240_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { site, panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/shader.html');
    const done = panel.evaluate(
      () =>
        new Promise<Record<string, number[]>>((resolve) =>
          window.addEventListener('specimen:done', (e) => {
            const f = (e as CustomEvent<{ files: Record<string, Uint8Array> }>).detail.files;
            resolve(Object.fromEntries(Object.keys(f).filter((k) => k.startsWith('page/shaders') || k === 'manifest.json').map((k) => [k, Array.from(f[k])])));
          }),
        ),
    );
    await panel.getByRole('button', { name: 'Capture whole page' }).click();
    const raw = await done;
    const files = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, new Uint8Array(v)]));
    const report = JSON.parse(strFromU8(files['page/shaders.json']));
    const glow = report.shaders.filter((s: { api: string }) => s.api === 'webgl');
    expect(glow.map((s: { stage: string }) => s.stage).sort()).toEqual(['fragment', 'vertex']);
    expect(glow.every((s: { section: string }) => /a-glow-follows-the-pointer/.test(s.section))).toBe(true);
    const fragment = glow.find((s: { stage: string }) => s.stage === 'fragment');
    expect(strFromU8(files[fragment.path])).toContain('uniform vec2 uMouse;');
    const gpu = report.shaders.find((s: { api: string }) => s.api === 'webgpu');
    expect(gpu, 'the WebGPU module').toBeTruthy();
    expect(gpu.section).toMatch(/drawn-with-webgpu/);
    expect(strFromU8(files[gpu.path])).toContain('@fragment');
    // uMouse is set every frame, and was moved by the pointer sweep.
    const uniforms = report.uniforms.flatMap((u: { values: { name: string; value: number[]; updates: number }[] }) => u.values);
    const mouse = uniforms.find((u: { name: string }) => u.name === 'uMouse');
    expect(mouse.updates).toBeGreaterThan(30);
    expect(mouse.value[0]).toBeGreaterThan(0);
    // The page's own HTML keeps no tag of ours.
    expect(await site.locator('[data-specimen-gl]').count()).toBe(0);
    expect(JSON.parse(strFromU8(files['manifest.json'])).motion.shaders).toBe(3);

    await panel.getByRole('button', { name: 'Code agent' }).click();
    await panel.getByRole('button', { name: 'Copy everything' }).click();
    await expect(panel.getByRole('button', { name: 'Copied' })).toBeVisible({ timeout: 30_000 });
    const md = await panel.evaluate(() => navigator.clipboard.readText());
    expect(md).toContain("Shaders: the page's own code");
    expect(md).toMatch(/- `uMouse` = `\[-?[\d.]+,-?[\d.]+\]` \(set \d+×\)/);
    expect(md).toContain('## Shader code');
    expect(md).toContain('uniform vec2 uMouse;');
    expect(md).toContain('@fragment fn fs()');
  } finally {
    await context.close();
  }
});

test('the Framer component renders the section and runs its shader live under the pointer', async () => {
  test.setTimeout(300_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/shader.html');
    const done = panel.evaluate(() => new Promise<void>((resolve) => window.addEventListener('specimen:done', () => resolve())));
    await panel.getByRole('button', { name: 'Capture whole page' }).click();
    await done;
    await panel.getByRole('option', { name: /A glow follows the pointer/ }).click();
    await panel.getByRole('button', { name: 'Framer', exact: true }).click();
    await panel.getByRole('button', { name: 'Copy component' }).click();
    await expect.poll(() => panel.evaluate(() => navigator.clipboard.readText())).toContain('addPropertyControls');
    const tsx = await panel.evaluate(() => navigator.clipboard.readText());
    expect(tsx).toContain('uniform vec2 uMouse;');

    // Compile it the way Framer would: React, and a stand-in for the "framer" module.
    const require = createRequire(join(import.meta.dirname, '../../apps/extension/package.json'));
    const esbuild = require('esbuild') as typeof import('esbuild');
    const dir = mkdtempSync(join(tmpdir(), 'specimen-framer-'));
    writeFileSync(join(dir, 'Section.tsx'), tsx);
    writeFileSync(join(dir, 'framer.ts'), 'export const ControlType = { Boolean: "boolean" }; export function addPropertyControls() {}');
    writeFileSync(join(dir, 'main.tsx'), 'import Section from "./Section"; import { createRoot } from "react-dom/client"; createRoot(document.getElementById("root")!).render(<Section style={{ width: 720 }} />);');
    const built = await esbuild.build({
      entryPoints: [join(dir, 'main.tsx')],
      bundle: true,
      write: false,
      jsx: 'automatic',
      alias: { framer: join(dir, 'framer.ts') },
      nodePaths: [join(import.meta.dirname, '../../apps/extension/node_modules')],
      logLevel: 'silent',
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 800, height: 600 });
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: built.outputFiles[0].text });
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('[data-specimen-live]')).toHaveCount(1, { timeout: 15_000 });
    await expect(frame.getByText('A glow follows the pointer')).toBeVisible();

    // The glow follows the pointer: bright pink under it, the plain background far from it.
    const box = (await page.locator('iframe').boundingBox())!;
    await page.mouse.move(box.x + 200, box.y + 250);
    await page.waitForTimeout(300);
    const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: 720, height: 400 } });
    const [under, far] = await page.evaluate(async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(img.width, img.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const at = (x: number, y: number) => Array.from(ctx.getImageData(x * (img.width / 720), y * (img.height / 400), 1, 1).data);
      return [at(200, 250), at(650, 380)];
    }, shot.toString('base64'));
    expect(under[0] - under[1], 'pink under the pointer').toBeGreaterThan(60);
    expect(Math.abs(far[0] - far[2]), 'pale background far from it').toBeLessThan(30);
    await page.screenshot({ path: 'test-results/framer-component-live.png' });
  } finally {
    await context.close();
  }
});
