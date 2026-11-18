import {
  globalPaths,
  probeGlobals,
  type Breakpoint,
  type Palette,
  type Rect,
  type Section,
  type StackItem,
  type StyleSheetText,
} from '@specimen/core';
import { strToU8, zipSync, type Zippable } from 'fflate';
import type { PageAdapter } from './adapter';
import { CONFIG } from './config';
import { sampleMediaColors, type MediaColors, type Tile } from './media';
import { renderPaletteCss, renderReport } from './report';

export interface Analysis {
  url: string;
  title: string;
  sections: Section[];
  palette: Palette;
  stack: StackItem[];
  fixed: string[];
  cookieBanner: string | null;
}

export interface Progress {
  step: string;
  done: number;
  total: number;
}

export interface StepError {
  step: string;
  message: string;
}

export interface Manifest {
  tool: string;
  version: number;
  url: string;
  title: string;
  capturedAt: string;
  browser: PageAdapter['browser'];
  scale: number;
  breakpoints: Breakpoint[];
  scope: 'page' | 'sections';
  sections: (Section & { rects: Record<string, Rect | null>; files: string[] })[];
  files: string[];
  errors: StepError[];
}

export interface CaptureResult {
  filename: string;
  zip: Uint8Array;
  manifest: Manifest;
}

