import { describe, expect, it } from 'vitest';
import { chroma, composite, contrastRatio, deltaE, findColorTokens, medianCut, parseColor, toHex } from '../src/color';

describe('parseColor', () => {
  it('keeps the colour space and maps to sRGB hex', () => {
    expect(parseColor('rgb(15, 23, 42)')).toMatchObject({ mode: 'rgb' });
    expect(toHex(parseColor('rgb(15, 23, 42)')!.rgba)).toBe('#0f172a');
    expect(parseColor('oklch(0.7 0.15 250)')!.mode).toBe('oklch');
    expect(parseColor('color(display-p3 1 0 0)')!.mode).toBe('p3');
    expect(toHex(parseColor('color(display-p3 1 0 0)')!.rgba)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps alpha and writes 8-digit hex for translucent colours', () => {
    const c = parseColor('rgba(0, 0, 0, 0.5)')!;
    expect(c.rgba.alpha).toBe(0.5);
    expect(toHex(c.rgba)).toBe('#00000080');
  });

  it('returns null for non-colours', () => {
    expect(parseColor('auto')).toBeNull();
    expect(parseColor('')).toBeNull();
    // Real values from apple.com that made the colour library throw.
    expect(parseColor('blur(20px)')).toBeNull();
    expect(parseColor('inset(0px 0px 99.9% 99.9%)')).toBeNull();
    expect(parseColor('min-width(1024px)')).toBeNull();
  });
});

describe('findColorTokens', () => {
  it('finds colours inside shadows and gradients', () => {
    expect(findColorTokens('rgba(0, 0, 0, 0.1) 0px 1px 2px 0px, rgb(255, 0, 0) 0px 0px 0px 1px')).toEqual([
      'rgba(0, 0, 0, 0.1)',
      'rgb(255, 0, 0)',
    ]);
    expect(findColorTokens('linear-gradient(90deg, oklch(0.7 0.2 30) 0%, color(display-p3 0 0 1) 100%)')).toEqual([
      'oklch(0.7 0.2 30)',
      'color(display-p3 0 0 1)',
    ]);
  });
});

describe('composite and contrast', () => {
  const white = { r: 1, g: 1, b: 1, alpha: 1 };
  const black = { r: 0, g: 0, b: 0, alpha: 1 };

  it('blends translucent black over white to mid grey', () => {
    expect(toHex(composite({ ...black, alpha: 0.5 }, white))).toBe('#808080');
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColor('#737373')!.rgba, white)).toBeGreaterThan(4.5);
  });

  it('measures perceptual distance and chroma', () => {
    expect(deltaE(white, white)).toBe(0);
    expect(deltaE(parseColor('#ffffff')!.rgba, parseColor('#fefefe')!.rgba)).toBeLessThan(1);
    expect(chroma(parseColor('#808080')!.rgba)).toBeLessThan(0.01);
    expect(chroma(parseColor('#2563eb')!.rgba)).toBeGreaterThan(0.08);
  });
});

describe('medianCut', () => {
  it('finds the two colours of a half red, half blue image with their share', () => {
    const px = new Uint8ClampedArray(100 * 4);
    for (let i = 0; i < 100; i++) px.set(i < 70 ? [255, 0, 0, 255] : [0, 0, 255, 255], i * 4);
    const result = medianCut(px, 4);
    expect(result[0].hex).toBe('#ff0000');
    expect(result[0].weight).toBeCloseTo(0.7, 1);
    expect(result.map((c) => c.hex)).toContain('#0000ff');
  });

  it('ignores transparent pixels', () => {
    expect(medianCut(new Uint8ClampedArray(40), 4)).toEqual([]);
  });
});
