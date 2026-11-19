import type { Rect } from './types';

/** Every element in the document, including inside open shadow roots. */
export function allElements(root: Document | ShadowRoot | Element = document): Element[] {
  const out: Element[] = [];
  const visit = (node: Document | ShadowRoot | Element) => {
    for (const el of Array.from(node.querySelectorAll('*'))) {
      out.push(el);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(root);
  return out;
}

export function pageRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.left + window.scrollX),
    y: Math.round(r.top + window.scrollY),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

export function isRendered(el: Element, style = getComputedStyle(el)): boolean {
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** A short selector that matches only `el` in its document. */
export function uniqueSelector(el: Element): string {
  if (el.id && el.ownerDocument.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
    return `#${CSS.escape(el.id)}`;
  }
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== el.ownerDocument.documentElement) {
    const current: Element = node;
    if (current.id && current.ownerDocument.querySelectorAll(`#${CSS.escape(current.id)}`).length === 1) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const same = Array.from(parent.children).filter((c) => c.tagName === current.tagName);
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(current) + 1})` : tag);
    node = parent;
  }
  return parts.join(' > ');
}

/** Page rects for selectors (null when missing). */
export function pageRectsOf(selectors: string[]): (Rect | null)[] {
  return selectors.map((s) => {
    const el = document.querySelector(s);
    return el ? pageRect(el) : null;
  });
}

export function absoluteUrl(url: string, base = document.baseURI): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
