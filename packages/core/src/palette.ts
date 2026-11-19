import { chroma, composite, contrastRatio, deltaE, findColorTokens, parseColor, toHex, type Rgba } from './color';
import { allElements, isRendered, uniqueSelector } from './dom';
import type { StyleSheetText } from './types';

export type ColorRole = 'background' | 'surface' | 'text' | 'text-muted' | 'accent' | 'border';

export interface PaletteColor {
  /** sRGB hex (gamut-mapped); 8 digits when translucent. */
  hex: string;
  /** Exact values as the browser reports them, in their own colour space (e.g. `oklch(0.7 0.2 40)`). */
  values: string[];
  /** Colour space of the first value (rgb, oklch, p3, …). */
  space: string;
  alpha: number;
  /** For translucent colours: the colour it actually renders as over its background. */
  composited?: string;
  count: number;
  /** How often each CSS property used it; `text` counts elements whose own text uses it. */
  properties: Record<string, number>;
  /** Custom properties that resolve to this colour, e.g. `--brand-500`. */
  variables: string[];
  /** A few example elements using it. */
  selectors: string[];
  /** Painted area in CSS px² (background colours only); used for roles. */
  area: number;
  /** Index of its near-duplicate group (Delta E 2000 below the threshold). */
  group: number;
  roles: ColorRole[];
}

export interface PaletteVariable {
  name: string;
  value: string;
  hex: string;
}

export interface PaletteGradient {
  value: string;
  stops: string[];
  selectors: string[];
}

export interface ContrastPair {
  fg: string;
  bg: string;
  ratio: number;
  /** Number of text elements using this pair. */
  count: number;
  largeText: boolean;
  /** WCAG 2.2 AA (4.5:1, or 3:1 for large text). */
  passesAA: boolean;
  /** The background is a gradient, measured at its average colour. */
  approximate: boolean;
}

/** What is painted behind an element. `unknown` when it's an image we can't read from CSS. */
interface Backdrop {
  rgba: Rgba;
  approximate: boolean;
  unknown: boolean;
}

export interface Palette {
  colors: PaletteColor[];
  variables: PaletteVariable[];
  gradients: PaletteGradient[];
  contrast: ContrastPair[];
}

export interface PaletteOptions {
  /** Colours closer than this Delta E 2000 share a group. Exact values are always kept. */
  groupThreshold: number;
  /** Example selectors stored per colour. */
  maxSelectors: number;
}

export const DEFAULT_PALETTE_OPTIONS: PaletteOptions = { groupThreshold: 1, maxSelectors: 5 };

const WHITE: Rgba = { r: 1, g: 1, b: 1, alpha: 1 };

/**
 * Collects every colour the page renders, from computed styles of every element and pseudo-element,
 * plus colour custom properties found in `sheets` (stylesheet texts, including cross-origin ones the
 * caller fetched) and in readable stylesheets.
 */
