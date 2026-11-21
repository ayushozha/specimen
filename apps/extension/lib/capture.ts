import {
  freezePageScripts,
  hasRaster,
  globalPaths,
  probeGlobals,
  type Breakpoint,
  type LayoutTree,
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
import { buildExports, type ExportSummary } from './exports';
import { MOTION_STEPS, captureMotion, type MotionSummary, type SectionMotion } from './motion';
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
  /** The section just captured at the widest breakpoint, for a live preview. */
  latest?: { name: string; png: Uint8Array };
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
  /** `captured` is the viewport width reached (browsers without device emulation resize the window). */
  breakpoints: (Breakpoint & { captured: number })[];
  scope: 'page' | 'sections';
  sections: (Section & { rects: Record<string, Rect | null>; files: string[] })[];
  motion: MotionSummary | null;
  exports: ExportSummary | null;
  files: string[];
  errors: StepError[];
}

export interface CaptureResult {
  filename: string;
  zip: Uint8Array;
  /** The bundle's files by path, for building outputs without unzipping. */
  files: Record<string, Uint8Array>;
  manifest: Manifest;
}

export interface CaptureRequest {
  /** Sections to capture; all of `analysis.sections` when omitted ("Capture everything"). */
  sectionIds?: string[];
  breakpoints?: Breakpoint[];
  /**
   * Also record motion: load and scroll video, animations frame by frame, hover and focus states,
   * menus. Off unless asked for: it reloads the page and moves the pointer over it.
   */
  motion?: boolean;
  /** Aborting it stops the capture between steps and puts the page back as it was. */
  signal?: AbortSignal;
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
  const sections = (await adapter.call('detectSections', {})).slice(0, CONFIG.maxSections);
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
  const trees = new Map<string, LayoutTree>();
  const shots = new Map<string, Uint8Array>();
  const plates = new Map<string, Uint8Array>();
  const desktopRects = new Map<string, Rect>();
  const assetPaths = new Map<string, string>();
  const fontCss = new Map<string, string>();
  let motionDetails: Record<string, SectionMotion> | null = null;
  let exportSummary: ExportSummary | null = null;
  const actualWidths: Record<string, number> = {};
  let desktopTiles: Tile[] = [];

  const withMotion = request.motion ?? false;
  let motion: MotionSummary | null = null;
  const total = breakpoints.length * (sections.length + 1) + (wholePage ? 4 : 2) + 1 + (withMotion ? MOTION_STEPS : 0);
  let done = 0;
  const signal = request.signal;
  const step = async (name: string, fn: () => Promise<void>) => {
    signal?.throwIfAborted();
    onProgress({ step: name, done, total });
    try {
      await fn();
    } catch (err) {
      // A cancel ends the capture; any other failure is recorded and the capture goes on.
      if (signal?.aborted) throw signal.reason;
      errors.push({ step: name, message: err instanceof Error ? err.message : String(err) });
    }
    done++;
  };
  const put = (path: string, data: Uint8Array, compress = true) => {
    files[path] = compress ? data : [data, { level: 0 }];
  };

