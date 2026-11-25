// Films two pages side by side with identical inputs, frame by frame: the live site and a page rebuilt
// from its capture. Scroll: the same scroll position on both each frame. Hover: the pointer moves onto
// the same selector on both, then every animation it started is paused and set to the same time.
// Usage: REPO=<repo> node record-pair.mjs <urlA> <urlB> <out> scroll <from> <to> <frames>
//        REPO=<repo> node record-pair.mjs <urlA> <urlB> <out> hover <selector> <ms> <frames>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.env.REPO, 'package.json'));
const { chromium } = require('@playwright/test');
const [urlA, urlB, out, mode, a1, a2, nFrames] = process.argv.slice(2);
mkdirSync(join(out, 'a'), { recursive: true });
mkdirSync(join(out, 'b'), { recursive: true });
const browser = await chromium.launch({ channel: 'chromium' });
const opts = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const pages = [];
for (const url of [urlA, urlB]) {
  const p = await (await browser.newContext(opts)).newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 90_000 });
  await p.waitForTimeout(2500);
  pages.push(p);
}
// CLICK=<text>: click that text on the first page before filming (to show the same tab as the rebuild).
if (process.env.CLICK) {
  await pages[0].getByText(process.env.CLICK, { exact: true }).first().click({ timeout: 10_000 }).catch(() => console.log('no', process.env.CLICK));
  await pages[0].mouse.move(2, 2);
  await pages[0].waitForTimeout(800);
}
const frame = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const shot = (i) => Promise.all(pages.map((p, k) => p.screenshot({ path: join(out, k ? 'b' : 'a', `${String(i).padStart(4, '0')}.png`) })));
const n = Number(nFrames);
if (mode === 'scroll') {
  // Walk down to the start first, so reveals on the way play as they would for a reader.
  for (let y = 0; y <= Number(a1); y += 60) for (const p of pages) await p.evaluate((y) => window.scrollTo(0, y), y);
  await pages[0].waitForTimeout(1500);
  for (let i = 0; i < n; i++) {
    const y = Math.round(Number(a1) + ((Number(a2) - Number(a1)) * i) / (n - 1));
    for (const p of pages) await p.evaluate((y) => window.scrollTo(0, y), y);
    for (const p of pages) await frame(p);
    await pages[0].waitForTimeout(60);
    await shot(i);
  }
} else {
  const sel = a1;
  const ms = Number(a2);
  for (const p of pages) {
    await p.locator(sel).first().scrollIntoViewIfNeeded();
    await p.evaluate(() => window.scrollBy(0, 0));
  }
  const ys = await Promise.all(pages.map((p) => p.evaluate(() => window.scrollY)));
  const y = Math.max(...ys);
  for (const p of pages) await p.evaluate((y) => window.scrollTo(0, y), y);
  await pages[0].waitForTimeout(800);
  await shot(0);
  for (const p of pages) {
    const box = await p.locator(sel).first().boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.evaluate((sel) => {
      window.__anims = document.querySelector(sel).getAnimations({ subtree: true });
      for (const a of window.__anims) { a.pause(); a.currentTime = 0; }
    }, sel);
  }
  for (let i = 1; i < n; i++) {
    const t = (ms * i) / (n - 1);
    for (const p of pages) await p.evaluate((t) => { for (const a of window.__anims) a.currentTime = t; }, t);
    for (const p of pages) await frame(p);
    await shot(i);
  }
}
await browser.close();
console.log('ok', mode, n);
