// Inspects real-site bundles: health, content and export fidelity.
import { chromium } from '@playwright/test';
import { readPsd } from 'ag-psd';
import { strFromU8, unzipSync } from 'fflate';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage();
const dataUrl = (b, t) => `data:${t};base64,${Buffer.from(b).toString('base64')}`;
const similarity = (svgUrl, pngUrl) => page.evaluate(async ([a, b]) => {
  const load = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error('load')); i.src = src; });
  const [img, ref] = await Promise.all([load(a), load(b)]);
  const draw = (i) => { const c = new OffscreenCanvas(ref.width, ref.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0, ref.width, ref.height); return x.getImageData(0, 0, ref.width, ref.height).data; };
  const x = draw(img), y = draw(ref); let same = 0;
  for (let i = 0; i < x.length; i += 4) if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) < 32) same++;
  return same / (x.length / 4);
}, [svgUrl, pngUrl]);

for (const f of readdirSync(dir).filter((n) => n.endsWith('.zip')).sort()) {
  const files = unzipSync(new Uint8Array(readFileSync(join(dir, f))));
  const j = (p) => JSON.parse(strFromU8(files[p]));
  const m = j('manifest.json');
  const pal = j('palette.json');
  const stack = j('stack.json');
  console.log(`\n=== ${f}  (${(readFileSync(join(dir, f)).length / 1e6).toFixed(1)} MB, ${Object.keys(files).length} files)`);
  console.log('errors:', m.errors.length ? m.errors.map((e) => `${e.step}: ${e.message.slice(0, 140)}`) : 'none');
  console.log('sections:', m.sections.map((s) => `${s.name}[${s.source}]`).join(' | '));
  console.log('colours:', pal.colors.length, '· variables:', pal.variables.length, '· roles:', pal.colors.filter((c) => c.roles.length).map((c) => `${c.roles}=${c.hex}`).join(' '));
  console.log('stack:', stack.map((s) => `${s.name}${s.version ? ' ' + s.version : ''}(${s.confidence[0]})`).join(', '));
  console.log('motion:', JSON.stringify(m.motion && { a: m.motion.animations, i: m.motion.interactions, s: m.motion.scrollEffects, p: m.motion.pointerEffects, t: m.motion.toggles, gsap: m.motion.libraries?.gsap?.tweens.length ?? 0, lottie: m.motion.libraries?.lottie.length }), '· replicas:', JSON.stringify(m.exports));
  const has = (re) => Object.keys(files).filter((k) => re.test(k)).length;
  console.log('files: videos', has(/\.(mp4|webm)$/), '· states', has(/states\/.*\.png$/), '· svg', has(/^exports\/svg\//), '· psd', has(/^exports\/psd\//), '· lottie', has(/^exports\/lottie\//), '· code', has(/^exports\/code\/.*\.css$/), '· ae', has(/specimen\.jsx$/), '· assets', has(/^assets\//));
  // SVG fidelity per section vs its desktop screenshot (images inlined from the bundle).
  const scores = [];
  for (const s of m.sections) {
    const svgPath = `exports/svg/${s.id}.svg`, png = files[`sections/${s.id}/desktop.png`];
    if (!files[svgPath] || !png) continue;
    let svg = strFromU8(files[svgPath]).replace(/href="\.\.\/\.\.\/(assets\/[^"]+)"/g, (_m, p) => files[p] ? `href="${dataUrl(files[p], p.endsWith('.svg') ? 'image/svg+xml' : 'image/png')}"` : _m);
    try { scores.push(`${s.id.slice(0, 18)} ${(await similarity(dataUrl(new TextEncoder().encode(svg), 'image/svg+xml'), dataUrl(png, 'image/png')) * 100).toFixed(0)}%`); }
    catch { scores.push(`${s.id.slice(0, 18)} SVG-FAILED-TO-LOAD`); }
  }
  console.log('svg vs screenshot:', scores.join(' · '));
  // PSD parses?
  const psds = Object.keys(files).filter((k) => k.startsWith('exports/psd/'));
  let bad = 0; for (const p of psds) { try { readPsd(files[p], { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true }); } catch { bad++; } }
  console.log('psd:', psds.length, 'files,', bad, 'unreadable');
  if (files['exports/after-effects/specimen.jsx']) { try { new Function(strFromU8(files['exports/after-effects/specimen.jsx'])); console.log('ae: parses'); } catch (e) { console.log('ae: SYNTAX ERROR', e.message); } }
}
await browser.close();
