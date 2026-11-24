// Records a Specimen effects preview page (the rebuilt CSS replaying each effect) as PNG frames at 2x.
// Usage: REPO=<repo> CFT=<chrome for testing> node shoot-preview.mjs <preview.html> <out-dir> [seconds]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = createRequire(join(process.env.REPO, 'package.json'))('@playwright/test');
const [file, out, secs = '6'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: false, executablePath: process.env.CFT });
const page = await browser.newPage({ viewport: { width: 960, height: 760 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(file).href);
await page.waitForTimeout(800);
const n = Math.round(Number(secs) * 30);
// Deterministic: pause every CSS animation and set its time for each frame.
await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), (i * 1000) / 30);
  await page.screenshot({ path: join(out, `${String(i).padStart(4, '0')}.png`) });
}
await browser.close();
console.log('frames', n);
