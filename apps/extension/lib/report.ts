import { GENERATED_HTML_CSP, type Palette } from '@specimen/core';
import type { Analysis, Manifest } from './capture';
import tokens from '../assets/tokens.css?raw';

const size = (r: { width: number; height: number }) => `${r.width}×${r.height}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** CSS custom properties: the site's own colour variables, then detected roles. */
export function renderPaletteCss(palette: Palette): string {
  const lines = [':root {', '  /* Colour variables defined by the site, with their exact values */'];
  for (const v of palette.variables) lines.push(`  ${v.name}: ${v.value};`);
  lines.push('', '  /* Detected roles */');
  for (const c of palette.colors) for (const role of c.roles) lines.push(`  --specimen-${role}: ${c.values[0]}; /* ${c.hex} */`);
  lines.push('}', '');
  return lines.join('\n');
}

/** A browsable `index.html` for the bundle. Uses the extension's mono tokens. */
export function renderReport(manifest: Manifest, analysis: Analysis): string {
  const { palette, stack } = analysis;
  const sections = manifest.sections
    .map((s) => {
      const shots = s.files.filter((f) => f.endsWith('.png'));
      const html = s.files.find((f) => f.endsWith('.html'));
      const links = [...shots.map((f) => `<a href="${f}">${esc(f.split('/').pop()!.replace('.png', ''))}</a>`), html ? `<a href="${html}">HTML</a>` : '']
        .filter(Boolean)
        .join(' · ');
      return `<article class="card">${shots[0] ? `<a href="${shots[0]}"><img src="${shots[0]}" alt="${esc(s.name)}" loading="lazy"></a>` : ''}
<div class="row"><strong>${esc(s.name)}</strong><span class="muted">${size(s.rects[manifest.breakpoints[0].name] ?? s.rect)}</span></div>
<div class="muted small">${links}</div></article>`;
    })
    .join('\n');

  const swatches = palette.colors
    .filter((c) => c.alpha === 1 || c.count > 2)
    .map(
      (c) => `<div class="swatch"><span class="chip" style="background:${esc(c.values[0])}"></span>
<div><div class="mono">${c.hex}</div><div class="muted small mono">${esc(c.values[0])}</div>
<div class="muted small">${c.variables.map(esc).join(', ')}${c.roles.length ? ` · ${c.roles.join(', ')}` : ''} · ${c.count}×</div></div></div>`,
    )
    .join('\n');

  const stackRows = stack
    .map((s) => `<tr><td>${esc(s.name)}${s.version ? ` <span class="muted">${esc(s.version)}</span>` : ''}</td><td class="muted">${s.category}</td><td class="muted">${s.confidence}</td><td class="muted small">${s.evidence.map(esc).join('; ')}</td></tr>`)
    .join('\n');

  const failing = palette.contrast.filter((p) => !p.passesAA);
  const fullShots = manifest.files.filter((f) => f.startsWith('page/full-'));
  const errors = manifest.errors.length
    ? `<h2>Steps that failed</h2><ul>${manifest.errors.map((e) => `<li><strong>${esc(e.step)}</strong>: <span class="muted">${esc(e.message)}</span></li>`).join('')}</ul>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${GENERATED_HTML_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(manifest.title || manifest.url)} — Specimen</title>
<style>
${tokens}
body{margin:0;padding:32px 16px;font:14px/1.5 var(--font);background:var(--bg);color:var(--text)}
main{max-width:1100px;margin:0 auto}
h1{font-size:22px;font-weight:600;margin:0 0 4px}
h2{font-size:15px;font-weight:600;margin:40px 0 12px}
a{color:var(--text)}
.muted{color:var(--text-muted)}.small{font-size:12px}.mono{font-family:var(--mono);font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.card{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--bg)}
.card img{width:100%;height:160px;object-fit:cover;object-position:top;border-radius:6px;border:1px solid var(--border);display:block;margin-bottom:8px}
.row{display:flex;justify-content:space-between;gap:8px}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.swatch{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border);border-radius:10px;padding:8px}
.chip{width:40px;height:40px;border-radius:6px;border:1px solid var(--border);flex:none}
table{border-collapse:collapse;width:100%}td{padding:8px 8px 8px 0;border-top:1px solid var(--border);vertical-align:top}
</style>
</head>
<body><main>
<h1>${esc(manifest.title || manifest.url)}</h1>
<div class="muted"><a href="${esc(manifest.url)}">${esc(manifest.url)}</a> · ${new Date(manifest.capturedAt).toLocaleString()} · ${manifest.breakpoints.map((b) => `${b.name} ${b.width}px`).join(', ')}</div>
${fullShots.length ? `<h2>Full page</h2><div class="muted">${fullShots.map((f) => `<a href="${f}">${f.split('/').pop()}</a>`).join(' · ')}${manifest.files.includes('page/page.mhtml') ? ' · <a href="page/page.mhtml">MHTML snapshot</a>' : ''}</div>` : ''}
<h2>Sections (${manifest.sections.length})</h2>
<div class="grid">${sections}</div>
<h2>Colours (${palette.colors.length})</h2>
<div class="swatches">${swatches}</div>
<p class="muted small">Contrast: ${palette.contrast.length} text/background pairs, ${failing.length} below WCAG AA. Full data in <a href="palette.json">palette.json</a> and <a href="design/palette.css">palette.css</a>.</p>
${manifest.motion ? `<h2>Motion</h2>
<p class="muted">${manifest.exports ? `${manifest.exports.replicas} effects rebuilt as CSS, GSAP and Motion code${manifest.exports.fittedScore != null ? ` (fitted ones match ${Math.round(manifest.exports.fittedScore * 100)}%)` : ''}${manifest.exports.leftOut ? `, ${manifest.exports.leftOut} left out for matching below 80%` : ''} · ` : ''}${manifest.motion.animations} animations · ${manifest.motion.interactions} hover and focus effects · ${manifest.motion.scrollEffects} scroll effects · ${manifest.motion.pointerEffects} pointer effects · ${manifest.motion.toggles} menus and accordions</p>
<div class="muted small">${manifest.files.filter((f) => /^page\/(intro|scroll-desktop|pointer)\.(mp4|webm)$/.test(f)).map((f) => `<a href="${f}">${f.split('/').pop()}</a>`).join(' · ')}</div>` : ''}
<h2>Built with</h2>
${stack.length ? `<table>${stackRows}</table>` : '<p class="muted">Nothing detected.</p>'}
${errors}
</main></body></html>
`;
}
