import type { Page } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

type Files = Record<string, Uint8Array>;

interface Manifest {
  url: string;
  title: string;
  capturedAt: string;
  sections: { id: string; name: string; files: string[] }[];
  motion: { animations: number; interactions: number; scrollEffects: number; pointerEffects: number; toggles: number } | null;
}

export interface SectionDiff {
  name: string;
  before: string | null;
  after: string | null;
  status: 'added' | 'removed' | 'changed' | 'same';
  /** Share of desktop pixels that differ (0–1), when both screenshots exist. */
  changed: number | null;
  sizeChanged: boolean;
  diffImage: string | null;
}

export interface DiffReport {
  before: { url: string; capturedAt: string };
  after: { url: string; capturedAt: string };
  sections: SectionDiff[];
  colors: { added: string[]; removed: string[]; variables: { name: string; before: string | null; after: string | null }[] };
  stack: { added: string[]; removed: string[]; versions: { name: string; before: string | null; after: string | null }[] };
  motion: Record<string, { before: number; after: number }>;
}

/** Pixels whose channels differ by more than this count as changed (ignores anti-aliasing noise). */
const PIXEL_THRESHOLD = 24;

/** Compares two Specimen bundles: sections, screenshots, colours, variables, tech stack and motion. */
export async function diffBundles(a: Uint8Array, b: Uint8Array, page: Page): Promise<{ report: DiffReport; images: Record<string, Uint8Array> }> {
  const A = unzipSync(a);
  const B = unzipSync(b);
  const read = <T>(f: Files, p: string): T => JSON.parse(strFromU8(f[p]));
  const ma = read<Manifest>(A, 'manifest.json');
  const mb = read<Manifest>(B, 'manifest.json');
  const images: Record<string, Uint8Array> = {};

  // Sections are matched by name: ids carry their position, which shifts when sections are added.
  const byName = (m: Manifest) => new Map(m.sections.map((s) => [s.name, s]));
  const na = byName(ma);
  const nb = byName(mb);
  const sections: SectionDiff[] = [];
  for (const name of new Set([...na.keys(), ...nb.keys()])) {
    const sa = na.get(name);
    const sb = nb.get(name);
    if (!sa || !sb) {
      sections.push({ name, before: sa?.id ?? null, after: sb?.id ?? null, status: sa ? 'removed' : 'added', changed: null, sizeChanged: false, diffImage: null });
      continue;
    }
    const pa = A[`sections/${sa.id}/desktop.png`];
    const pb = B[`sections/${sb.id}/desktop.png`];
    let changed: number | null = null;
    let sizeChanged = false;
    let diffImage: string | null = null;
    if (pa && pb) {
      const cmp = await compareImages(page, pa, pb);
      changed = cmp.changed;
      sizeChanged = cmp.sizeChanged;
      if (changed > 0 || sizeChanged) {
        // Bundles can come from anyone: the id is reduced to a plain file name.
        diffImage = `diff/${sb.id.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || 'section'}.png`;
        images[diffImage] = cmp.diff;
      }
    }
    sections.push({ name, before: sa.id, after: sb.id, status: changed || sizeChanged ? 'changed' : 'same', changed, sizeChanged, diffImage });
  }

  const pal = (f: Files) => read<{ colors: { hex: string }[]; variables: { name: string; value: string }[] }>(f, 'palette.json');
  const pa = pal(A);
  const pb = pal(B);
  const hexA = new Set(pa.colors.map((c) => c.hex));
  const hexB = new Set(pb.colors.map((c) => c.hex));
  const varA = new Map(pa.variables.map((v) => [v.name, v.value]));
  const varB = new Map(pb.variables.map((v) => [v.name, v.value]));
  const variables = [...new Set([...varA.keys(), ...varB.keys()])]
    .filter((n) => varA.get(n) !== varB.get(n))
    .map((name) => ({ name, before: varA.get(name) ?? null, after: varB.get(name) ?? null }));

  const st = (f: Files) => new Map(read<{ name: string; version: string | null }[]>(f, 'stack.json').map((s) => [s.name, s.version]));
  const sa = st(A);
  const sb = st(B);

  const motion: DiffReport['motion'] = {};
  for (const k of ['animations', 'interactions', 'scrollEffects', 'pointerEffects', 'toggles'] as const) {
    motion[k] = { before: ma.motion?.[k] ?? 0, after: mb.motion?.[k] ?? 0 };
  }

  return {
    images,
    report: {
      before: { url: ma.url, capturedAt: ma.capturedAt },
      after: { url: mb.url, capturedAt: mb.capturedAt },
      sections,
      colors: { added: [...hexB].filter((h) => !hexA.has(h)), removed: [...hexA].filter((h) => !hexB.has(h)), variables },
      stack: {
        added: [...sb.keys()].filter((n) => !sa.has(n)),
        removed: [...sa.keys()].filter((n) => !sb.has(n)),
        versions: [...sa.keys()].filter((n) => sb.has(n) && sa.get(n) !== sb.get(n)).map((name) => ({ name, before: sa.get(name) ?? null, after: sb.get(name) ?? null })),
      },
      motion,
    },
  };
}

