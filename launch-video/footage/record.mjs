// Records the real Specimen panel and the page it captures as numbered PNG frames, for the launch film.
// Usage: node launch-video/footage/record.mjs <out-dir> <pick|whole> [url]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out, mode = 'whole', url = 'https://specimen.ayushojha.com/'] = process.argv.slice(2);
const EXT = join(import.meta.dirname, '../../apps/extension/.output/chrome-mv3-e2e');
const t0 = Date.now();
const log = { mode, url, cursor: [], marks: [] };
const mark = (name) => { log.marks.push({ t: Date.now() - t0, name }); console.log(Date.now() - t0, name); };
// A crisp 2x still of the panel (the screencast runs at 1x).
const still = (name) => panel.screenshot({ path: join(out, 'stills', `${name}.png`), timeout: 5000 }).catch(() => {});

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium', deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const id = new URL(worker.url()).host;
const site = context.pages()[0] ?? (await context.newPage());
await site.setViewportSize({ width: 1440, height: 900 });
await site.goto(url, { waitUntil: 'networkidle' });
const [tab] = await worker.evaluate(() => chrome.tabs.query({}));
const opened = context.waitForEvent('page');
await worker.evaluate(([u]) => chrome.windows.create({ url: u, type: 'popup', width: 420, height: 900 }), [`chrome-extension://${id}/sidepanel.html?tabId=${tab.id}`]);
const panel = await opened;
await panel.waitForLoadState();
await panel.setViewportSize({ width: 420, height: 900 });

let recording = true;
// CDP screencast: a frame on every repaint, stamped with its time, at full device pixels.
async function rec(page, name) {
  const dir = join(out, name); mkdirSync(dir, { recursive: true });
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    writeFileSync(join(dir, `${String(Date.now() - t0).padStart(7, '0')}.jpg`), Buffer.from(data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const vp = page.viewportSize();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: false });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 2880, maxHeight: 1800, everyNthFrame: 1 });
  while (recording) await new Promise((r) => setTimeout(r, 200));
  await cdp.send('Page.stopScreencast').catch(() => {});
}
async function move(x, y, steps = 25) {
  const from = log.cursor.at(-1) ?? { x: 720, y: 450 };
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const p = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
    await site.mouse.move(p.x, p.y); log.cursor.push({ t: Date.now() - t0, ...p });
    await new Promise((r) => setTimeout(r, 16));
  }
}
const done = panel.evaluate(() => new Promise((resolve) => window.addEventListener('specimen:done', (e) => {
  const d = e.detail; const files = {};
  for (const [k, v] of Object.entries(d.files)) {
    if (!(v instanceof Uint8Array) && typeof v !== 'string') continue;
    if (typeof v === 'string') { files[k] = btoa(unescape(encodeURIComponent(v))); continue; }
    let bin = ''; for (let i = 0; i < v.length; i += 0x8000) bin += String.fromCharCode(...v.subarray(i, i + 0x8000));
    files[k] = btoa(bin);
  }
  resolve(files);
})));

const loops = [rec(panel, 'panel'), rec(site, 'site')];
await panel.waitForTimeout(2500);
mkdirSync(join(out, 'stills'), { recursive: true });
mark('choose'); await still('choose');
if (mode === 'pick') {
  await panel.getByRole('radio', { name: /One element/ }).check(); mark('one-element');
  await panel.waitForTimeout(900);
  await panel.getByRole('button', { name: 'Pick an element to capture' }).click(); mark('pick');
  await panel.getByRole('button', { name: /Click an element on the page/ }).waitFor({ timeout: 60_000 }); mark('picking');
  // Where the pointer goes on the page: headline, buttons, then the hero image (css px).
  const stops = JSON.parse(process.env.STOPS ?? '[[360,320],[240,560],[1040,400]]');
  await move(...stops[0]); await site.waitForTimeout(900);
  await move(...stops[1]); await site.waitForTimeout(700);
  await move(...stops[2], 35); await site.waitForTimeout(1100);
  await site.keyboard.press('ArrowUp'); mark('parent'); await site.waitForTimeout(900);
  await site.keyboard.press('ArrowDown'); mark('child'); await site.waitForTimeout(700);
  await site.mouse.down(); await site.mouse.up(); mark('click');
} else {
  await panel.getByRole('button', { name: 'Capture whole page' }).click(); mark('capture');
  (async () => { for (let i = 0; recording && i < 400; i++) { await still(`capturing-${String(Date.now() - t0).padStart(7, '0')}`); await new Promise((r) => setTimeout(r, 1500)); } })();
}
const files = await done; mark('done');
await panel.waitForTimeout(1500);
for (const dest of ['Framer', 'Code agent', 'Figma']) {
  await panel.getByRole('button', { name: dest, exact: true }).click(); mark(`export-${dest}`);
  await panel.waitForTimeout(1400); await still(`export-${dest}`);
}
await panel.getByRole('button', { name: 'Code agent' }).click();
await panel.getByRole('button', { name: 'Copy everything' }).click(); mark('copy-everything');
await panel.getByRole('button', { name: 'Copied' }).waitFor({ timeout: 30_000 });
const md = await panel.evaluate(() => navigator.clipboard.readText()); await still('copied');
await panel.waitForTimeout(1200);
for (const t of ['Colours', 'Motion', 'Stack']) {
  await panel.getByRole('tab', { name: 'Inspect' }).click();
  await panel.getByRole('tab', { name: new RegExp(`^${t}`) }).click(); mark(`inspect-${t}`);
  await panel.waitForTimeout(1400); await still(`inspect-${t}`);
  await panel.screenshot({ path: join(out, `inspect-${t.toLowerCase()}-full.png`), fullPage: true });
}
recording = false; await Promise.all(loops);
writeFileSync(join(out, 'DESIGN-everything.md'), md);
for (const [k, b64] of Object.entries(files)) { const p = join(out, 'bundle', k); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, Buffer.from(b64, 'base64')); }
writeFileSync(join(out, 'log.json'), JSON.stringify(log, null, 1));
await context.close();
