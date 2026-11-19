import { absoluteUrl, pageRect } from './dom';
import type { StyleSheetText } from './types';

export interface SerializedSection {
  /** Standalone HTML document. Resource URLs are absolute; `resources` lists them for offline bundling. */
  html: string;
  resources: string[];
}

/** Properties that inherit; on non-root elements they are written only when they differ from the parent. */
const INHERITED = new Set([
  'color', 'cursor', 'direction', 'font-family', 'font-feature-settings', 'font-kerning', 'font-optical-sizing',
  'font-size', 'font-stretch', 'font-style', 'font-variant', 'font-variant-caps', 'font-variant-ligatures',
  'font-variant-numeric', 'font-variation-settings', 'font-weight', 'letter-spacing', 'line-height',
  'list-style-image', 'list-style-position', 'list-style-type', 'quotes', 'tab-size', 'text-align',
  'text-indent', 'text-rendering', 'text-shadow', 'text-transform', 'visibility', 'white-space',
  'word-break', 'word-spacing', 'overflow-wrap', 'writing-mode', '-webkit-font-smoothing', 'fill', 'stroke',
  'stroke-width', 'hyphens', 'text-wrap', 'caret-color', 'accent-color', 'color-scheme',
]);

const URL_ATTRS = ['src', 'href', 'poster', 'xlink:href', 'action'];
/** Never copied: anything that can run code, load plugins or change how the document loads. Compared lowercase (SVG keeps case). */
const DROP_TAGS = new Set(['script', 'noscript', 'template', 'link', 'meta', 'base', 'style', 'object', 'embed', 'applet', 'frame', 'frameset', 'portal']);
const DROP_ATTRS = new Set(['class', 'style', 'srcset', 'sizes', 'srcdoc', 'formaction', 'loading', 'decoding', 'nonce', 'integrity']);
const SAFE_ATTR_NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;
/**
 * URLs that run code. Browsers drop tabs, newlines and control characters inside a scheme
 * (`java\tscript:` works), so those are removed before checking.
 */
export function isScriptUrl(value: string): boolean {
  return /^(javascript|vbscript|data:text\/html)/i.test(value.replace(/[\u0000-\u0020\u007f-\u00a0]/g, ''));
}

/**
 * Content-Security-Policy for every generated HTML file: no scripts of any kind (inline, event
 * handlers, javascript: URLs, SVG scripts), no plugins, no forms; images, media and fonts may load.
 */
export const GENERATED_HTML_CSP =
  "default-src 'none'; img-src * data: blob:; media-src * data: blob:; font-src * data:; style-src 'unsafe-inline'; frame-src *; base-uri 'none'; form-action 'none'";

/** Makes CSS safe to place inside a <style> element: `<` can never close the element. */
export function cssForStyleElement(css: string): string {
  return css.replace(/</g, '\\3c ');
}

/**
 * Serialises an element into a standalone HTML page that renders like the original:
 * every element gets a class with its computed styles (minus browser defaults and inherited
 * values equal to the parent's), pseudo-elements are kept, open shadow roots become declarative
 * shadow DOM, and @font-face rules come along.
 */
