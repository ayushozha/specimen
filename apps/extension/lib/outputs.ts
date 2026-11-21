import type { LayoutTree, StackItem } from '@specimen/core';
import { pickCallouts, toDesignMarkdown, tokensJson, type Callout, type FigmaDocument, type MotionCue, type SpecSection } from '@specimen/exporters';
import { strFromU8, strToU8, zipSync } from 'fflate';
import type { CaptureResult } from './capture';
import type { CapturedAnimation, ClassifiedTrack, InteractionEffect } from './motion';

/**
 * What a capture turns into: paste-ready copies for design tools, design files, and a DESIGN.md
 * folder for coding agents. Everything is built from the capture's own files, after the fact.
 */

/** Space between sections when several are pasted as one. */
const SECTION_GAP = 80;
/** Folder name for the agent spec, inside the folder the user picks. */
const SPEC_DIR = 'design-spec';

export interface CapturedSection {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Bundle path of the desktop screenshot. */
  shot: string;
}

export function capturedSections(result: CaptureResult): CapturedSection[] {
  return result.manifest.sections
    .filter((s) => result.files[`sections/${s.id}/desktop.png`])
    .map((s) => {
      const r = s.rects.desktop ?? s.rect;
      return { id: s.id, name: s.name, width: r.width, height: r.height, shot: `sections/${s.id}/desktop.png` };
    });
}

const text = (result: CaptureResult, path: string) => (result.files[path] ? strFromU8(result.files[path]) : null);

/** One section's self-contained SVG (images and fonts inline). */
export function sectionSvg(result: CaptureResult, id: string): string | null {
  return text(result, `exports/svg/${id}.svg`);
}

/**
 * Several sections as one SVG, stacked with a gap, each its own nested frame. Ids are prefixed per
 * section so their gradients, filters and clips don't collide.
 */
export function stackedSvg(result: CaptureResult, ids: string[]): string | null {
  const parts: string[] = [];
  let y = 0;
  let width = 0;
  for (const [i, id] of ids.entries()) {
    const svg = sectionSvg(result, id);
    if (!svg) continue;
    const w = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1] ?? 0);
    const h = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1] ?? 0);
    const p = `p${i}-`;
    const body = svg
      .replace(/\sid="([^"]+)"/g, ` id="${p}$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
      .replace(/href="#([^"]+)"/g, `href="#${p}$1"`)
      .replace(/^<svg\s/, `<svg x="0" y="${y}" `);
    parts.push(body);
    y += h + SECTION_GAP;
    width = Math.max(width, w);
  }
  if (!parts.length) return null;
  const height = y - SECTION_GAP;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${parts.join('\n')}\n</svg>`;
}

/** The section's HTML with its bundled images and fonts inline, for pasting into Paper. */
export function sectionHtml(result: CaptureResult, id: string): string | null {
  const html = text(result, `sections/${id}/${id}.html`);
  if (!html) return null;
  return html.replace(/\.\.\/\.\.\/(assets\/[^"')\s]+)/g, (m, path: string) => (result.files[path] ? dataUrl(result.files[path], path) : m));
}

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', mp4: 'video/mp4', webm: 'video/webm', psd: 'image/vnd.adobe.photoshop',
  md: 'text/markdown', json: 'application/json', zip: 'application/zip',
};
export const mimeOf = (path: string) => MIME[path.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream';

function dataUrl(bytes: Uint8Array, path: string): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mimeOf(path)};base64,${btoa(bin)}`;
}

/**
 * SVG on the clipboard as text: Figma, Sketch, Penpot, Framer and Illustrator all turn pasted SVG
 * markup into editable layers.
 */
export async function copySvg(svg: string): Promise<void> {
  await navigator.clipboard.writeText(svg);
}

/** HTML on the clipboard: Paper turns pasted HTML into layers; other apps get the markup as text. */
export async function copyHtml(html: string): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([html], { type: 'text/plain' }) })]);
}

export async function copyImage(png: Uint8Array): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([png as BlobPart], { type: 'image/png' }) })]);
}

export function downloadFile(filename: string, data: Uint8Array | string): void {
  const bytes = typeof data === 'string' ? strToU8(data) : data;
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeOf(filename) }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** File name base for downloads: `<host>-<section>` or `<host>`. */
export function baseName(result: CaptureResult, id?: string): string {
  const host = result.filename.replace(/_.*$/, '');
  return id ? `${host}-${id}` : host;
}

