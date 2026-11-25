import { describe, expect, it } from 'vitest';
import { classifyTrack, diffSnapshots, followsPointer, downsample, numericValue, parseTransform, type StyleSnapshot, type Track } from '../src/motion-math';

describe('parseTransform', () => {
  it('reads identity and translation', () => {
    expect(parseTransform('none')).toEqual({ tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0 });
    expect(parseTransform('matrix(1, 0, 0, 1, 12, -40)')).toMatchObject({ tx: 12, ty: -40, sx: 1, sy: 1 });
  });
  it('reads scale and rotation', () => {
    const r = Math.PI / 4;
    const t = parseTransform(`matrix(${2 * Math.cos(r)}, ${2 * Math.sin(r)}, ${-2 * Math.sin(r)}, ${2 * Math.cos(r)}, 0, 0)`);
    expect(t.sx).toBeCloseTo(2);
    expect(t.sy).toBeCloseTo(2);
    expect(t.rotate).toBeCloseTo(45);
  });
  it('reads matrix3d', () => {
    expect(parseTransform('matrix3d(1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1, 0, 10, 20, 0, 1)')).toMatchObject({ tx: 10, ty: 20, sx: 1.5, sy: 1.5 });
  });
});

describe('numericValue', () => {
  it('parses numbers and ignores colours', () => {
    expect(numericValue('opacity', '0.5')).toBe(0.5);
    expect(numericValue('top', '12px')).toBe(12);
    expect(numericValue('color', 'rgb(0, 0, 0)')).toBeNull();
  });
});

describe('classifyTrack', () => {
  const track = (samples: [number, number, string][]): Track => ({ selector: 'x', prop: 'opacity', samples });
  it('finds scroll reveals', () => {
    // As the tracer records one: the page steps to 450px and holds; the fade plays out frame by frame.
    expect(classifyTrack(track([[0, 0, '0'], [130, 450, '0.2'], [146, 450, '0.5'], [163, 450, '0.8'], [180, 450, '1']]), 900)).toBe('scroll-reveal');
  });
  it('finds parallax seen at only a few scroll steps', () => {
    // A hero that moves -140px over the first 900px of scroll: it changes only on each scroll step.
    const hero: [number, number, string][] = [[118, 0, 'none'], [129, 450, 'matrix(1, 0, 0, 1, 0, -70)'], [306, 900, 'matrix(1, 0, 0, 1, 0, -140)']];
    expect(classifyTrack({ selector: 'x', prop: 'transform', samples: hero }, 900)).toBe('scroll-linked');
  });
  it('finds scroll-linked motion', () => {
    const samples: [number, number, string][] = Array.from({ length: 20 }, (_, i) => [i * 100, i * 200, String(i)]);
    expect(classifyTrack(track(samples), 900)).toBe('scroll-linked');
  });
  it('treats a loop that runs during the whole scroll as time-based', () => {
    // Value changes every 50ms for 5s; scroll moves only every 4th sample.
    const samples: [number, number, string][] = Array.from({ length: 100 }, (_, i) => [i * 50, Math.floor(i / 4) * 300, String(i % 7)]);
    expect(classifyTrack(track(samples), 900)).toBe('time');
  });
  it('finds time-based motion', () => {
    expect(classifyTrack(track([[0, 0, '0'], [100, 0, '0.5'], [200, 0, '1']]), 900)).toBe('time');
  });
});

describe('diffSnapshots', () => {
  it('lists only changed properties', () => {
    const before: StyleSnapshot[] = [{ path: '', props: { color: 'red', opacity: '1' } }, { path: '0', props: { color: 'blue' } }];
    const after: StyleSnapshot[] = [{ path: '', props: { color: 'red', opacity: '0.8' } }, { path: '0', props: { color: 'green' } }];
    expect(diffSnapshots(before, after)).toEqual([
      { path: '', prop: 'opacity', from: '1', to: '0.8' },
      { path: '0', prop: 'color', from: 'blue', to: 'green' },
    ]);
  });
});

describe('downsample', () => {
  it('keeps first and last', () => {
    const r = downsample(Array.from({ length: 100 }, (_, i) => i), 5);
    expect(r).toEqual([0, 25, 50, 74, 99]);
  });
});

import { cubicBezierOf, evaluateBezier, parseTransformFunctions } from '../src/motion-math';

describe('parseTransformFunctions', () => {
  it('reads transform functions as written in keyframes', () => {
    expect(parseTransformFunctions('translateY(-2px) scale(1.4)')).toEqual({ tx: 0, ty: -2, sx: 1.4, sy: 1.4, rotate: 0 });
    expect(parseTransformFunctions('rotate(0.25turn) translate(10px, 5px)')).toMatchObject({ rotate: 90, tx: 10, ty: 5 });
    expect(parseTransformFunctions('matrix(1, 0, 0, 1, 0, -2)')).toMatchObject({ ty: -2 });
    expect(parseTransformFunctions('none')).toEqual({ tx: 0, ty: 0, sx: 1, sy: 1, rotate: 0 });
  });
});

describe('easing', () => {
  it('maps keywords and evaluates curves', () => {
    expect(cubicBezierOf('ease-out')).toEqual([0, 0, 0.58, 1]);
    expect(cubicBezierOf('cubic-bezier(0.2, 0.8, 0.2, 1)')).toEqual([0.2, 0.8, 0.2, 1]);
    expect(evaluateBezier([0, 0, 1, 1], 0.3)).toBeCloseTo(0.3, 3);
    expect(evaluateBezier(cubicBezierOf('ease-out'), 0.5)).toBeGreaterThan(0.5);
    expect(evaluateBezier(cubicBezierOf('ease-in'), 0)).toBeCloseTo(0);
    expect(evaluateBezier(cubicBezierOf('ease-in'), 1)).toBeCloseTo(1);
  });
});

describe('followsPointer', () => {
  const track = (times: number[]): Track => ({ selector: 'x', prop: 'transform', samples: times.map((t, i) => [t, 0, `translate(${i}px)`]) });
  it('accepts an element that moves throughout the stroke', () => {
    expect(followsPointer(track([0, ...Array.from({ length: 60 }, (_, i) => 600 + i * 33)]), 600, 2600)).toBe(true);
  });
  it('rejects a hover effect that changes in bursts on enter and leave', () => {
    const burst = (at: number) => Array.from({ length: 12 }, (_, i) => at + i * 16);
    expect(followsPointer(track([0, ...burst(900), ...burst(1500), ...burst(2200)]), 600, 2600)).toBe(false);
  });
  it('rejects one short change', () => {
    expect(followsPointer(track([0, 700, 716]), 600, 2600)).toBe(false);
  });
});

describe('easingFunction', () => {
  it('evaluates every CSS easing form', async () => {
    const { easingFunction } = await import('../src/motion-math');
    expect(easingFunction('linear(0, 1.2 60%, 1)')(0.6)).toBeCloseTo(1.2, 6);
    expect(easingFunction('linear(0, 1.2 60%, 1)')(0.3)).toBeCloseTo(0.6, 6);
    expect(easingFunction('linear(0, 0.5, 1)')(0.25)).toBeCloseTo(0.25, 6);
    expect(easingFunction('steps(4, end)')(0.3)).toBe(0.25);
    expect(easingFunction('steps(4, start)')(0.3)).toBe(0.5);
    expect(easingFunction('ease-out')(0.5)).toBeGreaterThan(0.6);
  });
});
