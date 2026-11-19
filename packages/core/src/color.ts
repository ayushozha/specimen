import {
  converter,
  differenceCiede2000,
  formatHex,
  formatHex8,
  parse,
  toGamut,
  wcagContrast,
  type Color,
} from 'culori';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

const toRgb = converter('rgb');
const toOklab = converter('oklab');
const gamutMap = toGamut('rgb', 'oklch');
const ciede2000 = differenceCiede2000();

/** Matches CSS colour functions and hex colours inside a property value. */
const COLOR_TOKEN =
  /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\((?:[^()]|\([^()]*\))*\)|#[0-9a-fA-F]{3,8}\b/g;

export function findColorTokens(value: string): string[] {
  return value.match(COLOR_TOKEN) ?? [];
}

/** Parses any CSS colour and maps it into the sRGB gamut. Returns null for non-colours. */
export function parseColor(value: string): { rgba: Rgba; mode: string } | null {
  let parsed: Color | undefined;
  try {
    parsed = parse(value.trim());
  } catch {
    // culori throws on CSS functions it doesn't know (blur(), inset(), min-width()): not colours.
    return null;
  }
  if (!parsed) return null;
  const mapped = toRgb(gamutMap(parsed));
  return {
    mode: parsed.mode,
    rgba: {
      r: clamp01(mapped.r),
      g: clamp01(mapped.g),
      b: clamp01(mapped.b),
      alpha: parsed.alpha ?? 1,
    },
  };
}

export function toHex(c: Rgba): string {
  const color: Color = { mode: 'rgb', r: c.r, g: c.g, b: c.b, alpha: c.alpha };
  return c.alpha >= 1 ? formatHex(color) : formatHex8(color);
}

/** Source-over compositing of `fg` on `bg`. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.alpha + bg.alpha * (1 - fg.alpha);
  if (a === 0) return { r: 0, g: 0, b: 0, alpha: 0 };
  const mix = (f: number, b: number) => (f * fg.alpha + b * bg.alpha * (1 - fg.alpha)) / a;
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), alpha: a };
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  return wcagContrast({ mode: 'rgb', ...a }, { mode: 'rgb', ...b });
}

export function deltaE(a: Rgba, b: Rgba): number {
  return ciede2000({ mode: 'rgb', ...a }, { mode: 'rgb', ...b });
}

/** Chroma in OKLCh; used to tell accent colours from neutrals. */
export function chroma(c: Rgba): number {
  const lab = toOklab({ mode: 'rgb', ...c });
  return Math.hypot(lab.a, lab.b);
}

export interface MediaColor {
  hex: string;
  /** Share of sampled pixels, 0–1. */
  weight: number;
}

/**
 * Median-cut quantisation in OKLab (perceptually even), over RGBA pixel data.
 * Transparent pixels are ignored; at most `sampleLimit` pixels are read.
 */
export function medianCut(
  pixels: Uint8ClampedArray,
  maxColors: number,
  sampleLimit = 4000,
): MediaColor[] {
  const total = pixels.length / 4;
  const stride = Math.max(1, Math.floor(total / sampleLimit));
  const points: [number, number, number][] = [];
  for (let i = 0; i < total; i += stride) {
    const o = i * 4;
    if (pixels[o + 3] < 128) continue;
    const lab = toOklab({ mode: 'rgb', r: pixels[o] / 255, g: pixels[o + 1] / 255, b: pixels[o + 2] / 255 });
    points.push([lab.l, lab.a, lab.b]);
  }
  if (points.length === 0) return [];

  let boxes: [number, number, number][][] = [points];
  while (boxes.length < maxColors) {
    let target = -1;
    let axis = 0;
    let widest = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let d = 0; d < 3; d++) {
        let min = Infinity;
        let max = -Infinity;
        for (const p of box) {
          if (p[d] < min) min = p[d];
          if (p[d] > max) max = p[d];
        }
        if (max - min > widest) {
          widest = max - min;
          target = i;
          axis = d;
        }
      }
    });
    if (target < 0 || widest < 0.02) break;
    const box = boxes[target].sort((p, q) => p[axis] - q[axis]);
    // Cut at the middle of the range rather than the middle index, so two distinct colours
    // are never averaged into a third that isn't in the image.
    const cut = (box[0][axis] + box[box.length - 1][axis]) / 2;
    const mid = Math.min(box.length - 1, Math.max(1, box.findIndex((p) => p[axis] > cut)));
    boxes.splice(target, 1, box.slice(0, mid), box.slice(mid));
  }

  // Median splits can cut one flat colour into several boxes; merge boxes with the same result.
  const merged = new Map<string, number>();
  for (const box of boxes) {
    const avg = [0, 1, 2].map((d) => box.reduce((s, p) => s + p[d], 0) / box.length);
    const hex = formatHex(toRgb(gamutMap({ mode: 'oklab', l: avg[0], a: avg[1], b: avg[2] })));
    merged.set(hex, (merged.get(hex) ?? 0) + box.length / points.length);
  }
  return Array.from(merged, ([hex, weight]) => ({ hex, weight })).sort((x, y) => y.weight - x.weight);
}

function clamp01(n: number | undefined): number {
  return Math.min(1, Math.max(0, n ?? 0));
}