export function extractPalette(sheets: StyleSheetText[] = [], options: Partial<PaletteOptions> = {}): Palette {
  const opts = { ...DEFAULT_PALETTE_OPTIONS, ...options };
  const byHex = new Map<string, PaletteColor>();
  const gradients = new Map<string, PaletteGradient>();
  const pairs = new Map<string, ContrastPair>();
  const bgCache = new WeakMap<Element, Backdrop>();

  const backdrop = (el: Element | null): Backdrop => {
    if (!el) return { rgba: WHITE, approximate: false, unknown: false };
    const cached = bgCache.get(el);
    if (cached) return cached;
    const style = getComputedStyle(el);
    const parent = el.parentElement ?? (el.getRootNode() as ShadowRoot).host ?? null;
    const color = parseColor(style.backgroundColor)?.rgba;
    const image = style.backgroundImage;
    let result: Backdrop;
    if (image && image !== 'none') {
      const below = color && color.alpha >= 1 ? { rgba: color, approximate: false, unknown: false } : backdrop(parent);
      const stops = image.includes('gradient(') ? findColorTokens(image).map((t) => parseColor(t)?.rgba).filter((c): c is Rgba => !!c) : [];
      if (image.includes('url(') || stops.length === 0) result = { ...below, unknown: true };
      else {
        const avg = (k: keyof Rgba) => stops.reduce((sum, c) => sum + c[k], 0) / stops.length;
        result = { rgba: composite({ r: avg('r'), g: avg('g'), b: avg('b'), alpha: avg('alpha') }, below.rgba), approximate: true, unknown: below.unknown };
      }
    } else if (color && color.alpha >= 1) result = { rgba: color, approximate: false, unknown: false };
    else if (color && color.alpha > 0) {
      const below = backdrop(parent);
      result = { ...below, rgba: composite(color, below.rgba) };
    } else result = backdrop(parent);
    bgCache.set(el, result);
    return result;
  };
  const effectiveBg = (el: Element | null): Rgba => backdrop(el).rgba;

  const add = (value: string, property: string, el: Element, area = 0, over?: Rgba) => {
    const parsed = parseColor(value);
    if (!parsed || parsed.rgba.alpha === 0) return;
    const hex = toHex(parsed.rgba);
    let entry = byHex.get(hex);
    if (!entry) {
      entry = {
        hex,
        values: [],
        space: parsed.mode,
        alpha: parsed.rgba.alpha,
        composited: parsed.rgba.alpha < 1 ? toHex(composite(parsed.rgba, over ?? effectiveBg(el.parentElement))) : undefined,
        count: 0,
        properties: {},
        variables: [],
        selectors: [],
        area: 0,
        group: 0,
        roles: [],
      };
      byHex.set(hex, entry);
    }
    if (!entry.values.includes(value)) entry.values.push(value);
    entry.count++;
    entry.area += area;
    entry.properties[property] = (entry.properties[property] ?? 0) + 1;
    if (entry.selectors.length < opts.maxSelectors) {
      const sel = uniqueSelector(el);
      if (!entry.selectors.includes(sel)) entry.selectors.push(sel);
    }
  };

  for (const el of allElements()) {
    const style = getComputedStyle(el);
    if (!isRendered(el, style)) continue;
    const rect = el.getBoundingClientRect();
    collectFromStyle(el, style, '', rect.width * rect.height, add, gradients, opts.maxSelectors);
    for (const pseudo of ['::before', '::after'] as const) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content && ps.content !== 'none' && ps.content !== 'normal') {
        collectFromStyle(el, ps, pseudo, 0, add, gradients, opts.maxSelectors);
      }
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      add(getComputedStyle(el, '::placeholder').color, 'color::placeholder', el);
    }

    // Contrast: only elements that directly hold visible text.
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (hasText) {
      const fg = parseColor(style.color)?.rgba;
      const textEntry = fg ? byHex.get(toHex(fg)) : undefined;
      if (textEntry) textEntry.properties.text = (textEntry.properties.text ?? 0) + 1;
      const behind = backdrop(el);
      if (fg && !behind.unknown) {
        const bg = behind.rgba;
        const shown = composite(fg, bg);
        const size = parseFloat(style.fontSize);
        const weight = parseInt(style.fontWeight, 10) || 400;
        const largeText = size >= 24 || (size >= 18.66 && weight >= 700);
        const key = `${toHex(shown)}|${toHex(bg)}|${largeText}`;
        const pair = pairs.get(key);
        if (pair) pair.count++;
        else {
          const ratio = Math.round(contrastRatio(shown, bg) * 100) / 100;
          pairs.set(key, {
            fg: toHex(shown),
            bg: toHex(bg),
            ratio,
            count: 1,
            largeText,
            passesAA: ratio >= (largeText ? 3 : 4.5),
            approximate: behind.approximate,
          });
        }
      }
    }
  }

  const variables = collectColorVariables(sheets);
  for (const v of variables) {
    const entry = byHex.get(v.hex);
    if (entry && !entry.variables.includes(v.name)) entry.variables.push(v.name);
  }

  const colors = Array.from(byHex.values()).sort((a, b) => b.count - a.count);
  assignGroups(colors, opts.groupThreshold);
  assignRoles(colors);

  return {
    colors,
    variables,
    gradients: Array.from(gradients.values()),
    contrast: Array.from(pairs.values()).sort((a, b) => b.count - a.count),
  };
}

type AddFn = (value: string, property: string, el: Element, area?: number) => void;