/** Pixel comparison in the browser: the share of changed pixels and an image highlighting them in red. */
async function compareImages(page: Page, a: Uint8Array, b: Uint8Array): Promise<{ changed: number; sizeChanged: boolean; diff: Uint8Array }> {
  const url = (bytes: Uint8Array) => `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
  const res = await page.evaluate(
    async ([ua, ub, threshold]) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((ok, fail) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.onerror = fail;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(ua as string), load(ub as string)]);
      const w = Math.max(ia.width, ib.width);
      const h = Math.max(ia.height, ib.height);
      const pixels = (img: HTMLImageElement) => {
        const c = new OffscreenCanvas(w, h);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const pa = pixels(ia);
      const pb = pixels(ib);
      const out = new OffscreenCanvas(w, h);
      const octx = out.getContext('2d')!;
      octx.globalAlpha = 0.25;
      octx.drawImage(ib, 0, 0);
      const overlay = octx.getImageData(0, 0, w, h);
      let changed = 0;
      for (let i = 0; i < pa.length; i += 4) {
        if (Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]), Math.abs(pa[i + 3] - pb[i + 3])) > (threshold as number)) {
          changed++;
          overlay.data.set([220, 38, 38, 255], i);
        }
      }
      octx.putImageData(overlay, 0, 0);
      const blob = await out.convertToBlob({ type: 'image/png' });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { changed: changed / (w * h), sizeChanged: ia.width !== ib.width || ia.height !== ib.height, diff: btoa(bin) };
    },
    [url(a), url(b), PIXEL_THRESHOLD] as const,
  );
  return { changed: res.changed, sizeChanged: res.sizeChanged, diff: new Uint8Array(Buffer.from(res.diff, 'base64')) };
}

/** A readable HTML page for a diff report (no scripts). */
export function diffHtml(r: DiffReport): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(2)}%`);
  const rows = r.sections
    .map((s) => `<tr><td>${esc(s.name)}</td><td>${s.status}</td><td>${pct(s.changed)}${s.sizeChanged ? ' · size changed' : ''}</td><td>${s.diffImage ? `<a href="${s.diffImage}"><img src="${s.diffImage}" alt=""></a>` : ''}</td></tr>`)
    .join('');
  const chips = (hexes: string[]) => hexes.map((h) => `<span class="chip" style="background:${esc(h)}" title="${esc(h)}"></span><code>${esc(h)}</code>`).join(' ') || '<span class="muted">none</span>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data:; style-src 'unsafe-inline'">
<title>Specimen diff</title><style>body{margin:0;padding:32px 16px;font:14px/1.5 system-ui,sans-serif;color:#0a0a0a;background:#fff}main{max-width:1100px;margin:auto}
h2{font-size:15px;margin:32px 0 8px}table{border-collapse:collapse;width:100%}td{border-top:1px solid #eaeaea;padding:8px 8px 8px 0;vertical-align:top}
td img{max-width:360px;border:1px solid #eaeaea;border-radius:6px}.muted{color:#737373}.chip{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid #eaeaea;vertical-align:-2px;margin:0 4px 0 8px}</style></head>
<body><main><h1>Specimen diff</h1>
<p class="muted">${esc(r.before.url)} (${esc(r.before.capturedAt)}) → ${esc(r.after.url)} (${esc(r.after.capturedAt)})</p>
<h2>Sections</h2><table>${rows}</table>
<h2>Colours</h2><p>Added: ${chips(r.colors.added)}</p><p>Removed: ${chips(r.colors.removed)}</p>
${r.colors.variables.length ? `<p>Variables changed: ${r.colors.variables.map((v) => `<code>${esc(v.name)}</code> ${esc(v.before ?? '—')} → ${esc(v.after ?? '—')}`).join(', ')}</p>` : ''}
<h2>Tech stack</h2><p>Added: ${esc(r.stack.added.join(', ') || 'none')} · Removed: ${esc(r.stack.removed.join(', ') || 'none')}${r.stack.versions.length ? ` · Versions: ${r.stack.versions.map((v) => esc(`${v.name} ${v.before} → ${v.after}`)).join(', ')}` : ''}</p>
<h2>Motion</h2><p>${Object.entries(r.motion).map(([k, v]) => `${esc(k)} ${v.before} → ${v.after}`).join(' · ')}</p>
</main></body></html>
`;
}