export function serializeElement(selector: string, sheets: StyleSheetText[] = []): SerializedSection {
  const root = document.querySelector(selector);
  if (!root) throw new Error(`No element matches ${selector}`);

  const defaults = new DefaultStyles();
  const resources = new Set<string>();
  let counter = 0;

  const serializeTree = (el: Element, parentStyle: CSSStyleDeclaration | null, rules: string[]): string => {
    if (DROP_TAGS.has(el.localName.toLowerCase())) return '';
    const style = getComputedStyle(el);
    if (style.display === 'none') return '';

    const cls = `c${counter++}`;
    rules.push(`.${cls}{${declarations(style, defaults.get(el.tagName, el.namespaceURI), parentStyle, resources)}}`);
    for (const pseudo of ['::before', '::after', '::marker', '::placeholder']) {
      const ps = getComputedStyle(el, pseudo);
      if (pseudo === '::before' || pseudo === '::after') {
        if (!ps.content || ps.content === 'none' || ps.content === 'normal') continue;
      } else if (pseudo === '::placeholder' && !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue;
      else if (pseudo === '::marker' && style.display !== 'list-item') continue;
      rules.push(`.${cls}${pseudo}{${declarations(ps, defaults.get('SPAN', el.namespaceURI), style, resources)}}`);
    }

    const tag = el.tagName.toLowerCase();
    const attrs = serializeAttributes(el, cls, resources);
    if (el instanceof HTMLCanvasElement) {
      let data = '';
      try {
        data = el.toDataURL('image/png');
      } catch {
        // Tainted canvas: leave it empty.
      }
      return `<img${attrs} src="${data}" alt="">`;
    }
    if (VOID.has(tag)) return `<${tag}${attrs}>`;

    let inner = '';
    if (el.shadowRoot) {
      const shadowRules: string[] = [];
      const shadowHtml = Array.from(el.shadowRoot.childNodes, (n) => serializeNode(n, style, shadowRules)).join('');
      inner += `<template shadowrootmode="open"><style>${cssForStyleElement(shadowRules.join('\n'))}</style>${shadowHtml}</template>`;
    }
    // The page's original text, never what the user has typed.
    if (el instanceof HTMLTextAreaElement) inner += escapeText(el.defaultValue);
    else if (el instanceof HTMLIFrameElement) inner += '';
    else inner += Array.from(el.childNodes, (n) => serializeNode(n, style, rules)).join('');
    return `<${tag}${attrs}>${inner}</${tag}>`;
  };

  const serializeNode = (node: Node, parentStyle: CSSStyleDeclaration, rules: string[]): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '');
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === 'SLOT') {
        const assigned = (el as HTMLSlotElement).assignedNodes();
        if (assigned.length === 0) return Array.from(el.childNodes, (n) => serializeNode(n, parentStyle, rules)).join('');
      }
      return serializeTree(el, parentStyle, rules);
    }
    return '';
  };

  const rules: string[] = [];
  const body = serializeTree(root, null, rules);
  defaults.dispose();

  const fontFaces = collectFontFaces(sheets, resources, usedFontFamilies(root));
  const rect = pageRect(root);
  const pageBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  const html = `<!doctype html>
<html lang="${escapeAttr(document.documentElement.lang || 'en')}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${GENERATED_HTML_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeText(document.title)}</title>
<style>
${cssForStyleElement([...fontFaces, `html{background:${htmlBg}}`, `body{margin:0;background:${pageBg};width:${rect.width}px}`, ...rules].join('\n'))}
</style>
</head>
<body>${body}</body>
</html>
`;
  return { html, resources: [...resources] };
}

function declarations(
  style: CSSStyleDeclaration,
  defaults: CSSStyleDeclaration,
  parent: CSSStyleDeclaration | null,
  resources: Set<string>,
): string {
  const out: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop.startsWith('--')) continue;
    let value = style.getPropertyValue(prop);
    if (!value) continue;
    if (parent && INHERITED.has(prop) && parent.getPropertyValue(prop) === value) continue;
    if (!parent || !INHERITED.has(prop)) {
      if (defaults.getPropertyValue(prop) === value) continue;
    }
    if (value.includes('url(')) value = rewriteCssUrls(value, document.baseURI, resources);
    out.push(`${prop}:${value}`);
  }
  return out.join(';');
}