export interface CaptureRequest {
  /** Sections to capture; all of `analysis.sections` when omitted ("Capture everything"). */
  sectionIds?: string[];
  breakpoints?: Breakpoint[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Prepares the page and reads sections, palette and tech stack. Fast; no screenshots. */
export async function analyse(adapter: PageAdapter, onProgress: (p: Progress) => void = () => {}): Promise<Analysis & { sheets: StyleSheetText[] }> {
  const total = 6;
  const tick = (step: string, done: number) => onProgress({ step, done, total });

  tick('Preparing page', 0);
  const { url, title } = await adapter.pageInfo();
  const cookieBanner = CONFIG.rejectCookies ? await adapter.call('rejectCookieBanner') : null;
  if (cookieBanner) await sleep(400);
  await adapter.call('waitForFonts', 5000);
  tick('Loading lazy content', 1);
  await adapter.call('autoScroll', CONFIG.scroll.stepRatio, CONFIG.scroll.delayMs, 200);

  tick('Reading stylesheets', 2);
  const sheets = await adapter.styleSheets();
  tick('Finding sections', 3);
  const sections = await adapter.call('detectSections', {});
  const fixed = await adapter.call('findFixedElements');

  tick('Detecting tech stack', 4);
  const { paths, probes } = globalPaths();
  const globals = await adapter.evaluateMain(probeGlobals, paths, probes);
  const varNames = [...new Set(sheets.flatMap((s) => [...s.text.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1])))];
  const stack = await adapter.call('detectStack', globals, varNames);

  tick('Extracting colours', 5);
  const palette = await adapter.call('extractPalette', sheets, CONFIG.palette);
  tick('Done', total);
  return { url, title, sections, palette, stack, fixed, cookieBanner, sheets };
}

/** Captures screenshots, HTML and assets for the whole page or chosen sections, and zips the bundle. */
export async function capture(
  adapter: PageAdapter,
  analysis: Analysis & { sheets: StyleSheetText[] },
  request: CaptureRequest = {},
  onProgress: (p: Progress) => void = () => {},
): Promise<CaptureResult> {
  // Widest first: section HTML and media colours are read at the first breakpoint.
  const breakpoints = [...(request.breakpoints ?? CONFIG.breakpoints)].sort((a, b) => b.width - a.width);
  const wholePage = !request.sectionIds;
  const sections = wholePage ? analysis.sections : analysis.sections.filter((s) => request.sectionIds!.includes(s.id));
  const scale = CONFIG.scale;
  const files: Zippable = {};
  const errors: StepError[] = [];
  const rects: Record<string, Record<string, Rect | null>> = Object.fromEntries(sections.map((s) => [s.id, {}]));
  const sectionFiles: Record<string, string[]> = Object.fromEntries(sections.map((s) => [s.id, []]));
  const resources = new Set<string>();
  const sectionHtml = new Map<string, string>();
  let desktopTiles: Tile[] = [];

  const total = breakpoints.length * (sections.length + 1) + (wholePage ? 4 : 2);
  let done = 0;
  const step = async (name: string, fn: () => Promise<void>) => {
    onProgress({ step: name, done, total });
    try {
      await fn();
    } catch (err) {
      errors.push({ step: name, message: err instanceof Error ? err.message : String(err) });
    }
    done++;
  };
  const put = (path: string, data: Uint8Array, compress = true) => {
    files[path] = compress ? data : [data, { level: 0 }];
  };

  try {
    for (const [bpIndex, bp] of breakpoints.entries()) {
      let measured: Section[] = sections;
      await step(`Full page at ${bp.name} (${bp.width}px)`, async () => {
        await adapter.setViewport(bp, scale);
        await sleep(CONFIG.settleMs);
        await adapter.call('autoScroll', CONFIG.scroll.stepRatio, CONFIG.scroll.quickDelayMs, 200);
        measured = await adapter.call('measureSections', sections);
        if (!wholePage) return;
        const { height } = await adapter.call('pageSize');
        const tiles = await fullPageTiles(adapter, bp.width, height, scale);
        tiles.forEach((t, i) => put(tiles.length > 1 ? `page/full-${bp.name}-${i + 1}.png` : `page/full-${bp.name}.png`, t.png, false));
        if (bpIndex === 0) desktopTiles = tiles;
      });

      for (const section of measured) {
        await step(`${section.name} at ${bp.name}`, async () => {
          const visible = section.rect.width > 0 && section.rect.height > 0;
          rects[section.id][bp.name] = visible ? section.rect : null;
          if (!visible) return;
          await adapter.call('hideFixedOutside', analysis.fixed, section.selector);
          try {
            const path = `sections/${section.id}/${bp.name}.png`;
            put(path, await adapter.screenshot(section.rect), false);
            sectionFiles[section.id].push(path);
          } finally {
            await adapter.call('restoreHidden');
          }
          // HTML is serialised once, at the first (widest) breakpoint.
          if (bpIndex === 0 && section.selector) {
            const { html, resources: used } = await adapter.call('serializeElement', section.selector, analysis.sheets);
            used.forEach((u) => resources.add(u));
            sectionHtml.set(section.id, html);
          }
        });
      }
    }

    await step('Restoring viewport', async () => {
      await adapter.setViewport(null, 1);
    });

    if (wholePage) {
      await step('Saving page snapshot (MHTML)', async () => {
        const mhtml = adapter.capabilities.mhtml ? await adapter.mhtml() : null;
        if (mhtml) put('page/page.mhtml', strToU8(mhtml));
      });
      await step('Sampling colours from images and video', async () => {
        if (desktopTiles.length === 0) return;
        await adapter.setViewport(breakpoints[0], scale);
        await sleep(CONFIG.settleMs);
        const media = await adapter.call('listMedia', 48);
        await adapter.setViewport(null, 1);
        const sampled: MediaColors[] = await sampleMediaColors(desktopTiles, media, scale, CONFIG.mediaColors);
        put('design/media-colors.json', json(sampled));
      });
    }

    await step('Downloading assets', async () => {
      const assetPaths = new Map<string, string>();
      let bytes = 0;
      for (const url of resources) {
        if (bytes > CONFIG.maxAssetBytes) {
          errors.push({ step: 'Downloading assets', message: `Stopped at ${CONFIG.maxAssetBytes} bytes; remaining assets keep their online URLs` });
          break;
        }
        const res = await adapter.resource(url);
        if (!res) continue;
        const path = `assets/${assetName(url, res.mimeType)}`;
        put(path, res.data, !/^(image|video|font)\//.test(res.mimeType));
        assetPaths.set(url, path);
        bytes += res.data.byteLength;
      }
      for (const [id, html] of sectionHtml) {
        const path = `sections/${id}/${id}.html`;
        put(path, strToU8(rewriteUrls(html, assetPaths, '../../')));
        sectionFiles[id].push(path);
      }
    });
  } finally {
    await adapter.setViewport(null, 1).catch(() => {});
  }

  const manifest: Manifest = {
    tool: 'specimen',
    version: 1,
    url: analysis.url,
    title: analysis.title,
    capturedAt: new Date().toISOString(),
    browser: adapter.browser,
    scale,
    breakpoints,
    scope: wholePage ? 'page' : 'sections',
    sections: sections.map((s) => ({ ...s, rects: rects[s.id], files: sectionFiles[s.id] })),
    files: [],
    errors,
  };
  put('palette.json', json(analysis.palette));
  put('stack.json', json(analysis.stack));
  put('design/palette.css', strToU8(renderPaletteCss(analysis.palette)));
  put('index.html', strToU8(renderReport(manifest, analysis)));
  manifest.files = [...Object.keys(files), 'manifest.json'].sort();
  put('manifest.json', json(manifest));
  onProgress({ step: 'Zipping', done: total, total });

  return { filename: bundleName(analysis.url), zip: zipSync(files), manifest };
}

/** Full-page screenshot, split into tiles when the page is taller than the GPU texture limit. */
async function fullPageTiles(adapter: PageAdapter, width: number, height: number, scale: number): Promise<Tile[]> {
  const tileHeight = Math.floor(CONFIG.maxTileHeight / scale);
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y += tileHeight) {
    tiles.push({ y, png: await adapter.screenshot({ x: 0, y, width, height: Math.min(tileHeight, height - y) }) });
  }
  return tiles;
}

function rewriteUrls(html: string, paths: Map<string, string>, prefix: string): string {
  let out = html;
  for (const [url, path] of paths) {
    const escaped = url.replace(/&/g, '&amp;');
    out = out.split(url).join(prefix + path);
    if (escaped !== url) out = out.split(escaped).join(prefix + path);
  }
  return out;
}

const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif',
  'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'font/woff2': 'woff2', 'font/woff': 'woff',
  'font/ttf': 'ttf', 'font/otf': 'otf', 'text/css': 'css',
};

/** Stable, collision-resistant file name for an asset URL. */
function assetName(url: string, mimeType: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) hash = Math.imul(hash ^ url.charCodeAt(i), 0x01000193) >>> 0;
  let base = 'asset';
  let ext = EXT[mimeType] ?? '';
  try {
    const name = new URL(url).pathname.split('/').pop() ?? '';
    const m = name.match(/^(.*?)(?:\.([a-z0-9]{2,5}))?$/i);
    base = (m?.[1] || 'asset').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40) || 'asset';
    ext ||= m?.[2]?.toLowerCase() ?? 'bin';
  } catch {
    ext ||= 'bin';
  }
  return `${base}-${hash.toString(16).padStart(8, '0')}.${ext}`;
}

function bundleName(url: string): string {
  let host = 'page';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // Keep default.
  }
  const stamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
  return `${host}_${stamp}.specimen.zip`;
}

function json(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2));
}
