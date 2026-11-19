import { downsample, evaluateBezier } from '@specimen/core';

export type Bezier = [number, number, number, number];

export interface EasingFit {
  kind: 'named' | 'bezier' | 'spring';
  /** CSS easing: a keyword, cubic-bezier(…) or linear(…) for springs. */
  css: string;
  bezier: Bezier | null;
  spring: { stiffness: number; damping: number; mass: number } | null;
  /** 1 − RMS error of normalised progress; 1 is a perfect match. */
  score: number;
}

/** Normalised progress samples: u = time 0–1, p = value 0–1 (may overshoot for springs). */
export type ProgressSample = [u: number, p: number];

const NAMED: [string, Bezier][] = [
  ['linear', [0, 0, 1, 1]],
  ['ease', [0.25, 0.1, 0.25, 1]],
  ['ease-in', [0.42, 0, 1, 1]],
  ['ease-out', [0, 0, 0.58, 1]],
  ['ease-in-out', [0.42, 0, 0.58, 1]],
];
/** A named easing within this error is preferred to a custom curve: same motion, cleaner code. */
const NAMED_TOLERANCE = 0.01;

function rms(samples: ProgressSample[], f: (u: number) => number): number {
  let sum = 0;
  for (const [u, p] of samples) sum += (f(u) - p) ** 2;
  return Math.sqrt(sum / samples.length);
}

/** Minimises `cost` from `start` with Nelder–Mead. */
function nelderMead(cost: (x: number[]) => number, start: number[], step: number, iterations = 300): number[] {
  const n = start.length;
  let simplex = [start, ...start.map((_, i) => start.map((v, j) => (i === j ? v + step : v)))].map((x) => ({ x, c: cost(x) }));
  for (let it = 0; it < iterations; it++) {
    simplex.sort((a, b) => a.c - b.c);
    const best = simplex[0];
    const worst = simplex[n];
    const centroid = Array.from({ length: n }, (_, d) => simplex.slice(0, n).reduce((s, p) => s + p.x[d], 0) / n);
    const along = (t: number) => centroid.map((c, d) => c + t * (worst.x[d] - c));
    const r = along(-1);
    const rc = cost(r);
    if (rc < best.c) {
      const e = along(-2);
      const ec = cost(e);
      simplex[n] = ec < rc ? { x: e, c: ec } : { x: r, c: rc };
    } else if (rc < simplex[n - 1].c) simplex[n] = { x: r, c: rc };
    else {
      const k = along(0.5);
      const kc = cost(k);
      if (kc < worst.c) simplex[n] = { x: k, c: kc };
      else simplex = simplex.map((p) => (p === best ? p : { x: p.x.map((v, d) => best.x[d] + (v - best.x[d]) / 2), c: 0 })).map((p) => ({ x: p.x, c: cost(p.x) }));
    }
    if (Math.abs(simplex[n].c - simplex[0].c) < 1e-9) break;
  }
  simplex.sort((a, b) => a.c - b.c);
  return simplex[0].x;
}

/** Damped spring progress (from 0 to 1) at time t seconds. */
export function springAt(t: number, stiffness: number, damping: number, mass = 1): number {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

/** CSS `linear()` easing that traces a spring over `durationMs`. */
export function springToLinear(stiffness: number, damping: number, mass: number, durationMs: number, points = 24): string {
  const stops = Array.from({ length: points + 1 }, (_, i) => {
    const u = i / points;
    const v = i === points ? 1 : springAt((u * durationMs) / 1000, stiffness, damping, mass);
    return `${round(v, 4)} ${round(u * 100, 2)}%`;
  });
  return `linear(${stops.join(', ')})`;
}

/**
 * Finds the easing that best reproduces the samples: a named CSS easing when one is within tolerance,
 * else a fitted cubic-bezier, or a spring when the motion overshoots and a spring fits better.
 */
export function fitEasing(samples: ProgressSample[], durationMs: number): EasingFit {
  // 40 points describe an easing curve fully and keep the grid search fast.
  const sorted = downsample([...samples].sort((a, b) => a[0] - b[0]), 40);
  const bezierCost = (b: number[]) => {
    const [x1, y1, x2, y2] = [clamp(b[0], 0, 1), b[1], clamp(b[2], 0, 1), b[3]];
    return rms(sorted, (u) => evaluateBezier([x1, y1, x2, y2], u));
  };

  for (const [name, b] of NAMED) {
    const err = bezierCost(b);
    if (err < NAMED_TOLERANCE) return { kind: 'named', css: name, bezier: b, spring: null, score: round(1 - err, 4) };
  }

  // Coarse grid, then refine the best point.
  let best: number[] = [0.25, 0.1, 0.25, 1];
  let bestCost = bezierCost(best);
  for (let x1 = 0; x1 <= 1; x1 += 0.1)
    for (let x2 = 0; x2 <= 1; x2 += 0.1)
      for (let y1 = -0.2; y1 <= 1.4; y1 += 0.2)
        for (let y2 = -0.2; y2 <= 1.4; y2 += 0.2) {
          const c = bezierCost([x1, y1, x2, y2]);
          if (c < bestCost) {
            bestCost = c;
            best = [x1, y1, x2, y2];
          }
        }
  const refined = nelderMead(bezierCost, best, 0.05);
  const bezier = [clamp(refined[0], 0, 1), refined[1], clamp(refined[2], 0, 1), refined[3]].map((v) => round(v, 3)) as Bezier;
  const bezierErr = bezierCost(bezier);

  const overshoots = sorted.some(([, p]) => p > 1.02);
  if (overshoots && durationMs > 0) {
    const T = durationMs / 1000;
    const springCost = (s: number[]) => (s[0] <= 0 || s[1] <= 0 ? 1e9 : rms(sorted, (u) => springAt(u * T, s[0], s[1])));
    let sBest = [170, 26];
    let sCost = springCost(sBest);
    for (let k = 20; k <= 800; k += 20)
      for (let c = 2; c <= 80; c += 2) {
        const cost = springCost([k, c]);
        if (cost < sCost) {
          sCost = cost;
          sBest = [k, c];
        }
      }
    const s = nelderMead(springCost, sBest, 5);
    const springErr = springCost(s);
    if (springErr < bezierErr) {
      const spring = { stiffness: round(s[0], 1), damping: round(s[1], 2), mass: 1 };
      return { kind: 'spring', css: springToLinear(spring.stiffness, spring.damping, 1, durationMs), bezier: null, spring, score: round(1 - springErr, 4) };
    }
  }
  return { kind: 'bezier', css: `cubic-bezier(${bezier.join(', ')})`, bezier, spring: null, score: round(Math.max(0, 1 - bezierErr), 4) };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
