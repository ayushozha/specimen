import { chromium, expect, test } from '@playwright/test';
import { zipSync } from 'fflate';
import { EXACT, verifyMotion } from '../../apps/cli/src/verify';
import { captureBundle } from './helpers';

// Captures a page with known motion (a parallax, an eased scrub, a reveal, an overshoot hover, a
// spring hover and a hover driven by script), then runs each effect's exported code alone and checks it
// moves like the page.
test('exported motion code reproduces the page it was captured from', async () => {
  test.setTimeout(600_000);
  const files = await captureBundle('http://localhost:4321/motion.html');
  const browser = await chromium.launch({ channel: 'chromium' });
  try {
    const { effects } = await verifyMotion(zipSync(files), browser);
    const checked = effects.filter((e) => e.css !== null);
    expect(checked.map((e) => e.trigger).sort()).toEqual(['hover', 'hover', 'hover', 'scroll-linked', 'scroll-linked', 'scroll-reveal', 'scroll-reveal']);
    for (const e of checked) for (const kind of ['css', 'gsap', 'motion'] as const) expect(e[kind], `${e.name} (${e.section}) ${kind}`).toBeLessThanOrEqual(EXACT);
  } finally {
    await browser.close();
  }
});
