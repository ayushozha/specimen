import { findColorTokens, parseColor, toHex } from './color';
import { absoluteUrl, isRendered } from './dom';
import { isScriptUrl } from './serialize';
import type { Rect } from './types';

/** A design-tool-neutral description of what a section draws, in section-relative CSS px. */
export interface LayoutNode {
  type: 'frame' | 'text' | 'image' | 'svg';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  /** Solid background as #rrggbb(aa). */
  fill: string | null;
  /** CSS gradient, kept as written by the browser. */
  gradient: { css: string; stops: string[]; angle: number } | null;
  /** [top-left, top-right, bottom-right, bottom-left]. */
  radius: [number, number, number, number];
  border: { width: number; color: string } | null;
  shadows: { x: number; y: number; blur: number; spread: number; color: string; inset: boolean }[];
  clips: boolean;
  /** Image URL (img, video poster, CSS background) or a data URL (canvas). */
  image: string | null;
  imageFit: 'cover' | 'contain' | 'fill' | 'none';
  /**
   * Paint that design tools can't express as vectors (canvas/WebGL, video, radial or layered
   * gradients, filters, masks, blend modes, painted pseudo-elements). Exporters use the exact
   * pixels from the section screenshot for this box, behind its editable children.
   */
  raster: boolean;
  /** Sanitised SVG markup. */
  svg: string | null;
  text: TextInfo | null;
  /** Flex/grid layout, so design tools can rebuild it as auto layout. */
  layout: { mode: 'row' | 'column'; gap: number; padding: [number, number, number, number]; align: string; justify: string; wrap: boolean } | null;
  children: LayoutNode[];
}

export interface TextInfo {
  content: string;
  /** One entry per rendered line, with its exact box. */
  lines: { text: string; x: number; y: number; width: number; height: number }[];
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  transform: string;
  decoration: string;
}

export interface LayoutTree {
  width: number;
  height: number;
  background: string;
  root: LayoutNode;
  /** Distinct fonts used (family, weight, italic), for design tools that need them loaded. */
  fonts: { family: string; weight: number; italic: boolean }[];
  /** Image URLs referenced by the tree. */
  images: string[];
}

/** Reads a section into a LayoutTree. `maxNodes` bounds very large sections. */
export function layoutTree(selector: string, maxNodes = 1500): LayoutTree {
  const root = document.querySelector(selector);
  if (!root) throw new Error(`No element matches ${selector}`);
  const origin = root.getBoundingClientRect();
  const fonts = new Map<string, { family: string; weight: number; italic: boolean }>();
  const images = new Set<string>();
  let count = 0;

  const rel = (r: DOMRect | Rect): Rect => ({
    x: round(('left' in r ? r.left : r.x) - origin.left),
    y: round(('top' in r ? r.top : r.y) - origin.top),
    width: round(r.width),
    height: round(r.height),
  });

  const visit = (el: Element): LayoutNode | null => {
    if (count >= maxNodes) return null;
    const style = getComputedStyle(el);
    if (!isRendered(el, style) || Number(style.opacity) === 0) return null;
    const tag = el.localName.toLowerCase();
    if (['script', 'style', 'noscript', 'template', 'link', 'meta'].includes(tag)) return null;
    count++;
    const box = rel(el.getBoundingClientRect());
    const node: LayoutNode = {
      type: 'frame',
      name: nodeName(el),
      ...box,
      opacity: Number(style.opacity),
      fill: colorOrNull(style.backgroundColor),
      gradient: gradientOf(style.backgroundImage),
      radius: [
        parseFloat(style.borderTopLeftRadius) || 0,
        parseFloat(style.borderTopRightRadius) || 0,
        parseFloat(style.borderBottomRightRadius) || 0,
        parseFloat(style.borderBottomLeftRadius) || 0,
      ],
      border: borderOf(style),
      shadows: shadowsOf(style.boxShadow),
      clips: style.overflow !== 'visible' || style.overflowX !== 'visible',
      image: null,
      imageFit: 'fill',
      raster: needsRaster(el, style),
      svg: null,
      text: null,
      layout: layoutOf(style),
      children: [],
    };

    if (tag === 'svg') {
      node.type = 'svg';
      node.svg = sanitizeSvg(el as SVGSVGElement);
      return node;
    }
    if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement || el instanceof HTMLCanvasElement) {
      node.type = 'image';
      node.imageFit = (style.objectFit as LayoutNode['imageFit']) || 'fill';
      if (el instanceof HTMLCanvasElement) {
        // WebGL canvases read back blank and 2D ones may be tainted: the screenshot has the real pixels.
        node.image = null;
        node.raster = true;
      } else if (el instanceof HTMLVideoElement) {
        // The frame on screen, not the poster (which may be missing or different).
        node.image = null;
        node.raster = true;
      } else node.image = el.currentSrc || el.src;
      if (node.image && !node.image.startsWith('data:')) images.add(node.image);
      return node;
    }
    const bgUrl = style.backgroundImage.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    // url(#id) points into an inline SVG, not at an image file.
    if (bgUrl && !bgUrl[1].startsWith('#')) {
      node.image = absoluteUrl(bgUrl[1]);
      node.imageFit = style.backgroundSize === 'contain' ? 'contain' : 'cover';
      images.add(node.image);
    }

    // Text directly inside this element becomes text children, line by line.
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        const text = textNode(child as Text, style, rel);
        if (text) {
          node.children.push(text);
          const key = `${text.text!.fontFamily}|${text.text!.fontWeight}|${text.text!.italic}`;
          fonts.set(key, { family: text.text!.fontFamily, weight: text.text!.fontWeight, italic: text.text!.italic });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const c = visit(child as Element);
        if (c) node.children.push(c);
      }
    }
    const shadowRoot = (el as Element).shadowRoot;
    if (shadowRoot) {
      for (const child of Array.from(shadowRoot.children)) {
        const c = visit(child);
        if (c) node.children.push(c);
      }
    }
    return node;
  };

  const tree = visit(root);
  if (!tree) throw new Error(`${selector} is not rendered`);
  tree.x = 0;
  tree.y = 0;
  // A transparent section shows its ancestors' background colour. (Not their pixels: a whole-section
  // pixel layer would sit under every editable text and double it.)
  if (!tree.fill && !tree.gradient && !tree.raster) {
    for (let a = root.parentElement; a; a = a.parentElement) {
      const c = colorOrNull(getComputedStyle(a).backgroundColor);
      if (c) {
        tree.fill = c;
        break;
      }
    }
  }
  return {
    width: tree.width,
    height: tree.height,
    background: colorOrNull(getComputedStyle(document.body).backgroundColor) ?? '#ffffff',
    root: tree,
    fonts: [...fonts.values()],
    images: [...images],
  };
}

