import { describe, expect, it } from 'vitest';
import { evaluateBezier, type Sample } from '@specimen/core';
import { fitEasing, isTrustworthy, replicate, replicaFiles, springAt, toAfterEffectsScript, type ProgressSample } from '../src';

const curve = (f: (u: number) => number, n = 30): ProgressSample[] => Array.from({ length: n + 1 }, (_, i) => [i / n, f(i / n)]);

describe('fitEasing', () => {
  it('recognises a named easing', () => {
    const fit = fitEasing(curve((u) => evaluateBezier([0, 0, 0.58, 1], u)), 600);
    expect(fit).toMatchObject({ kind: 'named', css: 'ease-out' });
    expect(fit.score).toBeGreaterThan(0.99);
  });
  it('recovers a custom cubic-bezier', () => {
    const fit = fitEasing(curve((u) => evaluateBezier([0.2, 0.8, 0.2, 1], u)), 300);
    expect(fit.kind).toBe('bezier');
    expect(fit.score).toBeGreaterThan(0.995);
    // Different control points can draw the same curve; compare the curve, not the numbers.
    for (const u of [0.1, 0.3, 0.6]) expect(evaluateBezier(fit.bezier!, u)).toBeCloseTo(evaluateBezier([0.2, 0.8, 0.2, 1], u), 2);
  });
  it('chooses a spring for overshooting motion', () => {
    const fit = fitEasing(curve((u) => springAt(u * 0.8, 300, 12)), 800);
    expect(fit.kind).toBe('spring');
    expect(fit.score).toBeGreaterThan(0.99);
    expect(fit.css).toMatch(/^linear\(0 0%, /);
  });
});

describe('replicate', () => {
  // A fade-and-slide reveal recorded every 16ms: 600ms ease-out from opacity 0 / y 24 to 1 / 0.
  const samples = (to: (p: number) => string, from: string): Sample[] => {
    const out: Sample[] = [[0, 0, from], [100, 400, from]];
    for (let t = 16; t <= 608; t += 16) out.push([100 + t, 400, to(evaluateBezier([0, 0, 0.58, 1], Math.min(1, t / 600)))]);
    return out;
  };
  const input = {
    animations: [],
    interactions: [],
    tracks: [
      { selector: '#pricing > h2', prop: 'opacity', kind: 'scroll-reveal' as const, samples: samples((p) => String(p), '0') },
      { selector: '#pricing > h2', prop: 'transform', kind: 'scroll-reveal' as const, samples: samples((p) => `matrix(1, 0, 0, 1, 0, ${24 * (1 - p)})`, 'matrix(1, 0, 0, 1, 0, 24)') },
    ],
  };

  it('fits a scroll reveal and writes CSS, GSAP and Motion code', () => {
    const [r] = replicate(input, 'pricing');
    expect(r).toMatchObject({ trigger: 'scroll-reveal', source: 'fitted', selector: '#pricing > h2' });
    expect(r.spec!.durationMs).toBeGreaterThan(590);
    expect(r.spec!.durationMs).toBeLessThan(625);
    expect(r.score).toBeGreaterThan(0.97);
    expect(r.spec!.tracks.ty!.map((k) => k.value)).toEqual([24, 0]);
    expect(r.css).toContain('#pricing > h2.is-visible');
    expect(r.css).toMatch(/transition: opacity 6\d\dms/);
    expect(r.gsap).toContain('gsap.fromTo("#pricing > h2", {"opacity":0,"y":24}');
    expect(r.motion).toContain('whileInView={{"opacity":1,"y":0}}');
    const files = replicaFiles([r]);
    expect(files.gsap).toContain('gsap.registerPlugin(ScrollTrigger, CustomEase)');
    expect(files.motion).toContain('from "motion/react"');
  });

  it('keeps the page own keyframes and hover values exactly', () => {
    const reps = replicate({
      animations: [{ id: 'a1', kind: 'css-animation', timeline: 'document', name: 'pulse', target: '.pulse', pseudo: null, keyframes: [{ offset: 0, computedOffset: 0, easing: 'ease-in-out', opacity: '1', transform: 'scale(1)' }, { offset: 0.5, computedOffset: 0.5, easing: 'ease-in-out', opacity: '0.4', transform: 'scale(1.4)' }, { offset: 1, computedOffset: 1, easing: 'ease-in-out', opacity: '1', transform: 'scale(1)' }], duration: 1200, delay: 0, iterations: 'infinite', easing: 'linear', direction: 'normal', fill: 'none', playState: 'running', rect: null }],
      interactions: [{ selector: '.btn', label: 'Get started', trigger: 'hover', rect: { x: 0, y: 0, width: 10, height: 10 }, changes: [{ path: '', prop: 'transform', from: 'none', to: 'matrix(1, 0, 0, 1, 0, -2)' }, { path: '0', prop: 'color', from: 'red', to: 'blue' }], transitions: [{ property: 'transform', duration: 200, delay: 0, easing: 'ease-out' }] }],
      tracks: [],
    });
    expect(reps[0].css).toContain('50% { opacity: 0.4; transform: scale(1.4); animation-timing-function: ease-in-out; }');
    expect(reps[0].css).toContain('animation: fx-1 1200ms linear 0ms infinite normal none;');
    expect(reps[0].gsap).toContain('repeat: -1');
    expect(reps[0].motion).toContain('"scale":[1,1.4,1]');
    expect(reps[1].css).toContain('.btn:hover {\n  transform: matrix(1, 0, 0, 1, 0, -2);\n}');
    expect(reps[1].css).toContain('.btn:hover > :nth-child(1) {\n  color: blue;\n}');
    expect(reps[1].css).toContain('transition: transform 200ms ease-out;');
    expect(reps[1].motion).toContain('whileHover={{"y":-2}}');
  });
});

describe('generated code from hostile pages', () => {
  it('never turns page text into code', () => {
    const name = 'pwn\nwindow.pwnedCode=1;//*/ */\u2028more';
    const anim = { id: 'a1', kind: 'css-animation' as const, timeline: 'document' as const, name, target: '.x', pseudo: null, keyframes: [{ offset: 0, computedOffset: 0, opacity: '0.5' }, { offset: 1, computedOffset: 1, opacity: '1' }], duration: 1000, delay: 0, iterations: 'infinite' as const, easing: 'linear', direction: 'normal', fill: 'none', playState: 'running', rect: { x: 0, y: 0, width: 1, height: 1 } };
    const hover = { selector: '.y', label: 'evil */ body{} /* \n alert(1)', trigger: 'hover' as const, rect: { x: 0, y: 0, width: 1, height: 1 }, changes: [{ path: '', prop: 'opacity', from: '1', to: '0.5' }], transitions: [{ property: 'opacity', duration: 100, delay: 0, easing: 'ease' }] };
    const reps = replicate({ animations: [anim], interactions: [hover], tracks: [] });
    const g = globalThis as unknown as { window: unknown; pwnedCode?: number };
    g.window = g;
    const gsap = { set() {}, to() {}, timeline: () => ({ to() { return this; } }) };
    for (const r of reps) new Function('gsap', 'CustomEase', 'document', r.gsap)(gsap, { create() {} }, { querySelectorAll: () => [] });
    expect(g.pwnedCode).toBeUndefined();
    for (const r of reps) {
      // Every comment stays one comment.
      for (const line of r.gsap.split('\n').concat(r.motion.split('\n'))) if (line.includes('pwn')) expect(line.startsWith('//')).toBe(true);
      expect(r.css.match(/\/\*/g)?.length).toBe(r.css.match(/\*\//g)?.length);
    }
  });

  it('keeps After Effects strings on one line', () => {
    const script = toAfterEffectsScript([{ name: 'a\u2028b\u2029c', width: 1, height: 1, background: null, layers: [] }]);
    expect(script).toContain('"a\\u2028b\\u2029c"');
    expect(script).not.toMatch(/[\u2028\u2029]/);
  });
});

describe('poor fits', () => {
  it('are kept with their score but not written as code', () => {
    // A value that jumps around with scroll: no straight line describes it.
    const samples: [number, number, string][] = Array.from({ length: 20 }, (_, i) => [i * 100, i * 300, String(i % 2)]);
    const reps = replicate({ animations: [], interactions: [], tracks: [{ selector: '#p', prop: 'opacity', kind: 'scroll-linked', samples }] });
    expect(reps[0].score).toBeLessThan(0.8);
    expect(isTrustworthy(reps[0])).toBe(false);
    expect(replicaFiles(reps).css).not.toContain('#p');
  });
});

describe('scroll-linked motion', () => {
  const linked = (samples: Sample[]) => replicate({ animations: [], interactions: [], tracks: [{ selector: '#hero', prop: 'transform', kind: 'scroll-linked', samples }] }, 'hero')[0];
  it('measures a parallax from dense samples and writes scroll-driven code', () => {
    // -140px over the first 900px of scroll, measured every 24px: the end (900) falls between two samples.
    const samples: Sample[] = Array.from({ length: 51 }, (_, i) => [i * 100, i * 24, `matrix(1, 0, 0, 1, 0, ${-Math.min(900, i * 24) * (140 / 900)})`]);
    const r = linked(samples);
    expect(r).toMatchObject({ trigger: 'scroll-linked', scroll: { start: 0, end: 900 } });
    expect(r.score).toBeGreaterThan(0.99);
    expect(r.css).toContain('animation-timeline: scroll(root)');
    expect(r.gsap).toContain('scrub: true');
    expect(r.motion).toContain('useTransform(scrollY, [0, 900]');
  });
  it('fits an eased scrub', () => {
    const samples: Sample[] = Array.from({ length: 41 }, (_, i) => [i * 100, i * 25, String(evaluateBezier([0.42, 0, 0.58, 1], i / 40))]);
    const r = replicate({ animations: [], interactions: [], tracks: [{ selector: '#x', prop: 'opacity', kind: 'scroll-linked', samples }] }, 'x')[0];
    expect(r.easing!.css).toBe('ease-in-out');
    expect(r.score).toBeGreaterThan(0.99);
    expect(r.motion).toContain('ease: cubicBezier(0.42, 0, 0.58, 1)');
  });
  it('claims no match from three points, and leaves the effect out of the code', () => {
    const r = linked([[118, 0, 'none'], [129, 450, 'matrix(1, 0, 0, 1, 0, -70)'], [306, 900, 'matrix(1, 0, 0, 1, 0, -140)']]);
    expect(r.score).toBe(0);
    expect(isTrustworthy(r)).toBe(false);
  });
});

describe('a reveal that only moves on its transform', () => {
  it('writes a transition for it (never an empty one)', () => {
    const out: Sample[] = [[0, 0, 'none'], [100, 400, 'none']];
    for (let t = 16; t <= 400; t += 16) out.push([100 + t, 400, `matrix(1, 0, 0, 1, 0, ${-40 * evaluateBezier([0, 0, 0.58, 1], Math.min(1, t / 400))})`]);
    const [r] = replicate({ animations: [], interactions: [], tracks: [{ selector: '#c', prop: 'transform', kind: 'scroll-reveal', samples: out }] }, 'c');
    expect(r.css).toMatch(/transition: transform \d+ms/);
    expect(r.css).not.toContain('transition: ;');
  });
});

describe('a scroll-linked element whose properties move over different ranges', () => {
  it('keeps each range and curve', () => {
    // Moves -140px over 0–900px while fading out over 0–350px, measured every 49px.
    const ys = Array.from({ length: 23 }, (_, i) => i * 49);
    const tracks = [
      { selector: '#hero', prop: 'transform', kind: 'scroll-linked' as const, samples: ys.map((y, i): Sample => [i * 100, y, `matrix(1, 0, 0, 1, 0, ${-140 * Math.min(1, y / 900)})`]) },
      { selector: '#hero', prop: 'opacity', kind: 'scroll-linked' as const, samples: ys.map((y, i): Sample => [i * 100, y, String(Math.max(0, 1 - y / 350))]) },
    ];
    const [r] = replicate({ animations: [], interactions: [], tracks }, 'hero');
    expect(r.ranges!.ty).toMatchObject({ start: 0, end: 900, from: 0, to: -140, easing: 'linear' });
    expect(r.ranges!.opacity).toMatchObject({ start: 0, end: 350, from: 1, to: 0, easing: 'linear' });
    expect(r.score).toBeGreaterThan(0.99);
    expect(r.css).toContain('animation-range: 0px 900px, 0px 350px');
    expect(r.gsap).toContain('{ opacity: 0, ease: "none", scrollTrigger: { start: 0, end: 350, scrub: true } }');
    expect(r.motion).toContain('useTransform(scrollY, [0, 350], [1, 0])');
  });
});