  try {
    if (withMotion) {
      // Motion first: it reloads the page in deep mode, and the screenshots below then see the settled page.
      ({ summary: motion, sections: motionDetails } = await captureMotion({
        adapter,
        sections,
        sheets: analysis.sheets,
        desktop: breakpoints[0],
        scale,
        put,
        step,
        addSectionFile: (id, path) => sectionFiles[id]?.push(path),
        note: (stepName, message) => errors.push({ step: stepName, message }),
        signal,
      }));
    }

    for (const [bpIndex, bp] of breakpoints.entries()) {
      let measured: Section[] = sections;
      await step(`Full page at ${bp.name} (${bp.width}px)`, async () => {
        const reached = await adapter.setViewport(bp, scale);
        if (reached !== null && Math.abs(reached - bp.width) > 1) {
          errors.push({ step: `Full page at ${bp.name}`, message: `Captured at ${reached}px instead of ${bp.width}px: this browser couldn't resize the window to that width on this screen.` });
        }
        actualWidths[bp.name] = reached ?? bp.width;
        await sleep(CONFIG.settleMs);
        await adapter.call('autoScroll', CONFIG.scroll.stepRatio, CONFIG.scroll.quickDelayMs, 200);
        measured = await adapter.call('measureSections', sections);
        if (!wholePage) return;
        const { height: fullHeight } = await adapter.call('pageSize');
        const height = Math.min(fullHeight, CONFIG.maxPageHeight);
        if (height < fullHeight) errors.push({ step: `Full page at ${bp.name}`, message: `Page is ${fullHeight}px tall; captured the first ${height}px` });
        const tiles = await fullPageTiles(adapter, bp.width, height, scale);
        tiles.forEach((t, i) => put(tiles.length > 1 ? `page/full-${bp.name}-${i + 1}.png` : `page/full-${bp.name}.png`, t.png, false));
        if (bpIndex === 0) desktopTiles = tiles;
      });

      for (const planned of measured) {
        await step(`${planned.name} at ${bp.name}`, async () => {
          // On screen first, so scroll-driven and on-enter reveals show their settled state (stripe.com's
          // were half-faded at the top of the page), then measured again: lazy content above can move a
          // section after the first measurement (stripe.com's moved ~1,160px).
          // Reveals play once and stay played, so letting them settle at the widest breakpoint is enough.
          if (bpIndex === 0) await adapter.call('settleSection', planned.selector, CONFIG.settleAnimationsMs);
          const [section] = await adapter.call('measureSections', [planned]);
          const visible = section.rect.width > 0 && section.rect.height > 0;
          rects[section.id][bp.name] = visible ? section.rect : null;
          if (!visible) return;
          await adapter.call('hideFixedOutside', analysis.fixed, section.selector);
          // At the widest breakpoint the screenshot, HTML and layout tree must show the same instant:
          // freeze CSS animations and the page's own animation scripts (tickers, typing effects).
          const freeze = bpIndex === 0;
          if (freeze) {
            await adapter.call('pauseAllAnimations');
            await adapter.evaluateMain(freezePageScripts, true).catch(() => 0);
          }
          try {
            const path = `sections/${section.id}/${bp.name}.png`;
            const png = await shootAsSeen(adapter, section.rect, bp.height, scale);
            put(path, png, false);
            sectionFiles[section.id].push(path);
            if (bpIndex === 0) {
              shots.set(section.id, png);
              desktopRects.set(section.id, section.rect);
              onProgress({ step: `${planned.name} at ${bp.name}`, done, total, latest: { name: planned.name, png } });
            }
            // HTML is serialised once, at the first (widest) breakpoint, while still frozen.
            if (freeze && section.selector) {
              const { html, resources: used } = await adapter.call('serializeElement', section.selector, analysis.sheets);
              used.forEach((u) => resources.add(u));
              sectionHtml.set(section.id, html);
              // The layout tree drives the design-tool exports (Figma, SVG, Photoshop).
              const tree = await adapter.call('layoutTree', section.selector, CONFIG.maxLayoutNodes);
              tree.images.forEach((u) => resources.add(u));
              trees.set(section.id, tree);
              // Boxes drawn from pixels get them from a screenshot without text and images, so the
              // editable layers on top aren't doubled.
              if (hasRaster(tree.root)) {
                await adapter.call('plateMode', section.selector, true);
                try {
                  const platePath = `sections/${section.id}/desktop-background.png`;
                  const plate = await shootAsSeen(adapter, section.rect, bp.height, scale);
                  put(platePath, plate, false);
                  plates.set(section.id, plate);
                } finally {
                  await adapter.call('plateMode', section.selector, false);
                }
              }
            }
          } finally {
            await adapter.call('restoreHidden');
            if (freeze) {
              await adapter.evaluateMain(freezePageScripts, false).catch(() => 0);
              await adapter.call('resumeAllAnimations');
            }
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
        const final = rewriteUrls(html, assetPaths, '../../');
        put(path, strToU8(final));
        // The same fonts make the SVG export render in the page's typefaces (same folder depth).
        fontCss.set(id, (final.match(/@font-face\s*\{[^}]*\}/g) ?? []).join('\n'));
        sectionFiles[id].push(path);
      }
    });

    await step('Building exports (Figma, SVG, Photoshop, After Effects, Lottie)', async () => {
      exportSummary = await buildExports({
        sections,
        trees,
        shots,
        plates,
        rects: desktopRects,
        fontCss,
        motion: motionDetails,
        palette: analysis.palette,
        assets: assetPaths,
        scale,
        source: { url: analysis.url, title: analysis.title },
        put,
        read: (path) => {
          const file = files[path];
          return file instanceof Uint8Array ? file : Array.isArray(file) && file[0] instanceof Uint8Array ? file[0] : null;
        },
        errors,
      });
    });
  } finally {
    await adapter.setViewport(null, 1).catch(() => {});
    if (signal?.aborted) {
      // Cancelled mid-step: undo what a section step may have left on the page.
      await adapter.call('restoreHidden').catch(() => {});
      await adapter.evaluateMain(freezePageScripts, false).catch(() => 0);
      await adapter.call('resumeAllAnimations').catch(() => {});
      await adapter.call('cancelPick').catch(() => {});
    }
  }

  const manifest: Manifest = {
    tool: 'specimen',
    version: 1,
    url: analysis.url,
    title: analysis.title,
    capturedAt: new Date().toISOString(),
    browser: adapter.browser,
    scale,
    breakpoints: breakpoints.map((b) => ({ ...b, captured: actualWidths[b.name] ?? b.width })),
    scope: wholePage ? 'page' : 'sections',
    sections: sections.map((s) => ({ ...s, rects: rects[s.id], files: sectionFiles[s.id] })),
    motion,
    exports: exportSummary,
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

  const flat = Object.fromEntries(Object.entries(files).map(([path, f]) => [path, (Array.isArray(f) ? f[0] : f) as Uint8Array]));
  return { filename: bundleName(analysis.url), zip: zipSync(files), files: flat, manifest };
}

/**
 * A section as a visitor sees it: scrolled on screen and taken from the visible area, a screen at a
 * time and stitched when it's taller than the viewport. (Rendering the whole page at once doesn't match
 * pages that pin sections while scrolling, and leaves scroll-driven reveals unplayed.)
 */
async function shootAsSeen(adapter: PageAdapter, rect: Rect, viewportHeight: number, scale: number): Promise<Uint8Array> {
  if (rect.height <= viewportHeight) {
    await adapter.call('scrollToY', rect.y);
    return adapter.screenshot(rect, { visible: true });
  }
  const canvas = new OffscreenCanvas(Math.round(rect.width * scale), Math.round(rect.height * scale));
  const ctx = canvas.getContext('2d')!;
  for (let y = rect.y; y < rect.y + rect.height; y += viewportHeight) {
    const actual = await adapter.call('scrollToY', y);
    // Near the bottom the page may stop short of y: the tile is still on screen, lower down.
    const h = Math.min(viewportHeight - (y - actual), rect.y + rect.height - y);
    const tile = await createImageBitmap(new Blob([(await adapter.screenshot({ x: rect.x, y, width: rect.width, height: h }, { visible: true })) as BlobPart], { type: 'image/png' }));
    ctx.drawImage(tile, 0, Math.round((y - rect.y) * scale));
    tile.close();
  }
  await adapter.call('scrollToY', rect.y);
  return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
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

/** `<host>[-<path>]_<date>.specimen.zip`, with only filename-safe characters. */
export function bundleName(url: string, now = new Date()): string {
  const safe = (s: string) => s.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '');
  let name = 'page';
  try {
    const u = new URL(url);
    const path = safe(u.pathname.replace(/\.(html?|php|aspx?)$/i, '')).slice(0, 40);
    name = [safe(u.hostname.replace(/^www\./, '')), path].filter(Boolean).join('-') || 'page';
  } catch {
    // Keep default.
  }
  return `${name}_${now.toISOString().slice(0, 19).replace(/:/g, '-')}.specimen.zip`;
}

function json(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2));
}
