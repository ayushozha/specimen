import { expect, test } from '@playwright/test';
import { strFromU8 } from 'fflate';
import { launchWithExtension, openSiteAndPanel, pngSize, scan } from './helpers';


test('a canvas the pointer paints into is found, timed and recorded with the cursor drawn in', async () => {
  test.setTimeout(180_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    const { panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/ink.html');
    await scan(panel, { motion: true });
    const done = panel.evaluate(
      () =>
        new Promise<Record<string, number[]>>((resolve) =>
          window.addEventListener('specimen:done', (e) => {
            const f = (e as CustomEvent<{ files: Record<string, Uint8Array> }>).detail.files;
            resolve(Object.fromEntries(Object.keys(f).filter((k) => k.includes('pointer')).map((k) => [k, Array.from(f[k])])));
          }),
        ),
    );
    await panel.getByRole('listitem').filter({ hasText: 'Ink follows the pointer' }).getByRole('button', { name: 'Capture' }).click();
    const files = Object.fromEntries(Object.entries(await done).map(([k, v]) => [k, new Uint8Array(v)]));
    const id = Object.keys(files).find((k) => /^sections\/[^/]+\/pointer\.json$/.test(k))!.split('/')[1];
    const effect = JSON.parse(strFromU8(files[`sections/${id}/pointer.json`]));
    expect(effect.kind).toBe('canvas');
    expect(effect.changed).toBeGreaterThan(0.02);
    expect(effect.idleChange).toBeLessThan(0.01);
    // The trail fades by itself in well under the 2s recorded after the stroke.
    expect(effect.fadeMs).toBeGreaterThan(0);
    expect(effect.fadeMs).toBeLessThan(2000);
    expect(effect.path.length).toBeGreaterThan(20);
    expect(Object.keys(files).some((k) => /sections\/.+\/pointer\.(mp4|webm)$/.test(k))).toBe(true);
    expect(pngSize(files[`sections/${id}/pointer-strip.png`]).width).toBeGreaterThan(1000);

    // The Motion block shows it, and the agent spec describes it.
    await expect(panel.getByText(/The pointer paints into a canvas; the trail fades in about \d+ms/)).toBeVisible();
    await panel.setViewportSize({ width: 420, height: 1600 });
    await panel.screenshot({ path: 'test-results/panel-pointer-effect.png', fullPage: true });
    await panel.getByRole('button', { name: 'Copy prompt' }).click();
  } finally {
    await context.close();
  }
});

test('every screen of a tall section gets a stroke, with a visible cursor that is gone afterwards', async () => {
  test.setTimeout(240_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    const { site, panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/tall.html');
    // The cursor Specimen draws while it sweeps, seen in the page during the capture.
    const sawCursor = site.waitForSelector('[data-specimen-cursor]', { state: 'attached', timeout: 200_000 }).then(() => true);
    const done = panel.evaluate(
      () =>
        new Promise<string[]>((resolve) =>
          window.addEventListener('specimen:done', (e) => resolve(Object.keys((e as CustomEvent<{ files: Record<string, unknown> }>).detail.files))),
        ),
    );
    await panel.getByRole('button', { name: 'Capture everything' }).click();
    const files = await done;
    expect(await sawCursor).toBe(true);
    expect(await site.locator('[data-specimen-cursor]').count(), 'the sweep cursor is removed').toBe(0);
    const story = files.find((f) => /^sections\/[^/]+\/pointer\.json$/.test(f));
    expect(story, 'the ink on the second screen is found').toMatch(/ink-lives-further-down/);
    // The Motion block plays the clip in place.
    await expect(panel.getByLabel(/^Pointer sweep over /)).toBeVisible();
  } finally {
    await context.close();
  }
});

test('Record interaction records the real pointer with the cursor drawn in', async () => {
  test.setTimeout(120_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { site, panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/ink.html');
    // Available before any scan: it needs nothing but the tab.
    const recorded = panel.evaluate(
      () =>
        new Promise<{ samples: number; video: boolean; strip: boolean; durationMs: number }>((resolve) =>
          window.addEventListener('specimen:recorded', (e) => {
            const r = (e as CustomEvent<{ samples: unknown[]; video: unknown; strip: unknown; durationMs: number }>).detail;
            resolve({ samples: r.samples.length, video: !!r.video, strip: !!r.strip, durationMs: r.durationMs });
          }),
        ),
    );
    await panel.getByRole('button', { name: /Record interaction/ }).click();
    await expect(panel.getByText(/Recording \d+s · move your mouse over the page/)).toBeVisible();
    for (let i = 0; i <= 40; i++) {
      await site.mouse.move(200 + i * 18, 300 + Math.sin(i / 4) * 120);
      await site.waitForTimeout(20);
    }
    await panel.getByRole('button', { name: 'Stop' }).click();
    const r = await recorded;
    expect(r.samples).toBeGreaterThan(30);
    expect(r.video).toBe(true);
    expect(r.strip).toBe(true);
    const card = panel.locator('.capture').first();
    await expect(card.getByText(/^Interaction · localhost/)).toBeVisible();
    await expect(card.locator('video')).toBeVisible();
    await card.getByRole('button', { name: 'Copy prompt' }).click();
    const md = await panel.evaluate(() => navigator.clipboard.readText());
    expect(md).toContain('# Interaction on Ink fixture');
    expect(md).toContain('![Frame by frame, cursor drawn in](interaction-strip.png)');
    await panel.setViewportSize({ width: 420, height: 1000 });
    await panel.screenshot({ path: 'test-results/panel-recording.png', fullPage: true });
  } finally {
    await context.close();
  }
});

test('Cancel stops a capture and puts the page back', async () => {
  test.setTimeout(120_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    const { site, panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/landing.html');
    await scan(panel, { motion: true });
    await panel.getByRole('button', { name: 'Capture everything' }).click();
    const cancel = panel.getByRole('button', { name: 'Cancel' });
    await expect(cancel).toBeVisible();
    await panel.waitForTimeout(1500);
    await panel.setViewportSize({ width: 420, height: 420 });
    await panel.screenshot({ path: 'test-results/panel-cancel-button.png' });
    await cancel.click();
    await expect(panel.getByText('Capture cancelled. The page is back as it was.')).toBeVisible({ timeout: 60_000 });
    await expect(panel.locator('.capture')).toHaveCount(0);
    await panel.screenshot({ path: 'test-results/panel-cancelled.png' });
    await expect(panel.getByRole('button', { name: 'Capture everything' })).toBeEnabled();
    expect(await site.evaluate(() => [document.querySelectorAll('[data-specimen-hidden]').length, innerWidth])).toEqual([0, 1200]);
  } finally {
    await context.close();
  }
});

