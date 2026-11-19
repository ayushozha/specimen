/** Pure helpers for motion data: parsing, classifying and comparing. No DOM. */

export interface Transform2D {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  /** Degrees. */
  rotate: number;
}

const IDENTITY: Transform2D = { tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0 };

/** Decomposes a computed `transform` (`none`, `matrix(…)` or `matrix3d(…)`) into 2D parts. */
export function parseTransform(value: string): Transform2D {
  const m = value.match(/^matrix(3d)?\(([^)]+)\)$/);
  if (!m) return { ...IDENTITY };
  const n = m[2].split(',').map(Number);
  const [a, b, c, d, e, f] = m[1] ? [n[0], n[1], n[4], n[5], n[12], n[13]] : n;
  const sx = Math.hypot(a, b);
  const rotate = (Math.atan2(b, a) * 180) / Math.PI;
  const sy = sx === 0 ? Math.hypot(c, d) : (a * d - b * c) / sx;
  return { tx: e, ty: f, sx: round(sx), sy: round(sy), rotate: round(rotate) };
}

/** Numeric value of a sample for a property, or null when it is not numeric (colours are compared as strings). */
export function numericValue(prop: string, value: string): number | null {
  if (prop === 'opacity') return Number(value);
  const n = parseFloat(value);
  return Number.isFinite(n) && /^-?[\d.]+(px|deg|%)?$/.test(value.trim()) ? n : null;
}

/** One recorded sample: time (ms since start), page scroll position and the computed value. */
export type Sample = [time: number, scrollY: number, value: string];

export interface Track {
  selector: string;
  prop: string;
  samples: Sample[];
}

export type TrackKind = 'scroll-linked' | 'scroll-reveal' | 'time' | 'pointer';

/** Changes spread over more than this are a loop or autoplay, not a one-off reveal. */
const LOOP_SPAN_MS = 2500;

/**
 * Classifies a track recorded during a scroll pass:
 * - time: it keeps changing while the page is still (loops, autoplay, marquees)
 * - scroll-linked: it changes as the page scrolls, across a long range (parallax, scrubbed timelines)
 * - scroll-reveal: it changes once over a short time, then settles (fade/slide in on entering view)
 */
export function classifyTrack(track: Track, viewportHeight: number): TrackKind {
  const changes: Sample[] = [];
  let whileStill = 0;
  for (let i = 1; i < track.samples.length; i++) {
    const [, y, v] = track.samples[i];
    if (v === track.samples[i - 1][2]) continue;
    changes.push(track.samples[i]);
    if (y === track.samples[i - 1][1]) whileStill++;
  }
  if (changes.length === 0) return 'time';
  const scrollRange = Math.max(...changes.map((s) => s[1])) - Math.min(...changes.map((s) => s[1]));
  const distinctScroll = new Set(changes.map((s) => s[1])).size;
  const span = changes[changes.length - 1][0] - changes[0][0];
  if (distinctScroll <= 1) return 'time';
  if (span > LOOP_SPAN_MS && whileStill / changes.length > 0.5) return 'time';
  return scrollRange > viewportHeight * 1.2 && distinctScroll >= 4 ? 'scroll-linked' : 'scroll-reveal';
}

export interface StyleSnapshot {
  /** Child-index path from the probed element, `""` for the element itself, `::before` for pseudos. */
  path: string;
  props: Record<string, string>;
}

export interface StyleChange {
  path: string;
  prop: string;
  from: string;
  to: string;
}

export function diffSnapshots(before: StyleSnapshot[], after: StyleSnapshot[]): StyleChange[] {
  const out: StyleChange[] = [];
  const byPath = new Map(after.map((s) => [s.path, s.props]));
  for (const b of before) {
    const a = byPath.get(b.path);
    if (!a) continue;
    for (const [prop, from] of Object.entries(b.props)) {
      const to = a[prop];
      if (to !== undefined && to !== from) out.push({ path: b.path, prop, from, to });
    }
  }
  return out;
}

/** Downsamples to at most `max` samples, always keeping the first and last. */
export function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)]);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Reads a specified `transform` (as written in keyframes: `translateY(-2px) scale(1.4)`) or a
 * computed matrix into 2D parts. Unknown functions are ignored.
 */
export function parseTransformFunctions(value: string): Transform2D {
  if (!value || value === 'none') return { ...IDENTITY };
  if (value.startsWith('matrix')) return parseTransform(value);
  const out = { ...IDENTITY };
  const angle = (v: string) => {
    const n = parseFloat(v);
    if (v.endsWith('turn')) return n * 360;
    if (v.endsWith('rad')) return (n * 180) / Math.PI;
    if (v.endsWith('grad')) return n * 0.9;
    return n;
  };
  for (const [, fn, argText] of value.matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/g)) {
    const args = argText.split(/[\s,]+/).filter(Boolean);
    const px = (i: number) => parseFloat(args[i] ?? '0') || 0;
    switch (fn) {
      case 'translate':
        out.tx += px(0);
        out.ty += px(1);
        break;
      case 'translateX':
        out.tx += px(0);
        break;
      case 'translateY':
        out.ty += px(0);
        break;
      case 'translate3d':
        out.tx += px(0);
        out.ty += px(1);
        break;
      case 'scale':
        out.sx *= parseFloat(args[0]);
        out.sy *= parseFloat(args[1] ?? args[0]);
        break;
      case 'scaleX':
        out.sx *= parseFloat(args[0]);
        break;
      case 'scaleY':
        out.sy *= parseFloat(args[0]);
        break;
      case 'rotate':
      case 'rotateZ':
        out.rotate += angle(args[0]);
        break;
    }
  }
  return { tx: round(out.tx), ty: round(out.ty), sx: round(out.sx), sy: round(out.sy), rotate: round(out.rotate) };
}

/** Control points of a CSS easing: keywords and cubic-bezier(); steps() and linear() fall back to linear. */
export function cubicBezierOf(easing: string): [number, number, number, number] {
  const named: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
  };
  if (named[easing.trim()]) return named[easing.trim()];
  const m = easing.match(/cubic-bezier\(([^)]+)\)/);
  if (m) {
    const n = m[1].split(',').map(Number);
    if (n.length === 4 && n.every(Number.isFinite)) return n as [number, number, number, number];
  }
  return named.linear;
}

/** Value of a cubic-bezier easing at progress x (0–1), by Newton/bisection on the x curve. */
export function evaluateBezier([x1, y1, x2, y2]: [number, number, number, number], x: number): number {
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 40; i++) {
    const v = bez(t, x1, x2);
    if (Math.abs(v - x) < 1e-6) break;
    if (v < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return bez(t, y1, y2);
}