const SIMPLE_GRADIENT = /^linear-gradient\((?:[^()]|\([^()]*\))*\)$/;

/** Whether an element paints something only its pixels can reproduce. */
function needsRaster(el: Element, style: CSSStyleDeclaration): boolean {
  const image = style.backgroundImage;
  if (image !== 'none' && !SIMPLE_GRADIENT.test(image) && !/^url\([^)]*\)$/.test(image)) return true;
  if (style.filter !== 'none' || style.backdropFilter !== 'none' || style.mixBlendMode !== 'normal') return true;
  if ((style.maskImage && style.maskImage !== 'none') || (style.clipPath && style.clipPath !== 'none')) return true;
  for (const pseudo of ['::before', '::after']) {
    const p = getComputedStyle(el, pseudo);
    if (p.content === 'none' || p.content === 'normal') continue;
    if (p.backgroundImage !== 'none' || (colorOrNull(p.backgroundColor) && parseFloat(p.width) > 0)) return true;
  }
  return false;
}

function textNode(text: Text, style: CSSStyleDeclaration, rel: (r: DOMRect) => Rect): LayoutNode | null {
  const range = document.createRange();
  range.selectNodeContents(text);
  const whole = range.getBoundingClientRect();
  if (whole.width === 0 || whole.height === 0) return null;
  const lines = textLines(text, rel);
  const box = rel(whole);
  const fontSize = parseFloat(style.fontSize);
  const lineHeight = style.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(style.lineHeight);
  return {
    type: 'text',
    name: (text.textContent ?? '').trim().slice(0, 40),
    ...box,
    opacity: 1,
    fill: null,
    gradient: null,
    radius: [0, 0, 0, 0],
    border: null,
    shadows: [],
    clips: false,
    image: null,
    imageFit: 'fill',
    raster: false,
    svg: null,
    layout: null,
    text: {
      content: lines.map((l) => l.text).join('\n'),
      lines,
      fontFamily: primaryFont(style.fontFamily),
      fontSize,
      fontWeight: parseInt(style.fontWeight, 10) || 400,
      italic: style.fontStyle === 'italic',
      lineHeight: round(lineHeight),
      letterSpacing: style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing),
      color: colorOrNull(style.color) ?? '#000000',
      align: (['center', 'right', 'justify'].includes(style.textAlign) ? style.textAlign : 'left') as TextInfo['align'],
      transform: style.textTransform,
      decoration: style.textDecorationLine,
    },
    children: [],
  };
}