function serializeAttributes(el: Element, cls: string, resources: Set<string>): string {
  const parts = [` class="${cls}"`];
  const isPassword = el instanceof HTMLInputElement && el.type === 'password';
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    const lower = name.toLowerCase();
    if (DROP_ATTRS.has(lower) || lower.startsWith('on') || !SAFE_ATTR_NAME.test(name)) continue;
    if (isPassword && lower === 'value') continue;
    let value = attr.value;
    if (isScriptUrl(value)) continue;
    if (URL_ATTRS.includes(name) && value && !value.startsWith('#')) {
      value = absoluteUrl(value);
      if (name !== 'href' || el.tagName !== 'A') resources.add(value);
    }
    parts.push(` ${name}="${escapeAttr(value)}"`);
  }
  // Freeze the image the browser actually chose from srcset.
  if (el instanceof HTMLImageElement && el.currentSrc) {
    const idx = parts.findIndex((p) => p.startsWith(' src='));
    const src = ` src="${escapeAttr(el.currentSrc)}"`;
    if (idx >= 0) parts[idx] = src;
    else parts.push(src);
    resources.add(el.currentSrc);
  }
  if (el instanceof HTMLVideoElement && el.currentSrc) {
    parts.push(` src="${escapeAttr(el.currentSrc)}"`);
    resources.add(el.currentSrc);
  }
  return parts.join('');
}

/** @font-face rules from all stylesheets, with absolute font URLs. */
/** Font family names (lowercase, unquoted) used by an element and everything inside it. */
export function usedFontFamilies(root: Element): Set<string> {
  const out = new Set<string>();
  const add = (stack: string) => stack.split(',').forEach((f) => out.add(f.trim().replace(/^["']|["']$/g, '').toLowerCase()));
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    add(getComputedStyle(el).fontFamily);
    for (const p of ['::before', '::after']) add(getComputedStyle(el, p).fontFamily);
  }
  return out;
}

/**
 * @font-face rules from all stylesheets, with absolute font URLs. With `families`, only faces of those
 * families: sites can declare hundreds of fonts, and copying all of them makes exports slow to open.
 */
export function collectFontFaces(sheets: StyleSheetText[], resources: Set<string>, families?: Set<string>): string[] {
  const faces = new Set<string>();
  const wanted = (rule: string) => {
    if (!families) return true;
    const m = rule.match(/font-family\s*:\s*(["']?)([^;"'}]+)\1/i);
    return !!m && families.has(m[2].trim().toLowerCase());
  };
  const add = (rule: string, base: string) => {
    if (wanted(rule)) faces.add(rewriteCssUrls(rule, base, resources));
  };
  for (const s of sheets) {
    for (const m of s.text.matchAll(/@font-face\s*{[^}]*}/g)) add(m[0], s.url || document.baseURI);
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) add(rule.cssText, sheet.href ?? document.baseURI);
      }
    } catch {
      // Cross-origin; covered by `sheets`.
    }
  }
  return [...faces];
}

function rewriteCssUrls(css: string, base: string, resources: Set<string>): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (whole, _q, url: string) => {
    if (url.startsWith('data:') || url.startsWith('#')) return whole;
    const abs = absoluteUrl(url, base);
    resources.add(abs);
    return `url("${abs}")`;
  });
}

/** Computed styles of untouched elements, read from a hidden same-origin iframe. */
class DefaultStyles {
  private frame: HTMLIFrameElement;
  private cache = new Map<string, CSSStyleDeclaration>();

  constructor() {
    this.frame = document.createElement('iframe');
    this.frame.setAttribute('aria-hidden', 'true');
    this.frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;left:-9999px';
    document.documentElement.appendChild(this.frame);
  }

  get(tag: string, ns: string | null): CSSStyleDeclaration {
    const key = `${ns}|${tag}`;
    let style = this.cache.get(key);
    if (!style) {
      const doc = this.frame.contentDocument!;
      const el = ns && ns !== 'http://www.w3.org/1999/xhtml' ? doc.createElementNS(ns, tag.toLowerCase()) : doc.createElement(tag);
      doc.body.appendChild(el);
      style = this.frame.contentWindow!.getComputedStyle(el);
      this.cache.set(key, style);
    }
    return style;
  }

  dispose() {
    this.frame.remove();
  }
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