/** The Figma plugin's input: figma.json and only the images it uses, as a small zip. */
export function figmaImportZip(result: CaptureResult, ids?: string[]): Uint8Array | null {
  const raw = result.files['exports/figma.json'];
  if (!raw) return null;
  const doc = JSON.parse(strFromU8(raw)) as FigmaDocument;
  if (ids) doc.sections = doc.sections.filter((s) => ids.includes(s.id));
  const wanted = new Set<string>(Object.values(doc.assets));
  for (const s of doc.sections) {
    wanted.add(s.screenshot);
    if (s.background) wanted.add(s.background);
    for (const v of s.variants) wanted.add(v.defaultImage).add(v.hoverImage);
  }
  const files: Record<string, Uint8Array> = { 'exports/figma.json': strToU8(JSON.stringify(doc)) };
  for (const path of wanted) if (result.files[path]) files[path] = result.files[path];
  return zipSync(files, { level: 0 });
}

// ---------------------------------------------------------------------------------------------
// Agent spec

function json<T>(result: CaptureResult, path: string): T | null {
  const t = text(result, path);
  return t ? (JSON.parse(t) as T) : null;
}

const ms = (n: number) => `${Math.round(n)}ms`;

/** Motion recorded for a section, as plain sentences an agent can implement. */
export function motionCues(result: CaptureResult, id: string): MotionCue[] {
  const cues: MotionCue[] = [];
  const motion = json<{ animations: CapturedAnimation[]; tracks: ClassifiedTrack[] }>(result, `sections/${id}/motion.json`);
  const interactions = json<InteractionEffect[]>(result, `sections/${id}/interactions.json`) ?? [];
  for (const a of motion?.animations ?? []) {
    const loop = a.iterations === 'infinite';
    const timing = a.timeline === 'scroll' ? 'driven by scroll position' : `${ms(a.duration)}${a.delay ? ` after ${ms(a.delay)}` : ''}, ${a.easing}${loop ? ', loops forever' : a.iterations !== 1 ? `, ${a.iterations}×` : ''}`;
    const props = [...new Set(a.keyframes.flatMap((k) => Object.keys(k).filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))];
    cues.push({ kind: loop ? 'loop' : a.timeline === 'scroll' ? 'scroll' : 'animation', target: a.target ?? a.name, description: `${a.kind === 'css-transition' ? 'transition' : `animation “${a.name}”`} of ${props.join(', ') || a.name}, ${timing}` });
  }
  for (const t of motion?.tracks ?? []) {
    const first = t.samples[0]?.[2];
    const last = t.samples[t.samples.length - 1]?.[2];
    const kind = t.kind === 'scroll-reveal' ? 'reveal' : t.kind === 'scroll-linked' ? 'scroll' : t.kind === 'pointer' ? 'pointer' : 'animation';
    const how = { 'scroll-reveal': 'plays once as it scrolls into view', 'scroll-linked': 'follows the scroll position', pointer: 'follows the pointer', time: 'changes over time' }[t.kind];
    cues.push({ kind, target: t.selector, description: `${t.prop} ${first ?? ''} → ${last ?? ''}, ${how}${t.observed ? ' (IntersectionObserver)' : ''}` });
  }
  for (const e of interactions) {
    const changes = e.changes.slice(0, 4).map((c) => `${c.prop} ${c.from} → ${c.to}`).join('; ');
    const timing = e.transitions.length ? e.transitions.slice(0, 2).map((t) => `${t.property} ${ms(t.duration)} ${t.easing}${t.delay ? ` +${ms(t.delay)}` : ''}`).join(', ') : 'instant';
    cues.push({ kind: e.trigger, target: e.label || e.selector, description: `${changes || 'state change'} (${timing})` });
  }
  return cues;
}

/** Draws numbered callouts on a section screenshot. */
async function highlightImage(png: Uint8Array, callouts: Callout[], cssWidth: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(new Blob([png as BlobPart], { type: 'image/png' }));
  const scale = bitmap.width / Math.max(1, cssWidth);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const r = 11 * scale;
  for (const c of callouts) {
    const x = c.rect.x * scale;
    const y = c.rect.y * scale;
    const w = c.rect.width * scale;
    const h = c.rect.height * scale;
    // White under black, so the outline reads on light and dark pages alike.
    ctx.fillStyle = 'rgba(111, 168, 220, 0.18)';
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 4 * scale;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#0A0A0A';
    ctx.strokeRect(x, y, w, h);
    const cx = Math.max(r, x);
    const cy = Math.max(r, y);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0A0A0A';
    ctx.fill();
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${12 * scale}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(c.n), cx, cy + 0.5 * scale);
  }
  return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
}

