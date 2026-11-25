// Films the proof shots: the live site and Specimen's replica, frame by frame, side by side.
// The replica is a blank page with the element's own image where it was and the effect's exported
// CSS on it, nothing else. Both pages get identical inputs per frame:
// - scroll-linked: the same scroll position (step px per frame);
// - hover: the pointer moves in, then every CSS transition on both is paused and set to the same time.
// Usage: REPO=<repo> node record.mjs <unzipped bundle> <replica id> <out dir> [frames]
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.env.REPO, 'package.json'));
const { chromium } = require('@playwright/test');
const [bundle, id, out, nFrames = '90'] = process.argv.slice(2);
const replication = JSON.parse(readFileSync(join(bundle, 'exports/code/replication.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(bundle, 'manifest.json'), 'utf8'));
let entry, section;
for (const s of replication) for (const r of s.replicas) if (r.id === id) [entry, section] = [r, s.section];
if (!entry) throw new Error(`no replica ${id}`);
mkdirSync(join(out, 'site'), { recursive: true });
mkdirSync(join(out, 'replica'), { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const opts = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const site = await (await browser.newContext(opts)).newPage();
await site.goto(manifest.url, { waitUntil: 'load', timeout: 90_000 });
await site.waitForTimeout(3000);
const height = await site.evaluate(() => document.documentElement.scrollHeight);

const r = entry.rect;
const img = readFileSync(join(bundle, `exports/crops/${section}/${entry.id}.png`)).toString('base64');
const replica = await (await browser.newContext(opts)).newPage();
const css = entry.css.split(entry.selector).join('#t');
await replica.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#fffaf5}body{height:${height}px;position:relative}
#t{position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:url(data:image/png;base64,${img}) center/100% 100% no-repeat}${css}</style></head><body><div id="t"></div></body></html>`);

const frame = (p) => p.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
const shot = async (i) => {
  const name = `${String(i).padStart(4, '0')}.png`;
  await site.screenshot({ path: join(out, 'site', name) });
  await replica.screenshot({ path: join(out, 'replica', name) });
};

const n = Number(nFrames);
if (entry.trigger === 'scroll-linked') {
  const R = Object.values(entry.ranges ?? {});
  const from = Number(process.env.FROM ?? Math.min(...R.map((g) => g.start)));
  const to = Number(process.env.TO ?? Math.max(...R.map((g) => g.end)));
  for (let i = 0; i < n; i++) {
    const y = Math.round(from + ((to - from) * i) / (n - 1));
    for (const p of [site, replica]) await p.evaluate((y) => window.scrollTo(0, y), y);
    for (const p of [site, replica]) await frame(p);
    await site.waitForTimeout(80);
    await shot(i);
  }
} else if (entry.trigger === 'hover') {
  const ms = entry.spec.durationMs + entry.spec.delayMs + 200;
  // Bring the element into view at the same scroll on both.
  const y = Math.max(0, r.y - 900 / 2 + r.height / 2);
  for (const p of [site, replica]) await p.evaluate((y) => window.scrollTo(0, y), y);
  await site.waitForTimeout(500);
  await shot(0);
  for (const [p, sel] of [[site, entry.selector], [replica, '#t']]) {
    const box = await p.locator(sel).first().boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Freeze every transition the hover started, at its start.
    await p.evaluate((sel) => {
      const el = document.querySelector(sel);
      window.__anims = el.getAnimations({ subtree: true });
      for (const a of window.__anims) { a.pause(); a.currentTime = 0; }
    }, sel);
  }
  for (let i = 1; i < n; i++) {
    const t = (ms * i) / (n - 1);
    for (const p of [site, replica]) await p.evaluate((t) => { for (const a of window.__anims) a.currentTime = t; }, t);
    for (const p of [site, replica]) await frame(p);
    await shot(i);
  }
}
await browser.close();
console.log('ok', entry.name, entry.trigger, n, 'frames');