/** Splits a text node into its rendered lines by measuring each word. */
function textLines(text: Text, rel: (r: DOMRect) => Rect): TextInfo['lines'] {
  const content = text.textContent ?? '';
  const range = document.createRange();
  const lines: { words: string[]; rect: Rect }[] = [];
  const re = /\S+\s*/g;
  for (let m = re.exec(content); m; m = re.exec(content)) {
    range.setStart(text, m.index);
    range.setEnd(text, m.index + m[0].trimEnd().length);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
    if (!rects.length) continue;
    const r = rel(rects[0]);
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.rect.y - r.y) < r.height / 2) {
      last.words.push(m[0]);
      const right = Math.max(last.rect.x + last.rect.width, r.x + r.width);
      last.rect.x = Math.min(last.rect.x, r.x);
      last.rect.width = right - last.rect.x;
      last.rect.height = Math.max(last.rect.height, r.height);
    } else lines.push({ words: [m[0]], rect: { ...r } });
  }
  return lines.map((l) => ({ text: l.words.join('').replace(/\s+/g, ' ').trim(), ...l.rect }));
}

function layoutOf(style: CSSStyleDeclaration): LayoutNode['layout'] {
  if (!style.display.includes('flex')) return null;
  const gap = parseFloat(style.columnGap) || parseFloat(style.rowGap) || 0;
  return {
    mode: style.flexDirection.startsWith('column') ? 'column' : 'row',
    gap,
    padding: [parseFloat(style.paddingTop), parseFloat(style.paddingRight), parseFloat(style.paddingBottom), parseFloat(style.paddingLeft)],
    align: style.alignItems,
    justify: style.justifyContent,
    wrap: style.flexWrap !== 'nowrap',
  };
}

function borderOf(style: CSSStyleDeclaration): LayoutNode['border'] {
  const width = parseFloat(style.borderTopWidth);
  if (!width || style.borderTopStyle === 'none') return null;
  const color = colorOrNull(style.borderTopColor);
  return color ? { width, color } : null;
}

function shadowsOf(value: string): LayoutNode['shadows'] {
  if (!value || value === 'none') return [];
  return value.split(/,(?![^(]*\))/).flatMap((part) => {
    const color = findColorTokens(part)[0];
    const nums = part.replace(color ?? '', '').match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    if (!color || nums.length < 2) return [];
    return [{ x: nums[0], y: nums[1], blur: nums[2] ?? 0, spread: nums[3] ?? 0, color: colorOrNull(color) ?? '#000000', inset: part.includes('inset') }];
  });
}

function gradientOf(value: string): LayoutNode['gradient'] {
  if (!value || !value.includes('linear-gradient(')) return null;
  const angle = value.match(/linear-gradient\(\s*(-?[\d.]+)deg/);
  const to = value.match(/linear-gradient\(\s*to ([a-z ]+),/);
  const dir: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 };
  return {
    css: value,
    stops: findColorTokens(value).map((c) => colorOrNull(c) ?? '#000000'),
    angle: angle ? Number(angle[1]) : to ? dir[to[1].trim()] ?? 180 : 180,
  };
}

function colorOrNull(value: string): string | null {
  const c = parseColor(value);
  return c && c.rgba.alpha > 0 ? toHex(c.rgba) : null;
}

function primaryFont(stack: string): string {
  return stack.split(',')[0].trim().replace(/^["']|["']$/g, '');
}

function nodeName(el: Element): string {
  const label = el.getAttribute('aria-label') ?? el.getAttribute('data-framer-name');
  if (label) return label.slice(0, 40);
  const cls = Array.from(el.classList).slice(0, 2).join('.');
  return `${el.localName}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}`.slice(0, 60);
}

/** Inline SVG without scripts, event handlers or javascript: links. */
export function sanitizeSvg(svg: SVGSVGElement): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll('script, foreignObject').forEach((n) => n.remove());
  for (const el of [copy, ...Array.from(copy.querySelectorAll('*'))]) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith('on') || isScriptUrl(attr.value)) el.removeAttribute(attr.name);
    }
  }
  const r = svg.getBoundingClientRect();
  if (!copy.getAttribute('width')) copy.setAttribute('width', String(round(r.width)));
  if (!copy.getAttribute('height')) copy.setAttribute('height', String(round(r.height)));
  const fill = getComputedStyle(svg).color;
  if (!copy.getAttribute('color')) copy.setAttribute('color', fill);
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(copy);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