export interface SpecPreview {
  sections: number;
  screenshots: number;
  highlights: number;
  motionCues: number;
  videos: number;
}

/** DESIGN.md, screenshots, highlights, tokens and recordings, as files relative to the spec folder. */
export async function agentSpec(result: CaptureResult, stack: StackItem[], ids?: string[]): Promise<{ files: Record<string, Uint8Array>; markdown: string; preview: SpecPreview }> {
  const doc = json<FigmaDocument>(result, 'exports/figma.json');
  const trees = new Map<string, LayoutTree>((doc?.sections ?? []).map((s) => [s.id, s.tree]));
  const files: Record<string, Uint8Array> = {};
  const sections: SpecSection[] = [];
  const preview: SpecPreview = { sections: 0, screenshots: 0, highlights: 0, motionCues: 0, videos: 0 };
  for (const s of capturedSections(result)) {
    if (ids && !ids.includes(s.id)) continue;
    const tree = trees.get(s.id);
    if (!tree) continue;
    const shots: SpecSection['screenshots'] = { desktop: `screenshots/${s.id}.png` };
    files[shots.desktop] = result.files[s.shot];
    for (const bp of ['tablet', 'mobile'] as const) {
      const path = `sections/${s.id}/${bp}.png`;
      if (result.files[path]) {
        shots[bp] = `screenshots/${s.id}-${bp}.png`;
        files[shots[bp]!] = result.files[path];
      }
    }
    const callouts = pickCallouts(tree);
    let highlights: string | null = null;
    if (callouts.length) {
      highlights = `highlights/${s.id}.png`;
      files[highlights] = await highlightImage(result.files[s.shot], callouts, s.width);
    }
    const video = result.files[`sections/${s.id}/scroll.mp4`] ? `motion/${s.id}.mp4` : null;
    if (video) files[video] = result.files[`sections/${s.id}/scroll.mp4`];
    const motion = motionCues(result, s.id);
    sections.push({ id: s.id, name: s.name, width: s.width, height: s.height, tree, screenshots: shots, highlights, callouts, motion, video });
    preview.sections++;
    preview.screenshots += 1 + (shots.tablet ? 1 : 0) + (shots.mobile ? 1 : 0);
    preview.highlights += highlights ? 1 : 0;
    preview.motionCues += motion.length;
    preview.videos += video ? 1 : 0;
  }
  const palette = json<Parameters<typeof toDesignMarkdown>[0]['palette']>(result, 'palette.json')!;
  const input = {
    source: { url: result.manifest.url, title: result.manifest.title },
    capturedAt: result.manifest.capturedAt,
    breakpoints: result.manifest.breakpoints.map((b) => ({ name: b.name, width: b.captured })),
    palette,
    stack,
    sections,
    motionRecorded: !!result.manifest.motion,
    tokensFile: 'tokens.json',
  };
  const markdown = toDesignMarkdown(input);
  files['DESIGN.md'] = strToU8(markdown);
  files['tokens.json'] = strToU8(JSON.stringify(tokensJson(input), null, 2));
  return { files, markdown, preview };
}

/**
 * Writes files into a folder the user picks (Chrome and Edge), under `design-spec/`. Returns false
 * where the browser has no folder access (Safari, Firefox), so the caller can download a zip instead.
 */
export async function writeToFolder(files: Record<string, Uint8Array>, folder = SPEC_DIR): Promise<string | false> {
  const pick = (window as unknown as { showDirectoryPicker?: (o: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
  if (!pick) return false;
  const root = await pick({ id: 'specimen-spec', mode: 'readwrite' });
  const base = await root.getDirectoryHandle(folder, { create: true });
  for (const [path, data] of Object.entries(files)) {
    const parts = path.split('/');
    let dir = base;
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
    const file = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    const w = await file.createWritable();
    await w.write(data as BlobPart);
    await w.close();
  }
  return `${root.name}/${folder}`;
}
