// Films Specimen capturing a pointer-driven ink effect: the page during the pointer sweep (screencast),
// the Motion tab, and the whole bundle (clips, filmstrips, shader code, rebuilt effect code).
// Usage: REPO=<repo> EXT=<chrome-mv3> CFT=<chrome for testing> SITE=<url> node shoot-motion.mjs <out-dir>
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.env.REPO, 'package.json'));
const { chromium } = require('@playwright/test');
const out = process.argv[2];
mkdirSync(out, { recursive: true });

const context = await chromium.launchPersistentContext('', {
  headless: false,
  executablePath: process.env.CFT,
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${process.env.EXT}`, `--load-extension=${process.env.EXT}`],
});
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const id = new URL(worker.url()).host;
const site = context.pages()[0] ?? (await context.newPage());
await site.setViewportSize({ width: 1440, height: 900 });
await site.goto(process.env.SITE, { waitUntil: 'load', timeout: 90_000 });
await site.waitForTimeout(3000);
const [tab] = await worker.evaluate(() => chrome.tabs.query({ active: true }));
const opened = context.waitForEvent('page');
await worker.evaluate(([u]) => chrome.windows.create({ url: u, type: 'popup', width: 420, height: 900, left: 900, top: 0 }), [`chrome-extension://${id}/sidepanel.html?tabId=${tab.id}`]);
const panel = await opened;
await panel.waitForLoadState();
await panel.setViewportSize({ width: 420, height: 900 });
await panel.emulateMedia({ colorScheme: 'light' });

async function screencast(page, dir) {
  mkdirSync(dir, { recursive: true });
  const cdp = await context.newCDPSession(page);
  const t0 = Date.now();
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    writeFileSync(join(dir, `${String(Date.now() - t0).padStart(7, '0')}.jpg`), Buffer.from(data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 1 });
  return () => cdp.send('Page.stopScreencast').catch(() => {});
}
const still = (page, name) => page.screenshot({ path: join(out, `${name}.png`) });
const tall = async (name) => {
  await panel.setViewportSize({ width: 420, height: await panel.evaluate(() => document.documentElement.scrollHeight) });
  await still(panel, name);
  await panel.setViewportSize({ width: 420, height: 900 });
};

await still(site, 'site-before');
// The bundle's files, as base64, when the capture finishes.
const done = panel.evaluate(() => new Promise((resolve) => window.addEventListener('specimen:done', (e) => {
  const files = {};
  for (const [k, v] of Object.entries(e.detail.files)) {
    let bin = ''; for (let i = 0; i < v.length; i += 0x8000) bin += String.fromCharCode(...v.subarray(i, i + 0x8000));
    files[k] = btoa(bin);
  }
  resolve(files);
})));
const stopSite = await screencast(site, join(out, 'site-frames'));
const stopPanel = await screencast(panel, join(out, 'panel-frames'));
await panel.getByRole('switch', { name: /Include motion/ }).setChecked(true);
await panel.getByRole('button', { name: 'Capture whole page' }).click();
const files = await done;
await stopSite();
await stopPanel();
for (const [k, b64] of Object.entries(files)) {
  const p = join(out, 'bundle', k);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, Buffer.from(b64, 'base64'));
}
await panel.getByRole('button', { name: 'Code agent' }).click();
await panel.getByRole('button', { name: 'Copy everything' }).click();
await panel.getByRole('button', { name: 'Copied' }).waitFor({ timeout: 30_000 });
writeFileSync(join(out, 'everything.md'), await panel.evaluate(() => navigator.clipboard.readText()));
await panel.getByRole('tab', { name: 'Inspect' }).click();
await panel.getByRole('tab', { name: /^Motion/ }).click();
await panel.waitForTimeout(1500);
await panel.evaluate(() => Promise.all([...document.querySelectorAll('video')].map((v) => new Promise((r) => {
  const go = () => { v.currentTime = Math.min(1.5, (v.duration || 3) / 2); v.addEventListener('seeked', () => r(), { once: true }); };
  v.readyState >= 1 ? go() : v.addEventListener('loadedmetadata', go, { once: true });
  setTimeout(r, 4000);
}))));
await tall('panel-motion');
await context.close();
console.log('ok', Object.keys(files).length, 'files');
