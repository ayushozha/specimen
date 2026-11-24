// Records Specimen capturing motion on a page with a pointer-driven canvas effect (an ink trail):
// the hero captured with Include motion (the pointer sweep paints the ink), then Record interaction.
// The site's name is hidden while filming: its logo link on the page, and any text matching HIDE in the panel.
// Usage: HIDE=<regex> node launch-video/footage/record-motion.mjs <out-dir> <url> [section-name-regex]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out, url, sectionRe = 'value function'] = process.argv.slice(2);
const HIDE = new RegExp(process.env.HIDE ?? '$^', 'gi');
const EXT = join(import.meta.dirname, '../../apps/extension/.output/chrome-mv3-e2e');
const t0 = Date.now();
const log = { url, cursor: [], marks: [] };
const mark = (name) => { log.marks.push({ t: Date.now() - t0, name }); console.log(Date.now() - t0, name); };
mkdirSync(join(out, 'stills'), { recursive: true });

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium', deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
// Hide the site's logo link (it carries the name) on every load, including Specimen's reload for motion.
await context.addInitScript(() => {
  if (location.protocol.startsWith('http')) {
    const css = 'a[aria-label$=" home"], a[aria-label$=" home"] * { visibility: hidden !important; }';
    const add = () => document.head && !document.getElementById('hide-name') && document.head.append(Object.assign(document.createElement('style'), { id: 'hide-name', textContent: css }));
    add(); document.addEventListener('DOMContentLoaded', add);
  }
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const id = new URL(worker.url()).host;
const site = context.pages()[0] ?? (await context.newPage());
await site.setViewportSize({ width: 1440, height: 900 });
await site.goto(url, { waitUntil: 'load', timeout: 60_000 });
await site.waitForTimeout(3000);
const [tab] = await worker.evaluate(() => chrome.tabs.query({}));
const opened = context.waitForEvent('page');
await worker.evaluate(([u]) => chrome.windows.create({ url: u, type: 'popup', width: 420, height: 900 }), [`chrome-extension://${id}/sidepanel.html?tabId=${tab.id}`]);
const panel = await opened;
await panel.waitForLoadState();
await panel.setViewportSize({ width: 420, height: 900 });
// Blank the site's name wherever the panel prints it (header host, capture cards).
await panel.evaluate((src) => {
  const re = new RegExp(src, 'gi');
  const scrub = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (re.test(w.currentNode.data)) { re.lastIndex = 0; w.currentNode.data = w.currentNode.data.replace(re, '').replace(/^\s*·\s*/, ''); }
  };
  scrub(document.body);
  new MutationObserver((ms) => ms.forEach((m) => { if (m.type === 'characterData') scrub(m.target.parentNode ?? document.body); m.addedNodes.forEach((n) => n.nodeType === 3 ? scrub(n.parentNode) : n.nodeType === 1 && scrub(n)); })).observe(document.body, { subtree: true, childList: true, characterData: true });
}, HIDE.source);

let recording = true;
async function rec(page, name) {
  const dir = join(out, name); mkdirSync(dir, { recursive: true });
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    writeFileSync(join(dir, `${String(Date.now() - t0).padStart(7, '0')}.jpg`), Buffer.from(data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 2880, maxHeight: 1800, everyNthFrame: 1 });
  while (recording) await new Promise((r) => setTimeout(r, 200));
  await cdp.send('Page.stopScreencast').catch(() => {});
}
const still = (name, opts = {}) => panel.screenshot({ path: join(out, 'stills', `${name}.png`), timeout: 8000, ...opts }).catch(() => {});
async function move(x, y, steps = 25, pause = 16) {
  const from = log.cursor.at(-1) ?? { x: 720, y: 450 };
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const p = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
    await site.mouse.move(p.x, p.y); log.cursor.push({ t: Date.now() - t0, ...p });
    await new Promise((r) => setTimeout(r, pause));
  }
}
const toB64 = (v) => { if (typeof v === 'string') return btoa(unescape(encodeURIComponent(v))); let s = ''; for (let i = 0; i < v.length; i += 0x8000) s += String.fromCharCode(...v.subarray(i, i + 0x8000)); return btoa(s); };
const done = panel.evaluate((toB64Src) => {
  const toB64 = new Function(`return (${toB64Src})`)();
  return new Promise((resolve) => window.addEventListener('specimen:done', (e) => {
    const files = {};
    for (const [k, v] of Object.entries(e.detail.files)) if (v instanceof Uint8Array || typeof v === 'string') files[k] = toB64(v);
    resolve(files);
  }));
}, toB64.toString());

const loops = [rec(panel, 'panel'), rec(site, 'site')];
await panel.waitForTimeout(2500);
mark('choose'); await still('choose');

