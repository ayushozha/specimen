// Films the real Specimen panel for the launch film: stills of each state, the page being captured,
// and a screencast of the Capturing view. Chrome for Testing, headed, 2x, so clips decode.
// Usage: CFT=<chrome for testing binary> EXT=<built chrome-mv3> node shoot.mjs <out-dir>
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.env.REPO, 'package.json'));
const { chromium } = require('@playwright/test');
const out = process.argv[2];
mkdirSync(out, { recursive: true });
// The site Specimen captures on screen; ONLY_SITE=1 skips the demo-page passes.
const SITE = process.env.SITE ?? 'https://www.apple.com/';
const FIXTURES = 'http://localhost:4321';

async function open(url) {
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
  await site.goto(url, { waitUntil: 'load', timeout: 90_000 });
  await site.waitForTimeout(2500);
  const [tab] = await worker.evaluate(() => chrome.tabs.query({ active: true }));
  const opened = context.waitForEvent('page');
  await worker.evaluate(([u]) => chrome.windows.create({ url: u, type: 'popup', width: 420, height: 900, left: 900, top: 0 }), [`chrome-extension://${id}/sidepanel.html?tabId=${tab.id}`]);
  const panel = await opened;
  await panel.waitForLoadState();
  await panel.setViewportSize({ width: 420, height: 900 });
  await panel.emulateMedia({ colorScheme: 'light' });
  return { context, site, panel };
}
const still = (page, name) => page.screenshot({ path: join(out, `${name}.png`) });
const tall = async (panel, name) => {
  await panel.setViewportSize({ width: 420, height: await panel.evaluate(() => document.documentElement.scrollHeight) });
  await still(panel, name);
  await panel.setViewportSize({ width: 420, height: 900 });
};
const done = (panel) => panel.evaluate(() => new Promise((r) => window.addEventListener('specimen:done', () => r())));
const inspect = async (panel, tab) => {
  await panel.getByRole('tab', { name: 'Inspect' }).click();
  await panel.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
  await panel.waitForTimeout(600);
};
const frames = (panel) =>
  panel.evaluate(() =>
    Promise.all([...document.querySelectorAll('video')].map((v) => new Promise((r) => {
      const go = () => { v.currentTime = Math.min(1.2, (v.duration || 2) / 2); v.addEventListener('seeked', () => r(), { once: true }); };
      v.readyState >= 1 ? go() : v.addEventListener('loadedmetadata', go, { once: true });
      setTimeout(r, 4000);
    }))),
  );
// Screencast: every repaint as a timestamped JPEG, for the Capturing clip.
async function screencast(context, page, dir) {
  mkdirSync(dir, { recursive: true });
  const cdp = await context.newCDPSession(page);
  const t0 = Date.now();
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    writeFileSync(join(dir, `${String(Date.now() - t0).padStart(7, '0')}.jpg`), Buffer.from(data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 840, maxHeight: 1800, everyNthFrame: 1 });
  return () => cdp.send('Page.stopScreencast').catch(() => {});
}

// 1. The brand site: page, sections, the capture itself, colours, motion, exports.
{
  const { context, site, panel } = await open(SITE);
  await still(site, 'site-hero');
  await still(panel, 'panel-choose');
  await panel.getByRole('radio', { name: /Some sections/ }).check();
  await panel.getByRole('button', { name: 'Scan page' }).click();
  await panel.getByRole('button', { name: /^Capture (all \d+|\d+ of \d+)$/ }).waitFor({ timeout: 120_000 });
  await panel.waitForTimeout(500);
  await still(panel, 'panel-sections');
  // The page with one section outlined, as hovering a row does.
  await panel.locator('.list .row').nth(1).hover();
  await site.waitForTimeout(1200);
  await still(site, 'site-section-outlined');
  await panel.mouse.move(5, 5);
  await panel.getByRole('radio', { name: /Whole page/ }).check();
  const d = done(panel);
  const stop = await screencast(context, panel, join(out, 'capturing-frames'));
  await panel.getByRole('button', { name: 'Capture whole page' }).click();
  await panel.locator('.live-frame img').waitFor({ timeout: 300_000 });
  await panel.waitForTimeout(400);
  await still(panel, 'panel-capturing');
  await d;
  await panel.waitForTimeout(800);
  await stop();
  await still(panel, 'panel-export-figma');
  await panel.getByRole('button', { name: 'Framer', exact: true }).click();
  await still(panel, 'panel-export-framer');
  await panel.getByRole('button', { name: 'Code agent' }).click();
  await panel.getByText(/^DESIGN\.md for Claude Code/).waitFor({ timeout: 30_000 });
  await panel.waitForTimeout(500);
  await still(panel, 'panel-export-agent');
  await panel.getByRole('button', { name: 'Copy everything' }).click();
  await panel.getByRole('button', { name: 'Copied' }).waitFor({ timeout: 30_000 });
  writeFileSync(join(out, 'site-everything.md'), await panel.evaluate(() => navigator.clipboard.readText()));
  await inspect(panel, 'Colours');
  await tall(panel, 'panel-colours');
  await panel.getByRole('button', { name: /^#[0-9a-f]{6}, used/ }).nth(2).click();
  await panel.waitForTimeout(400);
  await tall(panel, 'panel-colour-detail');
  await inspect(panel, 'Motion');
  await frames(panel);
  await tall(panel, 'panel-motion');
  await inspect(panel, 'Stack');
  await tall(panel, 'panel-stack');
  await context.close();
}

if (!process.env.ONLY_SITE) {
// 2. A canvas shader that follows the pointer: the Motion tab and the shader code it records.
{
  const { context, panel } = await open(`${FIXTURES}/shader.html`);
  const d = done(panel);
  await panel.getByRole('button', { name: 'Capture whole page' }).click();
  await d;
  await panel.getByRole('button', { name: 'Code agent' }).click();
  await panel.getByRole('button', { name: 'Copy everything' }).click();
  await panel.getByRole('button', { name: 'Copied' }).waitFor({ timeout: 30_000 });
  writeFileSync(join(out, 'shader-everything.md'), await panel.evaluate(() => navigator.clipboard.readText()));
  await inspect(panel, 'Motion');
  await frames(panel);
  await tall(panel, 'panel-shader-motion');
  await context.close();
}

// 3. An ink trail drawn by the pointer.
{
  const { context, site, panel } = await open(`${FIXTURES}/ink.html`);
  const d = done(panel);
  await panel.getByRole('button', { name: 'Capture whole page' }).click();
  await d;
  await inspect(panel, 'Motion');
  await frames(panel);
  await tall(panel, 'panel-ink-motion');
  for (let i = 0; i <= 50; i++) { await site.mouse.move(300 + i * 16, 380 + Math.sin(i / 5) * 150); await site.waitForTimeout(16); }
  await still(site, 'site-ink');
  await context.close();
}
}
console.log('ok');
