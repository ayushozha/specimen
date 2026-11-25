import type { Browser, Page } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

/**
 * Checks that Specimen's motion code reproduces the page: each effect is measured on the live site,
 * then its exported CSS and GSAP code is run on its own on a blank stage (same viewport, same scroll
 * height, the element at the same place) and measured the same way. The two traces are compared.
 */

type Trigger = 'loop' | 'load' | 'hover' | 'scroll-reveal' | 'scroll-linked';

interface ReplicaEntry {
  id: string;
  name: string;
  selector: string;
  trigger: Trigger;
  source: string;
  score: number;
  inCode: boolean;
  rect: { x: number; y: number; width: number; height: number } | null;
  scroll: { start: number; end: number } | null;
  spec: { durationMs: number; delayMs: number } | null;
  css: string;
  gsap: string;
  motion: string;
}

/** Visual state of an element: opacity and its transform taken apart (individual properties included). */
type State = { opacity: number; tx: number; ty: number; scale: number; rotate: number; bgR: number; bgG: number; bgB: number; bgA: number; fgR: number; fgG: number; fgB: number };
const PROPS: (keyof State)[] = ['opacity', 'tx', 'ty', 'scale', 'rotate', 'bgR', 'bgG', 'bgB', 'bgA', 'fgR', 'fgG', 'fgB'];
/** A trace: x is time (ms) or scroll position (px). */
type Trace = [x: number, state: State][];

export interface EffectCheck {
  section: string;
  id: string;
  name: string;
  trigger: Trigger;
  selector: string;
  /** The match Specimen reported when it made the code. */
  claimed: number;
  /** Largest difference between the site and the code, as a share of how far the effect moves (0 = identical). */
  css: number | null;
  gsap: number | null;
  motion: number | null;
  note: string;
}

/** Up to this much difference counts as an exact replica: under a pixel of a 50px move, or 2% opacity. */
export const EXACT = 0.02;
/** Measurements of the code per effect at most, while it is over EXACT. */
const TRIES = 3;
const GSAP = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist';
/** Motion for React, as the exported .motion.tsx expects it; Babel compiles the TSX in the page. */
const MOTION_IMPORTS = { react: 'https://esm.sh/react@19.1.0', 'react-dom/client': 'https://esm.sh/react-dom@19.1.0/client?deps=react@19.1.0', 'motion/react': 'https://esm.sh/motion@12.23.0/react?deps=react@19.1.0,react-dom@19.1.0' };
const BABEL = 'https://unpkg.com/@babel/standalone@7.28.0/babel.min.js';
const VIEWPORT = { width: 1440, height: 900 };

/** Runs in the page: reads the element's state. */
function readState(el: Element): State {
  const s = getComputedStyle(el);
  const m = new DOMMatrix(s.transform === 'none' ? undefined : s.transform);
  const tr = s.translate === 'none' ? [0, 0] : s.translate.split(/\s+/).map((v) => parseFloat(v) || 0);
  const sc = s.scale === 'none' ? 1 : parseFloat(s.scale);
  const ro = s.rotate === 'none' ? 0 : parseFloat(s.rotate);
  // Colours as the screen shows them: a canvas turns any CSS colour (oklab, color(), hex) into sRGB bytes.
  const w = window as unknown as { __px?: CanvasRenderingContext2D };
  w.__px ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })!;
  const rgba = (c: string) => {
    w.__px!.clearRect(0, 0, 1, 1);
    w.__px!.fillStyle = '#000';
    w.__px!.fillStyle = c;
    w.__px!.fillRect(0, 0, 1, 1);
    // Premultiplied, as browsers blend: a transparent colour has no hue.
    const [r, g, b, a] = w.__px!.getImageData(0, 0, 1, 1).data;
    return [(r * a) / 255, (g * a) / 255, (b * a) / 255, a];
  };
  const bg = rgba(s.backgroundColor);
  const fg = rgba(s.color);
  return {
    bgR: bg[0], bgG: bg[1], bgB: bg[2], bgA: bg[3], fgR: fg[0], fgG: fg[1], fgB: fg[2],
    opacity: Number(s.opacity),
    tx: m.e + (tr[0] ?? 0),
    ty: m.f + (tr[1] ?? 0),
    scale: Math.hypot(m.a, m.b) * sc,
    rotate: (Math.atan2(m.b, m.a) * 180) / Math.PI + ro,
  };
}

