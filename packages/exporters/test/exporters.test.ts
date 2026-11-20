import { describe, expect, it } from 'vitest';
import { evaluateBezier, type AnimationInfo, type LayoutTree, type Palette } from '@specimen/core';
import { namedColors, specFromAnimation, specFromInteraction, toAfterEffectsScript, toAse, toDesignTokens, toLottie, toSvg, toTailwindTheme, valueAt } from '../src';

const pulse: AnimationInfo = {
  id: 'a1', kind: 'css-animation', timeline: 'document', name: 'pulse', target: '.pulse', pseudo: null,
  keyframes: [
    { offset: 0, computedOffset: 0, easing: 'ease-in-out', opacity: '1', transform: 'scale(1)' },
    { offset: 0.5, computedOffset: 0.5, easing: 'ease-in-out', opacity: '0.4', transform: 'scale(1.4)' },
    { offset: 1, computedOffset: 1, easing: 'ease-in-out', opacity: '1', transform: 'scale(1)' },
  ],
  duration: 1200, delay: 0, iterations: 'infinite', easing: 'linear', direction: 'normal', fill: 'none', playState: 'running',
};

describe('animation specs', () => {
  it('reads CSS keyframes into tracks and drops still ones', () => {
    const spec = specFromAnimation({ ...pulse, rect: { x: 0, y: 0, width: 10, height: 10 } });
    expect(spec.trigger).toBe('loop');
    expect(Object.keys(spec.tracks).sort()).toEqual(['opacity', 'scale']);
    expect(spec.tracks.scale!.map((k) => k.value)).toEqual([1, 1.4, 1]);
    expect(valueAt(spec.tracks.opacity!, 0.5, evaluateBezier)).toBeCloseTo(0.4);
    expect(valueAt(spec.tracks.opacity!, 0.25, evaluateBezier)).toBeCloseTo(0.7, 1);
  });

  it('reads a hover transition', () => {
    const spec = specFromInteraction({
      selector: '.btn', label: 'Get started',
      changes: [{ path: '', prop: 'transform', from: 'none', to: 'matrix(1, 0, 0, 1, 0, -2)' }, { path: '0', prop: 'color', from: 'a', to: 'b' }],
      transitions: [{ property: 'transform', duration: 200, delay: 0, easing: 'ease-out' }],
    });
    expect(spec).toMatchObject({ trigger: 'hover', durationMs: 200 });
    expect(spec!.tracks.ty).toEqual([{ offset: 0, value: 0, easing: 'ease-out' }, { offset: 1, value: -2, easing: 'ease-out' }]);
  });
});

describe('Lottie', () => {
  it('builds a valid image-layer animation', () => {
    const lottie = toLottie(specFromAnimation(pulse), { dataUrl: 'data:image/png;base64,AAAA', width: 10, height: 10 }) as any;
    expect(lottie).toMatchObject({ fr: 30, ip: 0, op: 36, w: 14, h: 14 });
    expect(lottie.layers[0].ks.s.a).toBe(1);
    expect(lottie.layers[0].ks.s.k.map((k: any) => k.s[0])).toEqual([100, 140, 100]);
    expect(lottie.layers[0].ks.o.k[0]).toMatchObject({ t: 0, s: [100], o: { x: [0.42], y: [0] }, i: { x: [0.58], y: [1] } });
    expect(lottie.layers[0].ks.p).toEqual({ a: 0, k: [7, 7, 0] });
  });
});

