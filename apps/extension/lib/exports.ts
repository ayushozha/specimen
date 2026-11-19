import { GENERATED_HTML_CSP, cubicBezierOf, type LayoutTree, type Palette, type Rect, type Section } from '@specimen/core';
import {
  namedColors,
  isTrustworthy,
  replicaFiles,
  replicate,
  type Replica,
  specFromAnimation,
  specFromInteraction,
  toAfterEffectsScript,
  toAse,
  toDesignTokens,
  toLottie,
  toSvg,
  toTailwindTheme,
  type AeComp,
  type AnimationSpec,
  type FigmaDocument,
  type FigmaSection,
} from '@specimen/exporters';
import { strToU8 } from 'fflate';
import type { StepError } from './capture';
import type { SectionMotion } from './motion';
import { toPsd } from './psd';

export interface ExportContext {
  sections: Section[];
  /** Desktop layout tree, screenshot and rect of each section. */
  trees: Map<string, LayoutTree>;
  shots: Map<string, Uint8Array>;
  rects: Map<string, Rect>;
  /** Each section's @font-face rules with bundled font paths (relative to sections/<id>/). */
  fontCss: Map<string, string>;
  motion: Record<string, SectionMotion> | null;
  palette: Palette;
  /** Page asset URL → bundle path. */
  assets: Map<string, string>;
  scale: number;
  source: { url: string; title: string };
  put(path: string, data: Uint8Array, compress?: boolean): void;
  errors: StepError[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
const json = (v: unknown) => strToU8(JSON.stringify(v, null, 2));

/** Phase 3: Figma, Paper/SVG, Illustrator, Photoshop, After Effects, Lottie and token exports under `exports/`. */
export interface ExportSummary {
  /** Effects written as code. */
  replicas: number;
  /** Fitted effects that matched too poorly to write as code (kept in replication.json with scores). */
  leftOut: number;
  /** Average match of effects fitted from recorded motion (read-from-page effects are exact). */
  fittedScore: number | null;
}

export async function buildExports(ctx: ExportContext): Promise<ExportSummary> {
  const colors = namedColors(ctx.palette);
  ctx.put('exports/palette.ase', toAse(colors));
  ctx.put('exports/tokens.json', json(toDesignTokens(ctx.palette)));
  ctx.put('exports/tailwind.theme.js', strToU8(toTailwindTheme(ctx.palette)));

  const figma: FigmaDocument = { format: 'specimen-figma', version: 1, source: ctx.source, colors, sections: [], assets: {} };
  const aeComps: AeComp[] = [];
  const replication: { section: string; replicas: (Omit<Replica, 'css' | 'gsap' | 'motion'> & { inCode: boolean })[] }[] = [];

  for (const section of ctx.sections) {
    const tree = ctx.trees.get(section.id);
    const shot = ctx.shots.get(section.id);
    const rect = ctx.rects.get(section.id);
    if (!tree || !shot || !rect) continue;
    const attempt = async (what: string, fn: () => Promise<void> | void) => {
      try {
        await fn();
      } catch (err) {
        ctx.errors.push({ step: `${what} for ${section.name}`, message: err instanceof Error ? err.message : String(err) });
      }
    };

    // Images point at the bundled copy when there is one, else at the live URL.
    const href = (prefix: string) => (url: string) => (ctx.assets.has(url) ? prefix + ctx.assets.get(url) : /^https?:/.test(url) ? url : null);
    await attempt('SVG', () =>
      ctx.put(
        `exports/svg/${section.id}.svg`,
        strToU8(toSvg(tree, href('../../'), { screenshot: `../../sections/${section.id}/desktop.png`, fontCss: ctx.fontCss.get(section.id) })),
      ),
    );
    await attempt('Photoshop file', async () => ctx.put(`exports/psd/${section.id}.psd`, await toPsd(tree, shot, ctx.scale)));

    const relative = (r: Rect): Rect => ({ x: r.x - rect.x, y: r.y - rect.y, width: r.width, height: r.height });
    const motion = ctx.motion?.[section.id];
    const figmaSection: FigmaSection = { id: section.id, name: section.name, screenshot: `sections/${section.id}/desktop.png`, tree, variants: [] };
    for (const url of tree.images) if (ctx.assets.has(url)) figma.assets[url] = ctx.assets.get(url)!;

    const animated: { spec: AnimationSpec; rect: Rect }[] = [];
    for (const a of motion?.animations ?? []) if (a.rect) animated.push({ spec: specFromAnimation(a), rect: relative(a.rect) });
    for (const effect of motion?.interactions ?? []) {
      if (effect.trigger !== 'hover') continue;
      const r = relative(effect.rect);
      const hover = effect.files.find((f) => f.endsWith('--hover.png'));
      const longest = effect.transitions.reduce((m, t) => (t.duration + t.delay > m.duration + m.delay ? t : m), effect.transitions[0]);
      if (hover) {
        figmaSection.variants.push({
          name: effect.label,
          ...r,
          defaultImage: effect.files[0],
          hoverImage: hover,
          durationMs: longest ? longest.duration : 200,
          easing: cubicBezierOf(longest?.easing ?? 'ease'),
        });
      }
      const spec = specFromInteraction(effect);
      if (spec) animated.push({ spec, rect: r });
    }
    figma.sections.push(figmaSection);

    const layers: AeComp['layers'] = [];
    for (const [i, { spec, rect: r }] of animated.entries()) {
      await attempt('Animation exports', async () => {
        const png = await cropPng(shot, r, ctx.scale);
        const name = `${slug(spec.name)}-${i + 1}`;
        ctx.put(`exports/crops/${section.id}/${name}.png`, png, false);
        layers.push({ name: spec.name, image: `../crops/${section.id}/${name}.png`, ...r, spec });
        const lottie = toLottie(spec, { dataUrl: `data:image/png;base64,${base64(png)}`, width: Math.round(r.width * ctx.scale), height: Math.round(r.height * ctx.scale) });
        ctx.put(`exports/lottie/${section.id}-${name}.json`, json(lottie));
      });
    }
    if (layers.length) aeComps.push({ name: section.name, width: rect.width, height: rect.height, background: `../../sections/${section.id}/desktop.png`, layers });

    // Phase 4: reproducible code for every effect, with a CSS-only preview of each.
    if (motion) {
      await attempt('Effect code', async () => {
        // CSS identifiers can't start with a digit, and section ids do.
        const replicas = replicate(motion, `fx-${section.id}`);
        if (!replicas.length) return;
        const code = replicaFiles(replicas);
        ctx.put(`exports/code/${section.id}.css`, strToU8(code.css));
        if (code.gsap) ctx.put(`exports/code/${section.id}.gsap.js`, strToU8(code.gsap));
        if (code.motion) ctx.put(`exports/code/${section.id}.motion.tsx`, strToU8(code.motion));
        const previews: { replica: Replica; image: string }[] = [];
        for (const r of replicas) {
          if (!r.rect || !r.spec || !isTrustworthy(r)) continue;
          const image = `exports/crops/${section.id}/${r.id}.png`;
          ctx.put(image, await cropPng(shot, relative(r.rect), ctx.scale), false);
          previews.push({ replica: r, image: `../crops/${section.id}/${r.id}.png` });
        }
        if (previews.length) ctx.put(`exports/code/${section.id}.preview.html`, strToU8(previewPage(section.name, previews)));
        replication.push({ section: section.id, replicas: replicas.map(({ css: _c, gsap: _g, motion: _m, ...rest }) => ({ ...rest, inCode: isTrustworthy(rest as Replica) })) });
      });
    }
  }
  if (replication.length) ctx.put('exports/code/replication.json', json(replication));
  const all = replication.flatMap((s) => s.replicas);
  const used = all.filter((r) => r.inCode);
  const fitted = used.filter((r) => r.source === 'fitted');
  const summary: ExportSummary = {
    replicas: used.length,
    leftOut: all.length - used.length,
    fittedScore: fitted.length ? fitted.reduce((s, r) => s + r.score, 0) / fitted.length : null,
  };

  ctx.put('exports/figma.json', json(figma));
  if (aeComps.length) ctx.put('exports/after-effects/specimen.jsx', strToU8(toAfterEffectsScript(aeComps)));
  return summary;
}

/**
 * Replays each effect on a crop of its element, with CSS only (the page has no scripts): loops run,
 * one-off effects repeat every few seconds, and hover effects respond to the pointer.
 */
function previewPage(title: string, items: { replica: Replica; image: string }[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const css: string[] = [];
  const figures = items.map(({ replica: r, image }, i) => {
    const spec = r.spec!;
    const cls = `fx${i}`;
    const offsets = [...new Set(Object.values(spec.tracks).flatMap((k) => k!.map((x) => x.offset)))].sort((a, b) => a - b);
    const frame = (o: number) => {
      const v: Record<string, number> = {};
      for (const [p, keys] of Object.entries(spec.tracks)) v[p] = keys!.find((k) => k.offset === o)?.value ?? keys![0].value;
      const t = `translate(${v.tx ?? 0}px, ${v.ty ?? 0}px) scale(${v.scale ?? 1}) rotate(${v.rotate ?? 0}deg)`;
      return `${v.opacity !== undefined ? `opacity:${v.opacity};` : ''}transform:${t};`;
    };
    const easingAt = (o: number) => Object.values(spec.tracks)[0]!.find((k) => k.offset === o)?.easing ?? 'linear';
    if (r.trigger === 'hover') {
      css.push(`.${cls}{${frame(0)}transition:all ${spec.durationMs}ms ${easingAt(0).replace(/[^a-z0-9(),.\s%-]/gi, '')}}.${cls}:hover{${frame(1)}}`);
    } else {
      // One-off effects play in the first half of a 2× cycle, then hold, so they can be watched again.
      const once = r.trigger !== 'loop';
      const total = once ? Math.max(spec.durationMs * 2, 1500) : spec.durationMs;
      const scale = spec.durationMs / total;
      css.push(`@keyframes ${cls}{${offsets.map((o) => `${(o * scale * 100).toFixed(2)}%{${frame(o)}animation-timing-function:${easingAt(o).replace(/[^a-z0-9(),.\s%-]/gi, '')}}`).join('')}${once ? `100%{${frame(1)}}` : ''}}.${cls}{animation:${cls} ${total}ms infinite}`);
    }
    return `<figure><div class="stage"><img class="${cls}" src="${esc(image)}" alt=""></div><figcaption><strong>${esc(r.name)}</strong><br><span>${esc(r.selector)} · ${r.trigger} · ${r.source}${r.source === 'fitted' ? ` · match ${Math.round(r.score * 100)}%` : ''}</span></figcaption></figure>`;
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${GENERATED_HTML_CSP}"><title>${esc(title)} — effects</title>
<style>body{margin:0;padding:24px 16px;font:14px/1.5 system-ui,sans-serif;background:#fff;color:#0a0a0a}main{max-width:960px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
figure{margin:0;border:1px solid #eaeaea;border-radius:10px;padding:12px}.stage{display:grid;place-items:center;min-height:140px;background:#f7f7f7;border-radius:6px;overflow:hidden}.stage img{max-width:90%}
figcaption{margin-top:8px}figcaption span{color:#737373;font-size:12px}${css.join('')}</style></head>
<body><main>${figures.join('')}</main></body></html>
`;
}

/** A PNG of part of a screenshot. `rect` is in CSS px relative to the screenshot. */
export async function cropPng(png: Uint8Array, rect: Rect, scale: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(new Blob([png as BlobPart], { type: 'image/png' }));
  try {
    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    canvas.getContext('2d')!.drawImage(bitmap, Math.round(rect.x * scale), Math.round(rect.y * scale), w, h, 0, 0, w, h);
    return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
  } finally {
    bitmap.close();
  }
}

function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