const settle = (page: Page, ms: number) => page.evaluate((ms) => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ms)))), ms);

/** Scrolls through a range and reads the settled state at each position. */
async function traceScroll(page: Page, selector: string, from: number, to: number, step = 10): Promise<Trace> {
  const out: Trace = [];
  for (let y = Math.max(0, from); y <= to; y += step) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await settle(page, 60);
    const [sy, st] = await page.evaluate((sel) => [Math.round(window.scrollY), (window as unknown as { __read: (e: Element) => State }).__read(document.querySelector(sel)!)] as const, selector);
    out.push([sy, st]);
  }
  return out;
}

/** Samples every frame while `act` runs and for `ms` after; x = ms since the element first changed. */
async function traceTime(page: Page, selector: string, act: () => Promise<void>, ms: number): Promise<Trace> {
  await page.evaluate((sel) => {
    const w = window as unknown as { __trace: [number, State][]; __stop: boolean; __read: (e: Element) => State };
    w.__trace = [];
    w.__stop = false;
    const el = document.querySelector(sel)!;
    // The frame's own timestamp: animations are computed for it, not for when the callback ran.
    const tick = (now: number) => {
      if (w.__stop) return;
      w.__trace.push([now, w.__read(el)]);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, selector);
  // A few frames at rest first, so the trace starts from the resting value whatever runs first in a frame.
  await settle(page, 50);
  await act();
  await page.waitForTimeout(ms);
  const raw = await page.evaluate(() => {
    const w = window as unknown as { __trace: [number, State][]; __stop: boolean };
    w.__stop = true;
    return w.__trace;
  });
  const first = raw.findIndex(([, s], i) => i > 0 && PROPS.some((p) => Math.abs(s[p] - raw[i - 1][1][p]) > 1e-4));
  if (first < 0) return [];
  const t0 = raw[first - 1][0];
  return raw.slice(first - 1).map(([t, s]) => [t - t0, s]);
}

/** Linear interpolation of a trace at x. */
function at(trace: Trace, x: number): State {
  if (x <= trace[0][0]) return trace[0][1];
  for (let i = 1; i < trace.length; i++) {
    if (x <= trace[i][0]) {
      const [x0, a] = trace[i - 1];
      const [x1, b] = trace[i];
      const k = x1 === x0 ? 1 : (x - x0) / (x1 - x0);
      return Object.fromEntries(PROPS.map((p) => [p, a[p] + (b[p] - a[p]) * k])) as State;
    }
  }
  return trace[trace.length - 1][1];
}

/** Largest difference between two traces over the original's x range, relative to how far each property moves. */
function diffAt(original: Trace, replica: Trace, shift: number, gap: number, props: (keyof State)[] = PROPS): number {
  // Only where the other trace was actually drawn nearby: a browser that skips frames leaves a gap,
  // and a straight line across it is not what either page showed.
  const near = (trace: Trace, x: number) => trace.some(([tx]) => Math.abs(tx - x) <= gap);
  let worst = 0;
  for (const p of props) {
    const vals = original.map(([, s]) => s[p]);
    const range = Math.max(...vals) - Math.min(...vals);
    if (range < 1e-3) continue;
    for (const [x, s] of original) if (near(replica, x + shift)) worst = Math.max(worst, Math.abs(at(replica, x + shift)[p] - s[p]) / range);
    for (const [x, s] of replica) if (near(original, x - shift)) worst = Math.max(worst, Math.abs(at(original, x - shift)[p] - s[p]) / range);
  }
  return worst;
}

/** One frame at 60 Hz: when within a frame an effect is drawn is the browser's timing, not the effect's. */
const FRAME_MS = 17;

/** Largest gap, relative to the property's travel, between a value one trace drew and the closest the other drew within `window`. */
function tube(a: Trace, b: Trace, p: keyof State, range: number, window: number): number {
  // b's value at t, or null inside a gap where the browser skipped frames (nothing was drawn there).
  const drawn = (t: number): number | null => {
    if (t <= b[0][0]) return b[0][1][p];
    for (let i = 1; i < b.length; i++) {
      if (t > b[i][0]) continue;
      const [x0, s0] = b[i - 1];
      const [x1, s1] = b[i];
      if (x1 - x0 > 1.5 * FRAME_MS) return Math.min(t - x0, x1 - t) <= 1 ? (t - x0 < x1 - t ? s0[p] : s1[p]) : null;
      return s0[p] + (s1[p] - s0[p]) * ((t - x0) / (x1 - x0 || 1));
    }
    return b[b.length - 1][1][p];
  };
  let worst = 0;
  for (const [x, s] of a) {
    let best = Infinity;
    for (let d = -window; d <= window; d++) {
      const v = drawn(x + d);
      if (v !== null) best = Math.min(best, Math.abs(v - s[p]));
    }
    if (best !== Infinity) worst = Math.max(worst, best / range);
  }
  return worst;
}

/**
 * Difference between the site's trace and the replica's, relative to how far each property moves.
 * Scroll traces are compared position by position. Time traces are compared frame by frame: each
 * drawn value must match one the other page drew within a frame (17ms), both ways.
 */
export function difference(originalRaw: Trace, replicaRaw: Trace, timed = false): number | null {
  if (originalRaw.length < 2 || replicaRaw.length < 2) return null;
  // Movement from where the element rests: a static offset the element always has on the site (a
  // translate, a centring transform) is its layout, not the effect, and the blank stage doesn't have it.
  const relative = (trace: Trace): Trace => {
    const r = trace[0][1];
    return trace.map(([x, s]) => [x, { ...s, tx: s.tx - r.tx, ty: s.ty - r.ty, scale: s.scale / (r.scale || 1), rotate: s.rotate - r.rotate }]);
  };
  const original = relative(originalRaw);
  const replica = relative(replicaRaw);
  if (!timed) return Math.round(diffAt(original, replica, 0, 10) * 1000) / 1000;
  const score = (rep: Trace) => {
    let worst = 0;
    for (const p of PROPS) {
      const vals = original.map(([, s]) => s[p]);
      const range = Math.max(...vals) - Math.min(...vals);
      if (range < 1e-3) continue;
      worst = Math.max(worst, tube(original, rep, p, range, FRAME_MS), tube(rep, original, p, range, FRAME_MS));
    }
    return worst;
  };
  // How soon a page reacts to the pointer or the scroll (an event, a frame of a library's loop) is not
  // the motion: take out a constant start delay of up to START_MS first, then compare frame by frame.
  let best = Infinity;
  for (let d = -START_MS; d <= START_MS; d += 2) best = Math.min(best, score(replica.map(([x, st]) => [x - d, st] as [number, State])));
  return Math.round(best * 1000) / 1000;
}

/** Start delays up to this are a page's reaction time, not its motion. */
const START_MS = 50;

/** A blank page as tall as the site, with one box where the element was and the effect's code on it. */
/** The element's own resting colours on the site: the code is meant for that element, which has them. */
type Rest = { background: string; color: string };

async function stage(browser: Browser, entry: ReplicaEntry, height: number, kind: 'css' | 'gsap' | 'motion', rest: Rest): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const r = entry.rect!;
  if (kind === 'motion') {
    // The component the export defines, rendered as the box: <Name id="t" style={…} />.
    const name = entry.motion.match(/export function (\w+)/)?.[1];
    const src = `import React from "react";\nimport { cubicBezier, motion, useScroll, useTransform } from "motion/react";\nimport { createRoot } from "react-dom/client";\n${entry.motion}\ncreateRoot(document.getElementById("root")).render(<${name} id="t" style={{ position: "absolute", left: ${r.x}, top: ${r.y}, width: ${r.width}, height: ${r.height}, background: "${rest.background}", color: "${rest.color}" }} />);\nwindow.__ready = true;`;
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{height:${height}px;position:relative}</style><script type="importmap">${JSON.stringify({ imports: MOTION_IMPORTS })}</script><script src="${BABEL}"></script></head>
<body><div id="root"></div><script type="text/babel" data-type="module" data-presets="react">${src.replace(/<\/script/g, '<\\/script')}</script></body></html>`);
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready && document.getElementById('t'), null, { timeout: 30_000 });
    await page.addScriptTag({ content: `window.__read = ${readState.toString()};` });
    return { page, close: () => context.close() };
  }
  const code = (kind === 'css' ? entry.css : entry.gsap).split(entry.selector).join('#t');
  const gsapCode = code.replace(/^import .*$/gm, '');
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{height:${height}px;position:relative}#t{position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:${rest.background};color:${rest.color}}${kind === 'css' ? code : ''}</style>
${kind === 'gsap' ? `<script src="${GSAP}/gsap.min.js"></script><script src="${GSAP}/ScrollTrigger.min.js"></script><script src="${GSAP}/CustomEase.min.js"></script>` : ''}</head>
<body><div id="t"></div>${kind === 'gsap' ? `<script>gsap.registerPlugin(ScrollTrigger, CustomEase);\n${gsapCode}</script>` : ''}
${kind === 'css' && entry.trigger === 'scroll-reveal' ? `<script>new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible')), { rootMargin: '0px 0px -15% 0px' }).observe(document.getElementById('t'));</script>` : ''}</body></html>`);
  await page.addScriptTag({ content: `window.__read = ${readState.toString()};` });
  return { page, close: () => context.close() };
}

/** Measures one effect on a page (the site, or a stage where the element is `#t`). */
async function measure(page: Page, selector: string, entry: ReplicaEntry): Promise<Trace> {
  const dur = (entry.spec?.durationMs ?? 600) + (entry.spec?.delayMs ?? 0);
  if (entry.trigger === 'scroll-linked' && entry.scroll) {
    const pad = Math.max(100, (entry.scroll.end - entry.scroll.start) * 0.2);
    return traceScroll(page, selector, entry.scroll.start - pad, entry.scroll.end + pad);
  }
  if (entry.trigger === 'hover') {
    await page.mouse.move(2, 2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(selector).first().scrollIntoViewIfNeeded({ timeout: 5000 });
    await settle(page, 400);
    const box = await page.locator(selector).first().boundingBox();
    if (!box) return [];
    return traceTime(page, selector, () => page.mouse.move(box.x + box.width / 2, box.y + box.height / 2), dur + 400);
  }
  if (entry.trigger === 'scroll-reveal') {
    // Scroll down in small steps until the effect starts, then hold still while it plays.
    return traceTime(
      page,
      selector,
      async () => {
        for (let i = 0; i < 400; i++) {
          const started = await page.evaluate(() => {
            const w = window as unknown as { __trace: [number, State][] };
            const t = w.__trace;
            return t.length > 1 && JSON.stringify(t[t.length - 1][1]) !== JSON.stringify(t[0][1]);
          });
          if (started) break;
          await page.evaluate(() => window.scrollBy(0, 30));
          await page.waitForTimeout(40);
        }
      },
      dur + 400,
    );
  }
  return [];
}

export async function verifyMotion(zip: Uint8Array, browser: Browser, log: (s: string) => void = () => {}): Promise<{ url: string; effects: EffectCheck[]; traces?: unknown[] }> {
  // SPECIMEN_VERIFY_TRACES=1 keeps every measured trace in the report, to look at a failing effect.
  const traces: unknown[] = [];
  const files = unzipSync(zip);
  const manifest = JSON.parse(strFromU8(files['manifest.json'])) as { url: string };
  const replication = files['exports/code/replication.json'] ? (JSON.parse(strFromU8(files['exports/code/replication.json'])) as { section: string; replicas: ReplicaEntry[] }[]) : [];
  const effects: EffectCheck[] = [];
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    for (const { section, replicas } of replication) {
      for (const entry of replicas) {
        // SPECIMEN_VERIFY_ONLY=<regex> checks only the effects whose id matches (to look at one again).
        if (process.env.SPECIMEN_VERIFY_ONLY && !new RegExp(process.env.SPECIMEN_VERIFY_ONLY).test(entry.id)) continue;
        const base = { section, id: entry.id, name: entry.name, trigger: entry.trigger, selector: entry.selector, claimed: entry.score };
        if (!entry.inCode) {
          effects.push({ ...base, css: null, gsap: null, motion: null, note: 'left out of the code (the recording is the reference)' });
          continue;
        }
        if (entry.trigger === 'loop' || entry.trigger === 'load' || !entry.rect) {
          effects.push({ ...base, css: null, gsap: null, motion: null, note: entry.rect ? "the page's own keyframes, copied as written" : 'no element box' });
          continue;
        }
        log(`${section} · ${entry.name}`);
        // The site, fresh for each effect: reveals play once per load.
        const site = await context.newPage();
        let original: Trace = [];
        let height = 0;
        try {
          await site.goto(manifest.url, { waitUntil: 'load', timeout: 90_000 });
          await site.waitForTimeout(2500);
          await site.addScriptTag({ content: `window.__read = ${readState.toString()};` });
          height = await site.evaluate(() => document.documentElement.scrollHeight);
          const el = site.locator(entry.selector).first();
          if (!(await el.count()) || !(await el.isVisible())) {
            effects.push({ ...base, css: null, gsap: null, motion: null, note: 'not visible on the page at rest (in a closed menu or carousel)' });
            continue;
          }
          original = await measure(site, entry.selector, entry);
        } catch (err) {
          effects.push({ ...base, css: null, gsap: null, motion: null, note: `site: ${err instanceof Error ? err.message.split('\n')[0] : err}` });
          continue;
        } finally {
          await site.close();
        }
        if (original.length < 2) {
          effects.push({ ...base, css: null, gsap: null, motion: null, note: 'did not move on the live site this time' });
          continue;
        }
        const result: Record<'css' | 'gsap' | 'motion', number | null> = { css: null, gsap: null, motion: null };
        for (const kind of ['css', 'gsap', 'motion'] as const) {
          if (!entry[kind]?.trim()) continue;
          const r0 = original[0][1];
          const un = (c: number, a: number) => (a ? Math.round((c * 255) / a) : 0);
          const rest: Rest = { background: `rgba(${un(r0.bgR, r0.bgA)}, ${un(r0.bgG, r0.bgA)}, ${un(r0.bgB, r0.bgA)}, ${r0.bgA / 255})`, color: `rgb(${Math.round(r0.fgR)}, ${Math.round(r0.fgG)}, ${Math.round(r0.fgB)})` };
          // A headless browser sometimes stalls a frame (a first animation, a garbage collection). That
          // doesn't repeat; a real difference in the code does. So up to TRIES runs, the best one kept.
          for (let attempt = 0; attempt < TRIES && (result[kind] === null || result[kind]! > EXACT); attempt++) {
            const s = await stage(browser, entry, height, kind, rest);
            try {
              const replica = await measure(s.page, '#t', entry);
              const d = difference(original, replica, entry.trigger !== 'scroll-linked');
              if (d !== null && (result[kind] === null || d < result[kind]!)) {
                result[kind] = d;
                if (process.env.SPECIMEN_VERIFY_TRACES) traces.push({ id: entry.id, kind, original, replica });
              }
            } finally {
              await s.close();
            }
          }
        }
        effects.push({ ...base, ...result, note: '' });
      }
    }
  } finally {
    await context.close();
  }
  return { url: manifest.url, effects, ...(traces.length ? { traces } : {}) };
}