describe('After Effects script', () => {
  const script = toAfterEffectsScript([
    { name: 'Hero', width: 1440, height: 900, background: 'hero.png', layers: [{ name: 'pulse', image: 'pulse.png', x: 100, y: 50, width: 10, height: 10, spec: specFromAnimation(pulse) }] },
  ]);
  it('is ES3 that parses', () => {
    expect(() => new Function(script)).not.toThrow();
    expect(script).not.toMatch(/=>|\blet\b|\bconst\b|`/);
  });
  it('keys each property with easing and loops endless animations', () => {
    expect(script).toContain('addComp("Hero", 1440, 900, 1, 1.200, 30)');
    expect(script).toContain('property("Scale").setValueAtTime(0.600, [140.00, 140.00])');
    expect(script).toContain('loopOut');
    expect(script.match(/ease\(/g)!.length).toBeGreaterThanOrEqual(6);
  });
});

const palette = {
  colors: [
    { hex: '#1d84f5', values: ['oklch(0.62 0.19 255)'], variables: ['--brand'], roles: ['accent'] },
    { hex: '#ffffff', values: ['rgb(255, 255, 255)'], variables: [], roles: ['background'] },
    { hex: '#123456', values: ['rgb(18, 52, 86)'], variables: [], roles: [] },
  ],
} as unknown as Palette;

describe('palette exports', () => {
  it('names colours by variable, role, then hex', () => {
    expect(namedColors(palette)).toEqual([
      { name: 'brand', hex: '#1d84f5' },
      { name: 'background', hex: '#ffffff' },
      { name: 'color-123456', hex: '#123456' },
    ]);
    expect(toDesignTokens(palette)).toEqual({ color: { brand: { $type: 'color', $value: '#1d84f5' }, background: { $type: 'color', $value: '#ffffff' }, 'color-123456': { $type: 'color', $value: '#123456' } } });
    expect(toTailwindTheme(palette)).toContain('"brand": "#1d84f5"');
  });

  it('writes Adobe Swatch Exchange', () => {
    const ase = toAse([{ name: 'brand', hex: '#1d84f5' }]);
    const view = new DataView(ase.buffer);
    expect(String.fromCharCode(...ase.slice(0, 4))).toBe('ASEF');
    expect(view.getUint32(8)).toBe(1);
    expect(view.getUint16(12)).toBe(0x0001);
    const nameLen = view.getUint16(18);
    expect(nameLen).toBe(6);
    const modelAt = 20 + nameLen * 2;
    expect(String.fromCharCode(...ase.slice(modelAt, modelAt + 4))).toBe('RGB ');
    expect(view.getFloat32(modelAt + 4)).toBeCloseTo(0x1d / 255);
    expect(view.getUint32(14)).toBe(ase.length - 18);
  });
});

describe('SVG', () => {
  const tree: LayoutTree = {
    width: 200, height: 100, background: '#ffffff', fonts: [], images: ['https://x/a.png'],
    root: {
      type: 'frame', name: 'section', x: 0, y: 0, width: 200, height: 100, opacity: 1, fill: '#f5f5f4', gradient: null,
      radius: [8, 8, 8, 8], border: { width: 1, color: '#e5e7eb' }, shadows: [], clips: true, image: null, imageFit: 'fill', raster: false, svg: null, text: null, layout: null,
      children: [
        { type: 'image', name: 'img', x: 10, y: 10, width: 50, height: 50, opacity: 1, fill: null, gradient: null, radius: [0, 0, 0, 0], border: null, shadows: [], clips: false, image: 'https://x/a.png', imageFit: 'cover', raster: false, svg: null, text: null, layout: null, children: [] },
        {
          type: 'text', name: 'Hi', x: 70, y: 10, width: 60, height: 20, opacity: 1, fill: null, gradient: null, radius: [0, 0, 0, 0], border: null, shadows: [], clips: false, image: null, imageFit: 'fill', raster: false, svg: null, layout: null, children: [],
          text: { content: 'Hi & bye', lines: [{ text: 'Hi & bye', x: 70, y: 10, width: 60, height: 20 }], fontFamily: 'Inter', fontSize: 16, fontWeight: 600, italic: false, lineHeight: 20, letterSpacing: 0, color: '#111827', align: 'left', transform: 'none', decoration: 'none' },
        },
      ],
    },
  };
  it('draws boxes, images and live text', () => {
    const svg = toSvg(tree, (u) => (u.endsWith('a.png') ? '../assets/a.png' : null));
    expect(svg).toContain('<rect x="0" y="0" width="200" height="100" rx="8" fill="#f5f5f4"/>');
    expect(svg).toContain('<image href="../assets/a.png" x="10" y="10" width="50" height="50" preserveAspectRatio="xMidYMid slice"/>');
    expect(svg).toContain('font-family="Inter" font-size="16" font-weight="600"');
    expect(svg).toContain('Hi &amp; bye');
    expect(svg).toContain('clip-path="url(#');
  });
});

describe('SVG shadows', () => {
  it('draws each shadow once, outside the box, and the translucent fill once', () => {
    const node = (over: object) => ({ type: 'frame', name: 'panel', x: 0, y: 0, width: 100, height: 50, opacity: 1, fill: '#ffffff1a', gradient: null, radius: [8, 8, 8, 8], border: null, shadows: [], clips: false, image: null, imageFit: 'fill', raster: false, svg: null, text: null, layout: null, children: [], ...over }) as any;
    const shadows = [1, 2, 3].map((i) => ({ x: 0, y: i, blur: 2 * i, spread: 1, color: '#00000033', inset: false }));
    const svg = toSvg({ width: 100, height: 50, background: '#030712', fonts: [], images: [], root: node({ shadows }) }, () => null);
    expect(svg.match(/fill-opacity="0.102"/g)).toHaveLength(1);
    expect(svg.match(/operator="out"/g)).toHaveLength(3);
    expect(svg.match(/<feMergeNode in="s\d"\/>/g)).toHaveLength(3);
    expect(svg).not.toContain('SourceGraphic');
  });
});