function collectFromStyle(
  el: Element,
  style: CSSStyleDeclaration,
  pseudo: string,
  area: number,
  add: AddFn,
  gradients: Map<string, PaletteGradient>,
  maxSelectors: number,
) {
  const p = (name: string) => `${name}${pseudo}`;
  add(style.color, p('color'), el);
  add(style.backgroundColor, p('background-color'), el, area);

  for (const side of ['top', 'right', 'bottom', 'left']) {
    if (style.getPropertyValue(`border-${side}-style`) !== 'none' && parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0) {
      add(style.getPropertyValue(`border-${side}-color`), p('border-color'), el);
    }
  }
  if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) add(style.outlineColor, p('outline-color'), el);
  if (style.textDecorationLine !== 'none') add(style.textDecorationColor, p('text-decoration-color'), el);
  if (el instanceof SVGElement) {
    if (style.fill && style.fill !== 'none') add(style.fill, p('fill'), el);
    if (style.stroke && style.stroke !== 'none') add(style.stroke, p('stroke'), el);
  }
  if (style.accentColor && style.accentColor !== 'auto') add(style.accentColor, p('accent-color'), el);

  for (const prop of ['box-shadow', 'text-shadow', 'filter'] as const) {
    const value = style.getPropertyValue(prop);
    if (value && value !== 'none') for (const token of findColorTokens(value)) add(token, p(prop), el);
  }

  const image = style.backgroundImage;
  if (image && image.includes('gradient(')) {
    const stops = findColorTokens(image);
    for (const token of stops) add(token, p('background-image'), el);
    const g = gradients.get(image) ?? { value: image, stops: stops.map((s) => (parseColor(s) ? toHex(parseColor(s)!.rgba) : s)), selectors: [] };
    if (g.selectors.length < maxSelectors) g.selectors.push(uniqueSelector(el));
    gradients.set(image, g);
  }
}

/** Custom properties whose value is a colour, with their exact authored value. */
export function collectColorVariables(sheets: StyleSheetText[] = []): PaletteVariable[] {
  const names = new Set<string>();
  const scan = (text: string) => {
    for (const m of text.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) names.add(m[1]);
  };
  for (const s of sheets) scan(s.text);
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      scan(Array.from(sheet.cssRules, (r) => r.cssText).join('\n'));
    } catch {
      // Cross-origin sheet: covered by `sheets` when the caller fetched it.
    }
  }
  const scopes = [document.documentElement, document.body].filter(Boolean);
  const out = new Map<string, PaletteVariable>();
  for (const name of names) {
    for (const scope of scopes) {
      const value = getComputedStyle(scope).getPropertyValue(name).trim();
      if (!value || out.has(name)) continue;
      const parsed = parseColor(value);
      if (parsed) out.set(name, { name, value, hex: toHex(parsed.rgba) });
    }
  }
  return Array.from(out.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function assignGroups(colors: PaletteColor[], threshold: number) {
  const reps: { rgba: Rgba; group: number }[] = [];
  for (const c of colors) {
    const rgba = parseColor(c.hex)!.rgba;
    const match = reps.find((r) => deltaE(r.rgba, rgba) < threshold);
    if (match) c.group = match.group;
    else {
      c.group = reps.length;
      reps.push({ rgba, group: c.group });
    }
  }
}

/** Heuristic roles from how colours are used. */
function assignRoles(colors: PaletteColor[]) {
  const opaque = colors.filter((c) => c.alpha >= 1);
  const byArea = opaque.filter((c) => c.area > 0).sort((a, b) => b.area - a.area);
  // `text` counts elements that directly hold text in that colour.
  const byText = opaque.filter((c) => c.properties.text).sort((a, b) => b.properties.text - a.properties.text);
  const byBorder = colors.filter((c) => c.properties['border-color']).sort((a, b) => b.properties['border-color'] - a.properties['border-color']);
  const tag = (c: PaletteColor | undefined, role: ColorRole) => {
    if (c && !c.roles.includes(role)) c.roles.push(role);
  };

  const background = byArea[0];
  tag(background, 'background');
  tag(byArea.find((c) => c !== background && c.group !== background?.group), 'surface');
  const bgRgba = background ? parseColor(background.hex)!.rgba : WHITE;
  const contrastOnBg = (c: PaletteColor) => contrastRatio(parseColor(c.hex)!.rgba, bgRgba);
  // Main text: the most used text colour that is readable on the page background (light text in a
  // dark navigation bar is common but isn't the page's text colour).
  const main = byText.find((c) => contrastOnBg(c) >= 4.5) ?? byText[0];
  tag(main, 'text');
  // Muted text: the most used text colour with less contrast than the main text, but still readable.
  tag(
    main && byText.find((c) => c !== main && c.group !== main.group && contrastOnBg(c) >= 3 && contrastOnBg(c) < contrastOnBg(main)),
    'text-muted',
  );
  tag(byBorder[0], 'border');
  // Accent: the chromatic colour used most as a fill (buttons, badges), then as anything else.
  const accentScore = (c: PaletteColor) => c.count + 5 * (c.properties['background-color'] ?? 0);
  const accent = opaque
    .filter((c) => chroma(parseColor(c.hex)!.rgba) > 0.08)
    .sort((a, b) => accentScore(b) - accentScore(a))[0];
  tag(accent, 'accent');
}