// 1. Scan, keep only the hero, capture it with motion: the pointer sweep paints the ink.
await panel.getByRole('radio', { name: /Some sections/ }).check(); mark('some-sections');
await panel.getByRole('button', { name: 'Scan page' }).click(); mark('scan');
await panel.getByRole('listitem').first().waitFor({ timeout: 60_000 });
await panel.waitForTimeout(1200);
const names = await panel.getByRole('listitem').allInnerTexts();
console.log('sections', JSON.stringify(names.map((n) => n.split('\n')[0])));
await still('scanned');
const hero = panel.getByRole('listitem').filter({ hasText: new RegExp(sectionRe, 'i') }).first();
await hero.getByRole('button', { name: 'Capture' }).click(); mark('capture-hero');
const files = await done; mark('done');
for (const [k, b64] of Object.entries(files)) { const p = join(out, 'bundle', k); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, Buffer.from(b64, 'base64')); }
await panel.waitForTimeout(1500); await still('captured');

// 2. Inspect > Motion: the pointer effect, its clip with the cursor drawn in, timings.
await panel.getByRole('tab', { name: 'Inspect' }).click();
await panel.getByRole('tab', { name: /^Motion/ }).click(); mark('inspect-motion');
await panel.waitForTimeout(2500);
await still('inspect-motion'); await still('inspect-motion-full', { fullPage: true });
await panel.getByRole('tab', { name: 'Export' }).click();

// 3. Exports: Framer component (shader runs live), Code agent (DESIGN.md with shader code).
for (const dest of ['Figma', 'Framer', 'Code agent']) {
  await panel.getByRole('button', { name: dest, exact: true }).click(); mark(`export-${dest}`);
  await panel.waitForTimeout(1400); await still(`export-${dest.replace(' ', '-').toLowerCase()}`);
}
await panel.getByRole('button', { name: 'Copy everything' }).click(); mark('copy-everything');
await panel.getByRole('button', { name: 'Copied' }).waitFor({ timeout: 30_000 }).catch(() => {});
writeFileSync(join(out, 'DESIGN-everything.md'), await panel.evaluate(() => navigator.clipboard.readText()));
await panel.getByRole('button', { name: 'Framer', exact: true }).click();
const comp = panel.getByRole('button', { name: 'Copy component' });
if (await comp.count()) { await comp.click(); await panel.waitForTimeout(1500); writeFileSync(join(out, 'Framer-component.tsx'), await panel.evaluate(() => navigator.clipboard.readText())); mark('framer-component'); }

// 4. Record interaction: a person's own stroke over the hero, recorded with the cursor drawn in.
const recorded = panel.evaluate((toB64Src) => {
  const toB64 = new Function(`return (${toB64Src})`)();
  return new Promise((resolve) => window.addEventListener('specimen:recorded', (e) => {
    const r = e.detail; resolve({ samples: r.samples.length, durationMs: r.durationMs, video: r.video ? { ext: r.video.ext, data: toB64(r.video.data) } : null, strip: r.strip ? toB64(r.strip) : null });
  }));
}, toB64.toString());
// Record interaction lives under Inspect > Motion ("Missed an effect?").
await panel.getByRole('tab', { name: 'Inspect' }).click();
await panel.getByRole('tab', { name: /^Motion/ }).click();
const recBtn = panel.getByRole('button', { name: /Record interaction/ });
await recBtn.scrollIntoViewIfNeeded(); await panel.waitForTimeout(700);
await recBtn.click(); mark('record-start');
await panel.waitForTimeout(800);
await move(380, 420, 20);
for (let i = 0; i <= 120; i++) { // a looping signature across the hero
  const a = i / 120 * Math.PI * 4;
  const x = 380 + i * 6.5 + Math.sin(a) * 90, y = 430 + Math.cos(a * 1.5) * 130;
  await site.mouse.move(x, y); log.cursor.push({ t: Date.now() - t0, x, y });
  await new Promise((r) => setTimeout(r, 22));
}
await panel.waitForTimeout(600);
await panel.getByRole('button', { name: 'Stop' }).click(); mark('record-stop');
const r = await recorded; mark('recorded');
await panel.waitForTimeout(2000); await still('recorded'); await still('recorded-full', { fullPage: true });

recording = false; await Promise.all(loops);
if (r.video) writeFileSync(join(out, `interaction.${r.video.ext}`), Buffer.from(r.video.data, 'base64'));
if (r.strip) writeFileSync(join(out, 'interaction-strip.png'), Buffer.from(r.strip, 'base64'));
writeFileSync(join(out, 'log.json'), JSON.stringify({ ...log, interaction: { samples: r.samples, durationMs: r.durationMs } }, null, 1));
await context.close();
