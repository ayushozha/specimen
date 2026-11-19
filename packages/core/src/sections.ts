import { isRendered, pageRect, uniqueSelector } from './dom';
import type { Section, SectionSource } from './types';

export interface SectionOptions {
  /** Sections shorter than this (CSS px) are ignored. */
  minHeight: number;
  /** Fraction of the viewport width a block must span to count as a section. */
  minWidthRatio: number;
}

export const DEFAULT_SECTION_OPTIONS: SectionOptions = { minHeight: 80, minWidthRatio: 0.6 };

const SEMANTIC_SELECTOR = [
  'header',
  'nav',
  'main > section',
  'body > section',
  'section',
  'article',
  'footer',
  '[data-section]',
  '[data-framer-name]',
  '[data-wf--section]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="region"]',
].join(',');

/** Finds the page's sections: semantic elements first, then large blocks, then viewport slices. */
export function detectSections(options: Partial<SectionOptions> = {}): Section[] {
  const opts = { ...DEFAULT_SECTION_OPTIONS, ...options };
  const pageHeight = document.documentElement.scrollHeight;

  const semantic = outermost(
    Array.from(document.querySelectorAll(SEMANTIC_SELECTOR)).filter((el) => isSectionSized(el, opts)),
  );
  let picked: { el: Element; source: SectionSource }[] = semantic.map((el) => ({ el, source: 'semantic' }));

  if (coverage(picked.map((p) => p.el)) < 0.5 * pageHeight) {
    const blocks = layoutBlocks(opts).flatMap((b) => splitTall(b, opts, 3));
    if (coverage(blocks) > coverage(picked.map((p) => p.el))) {
      picked = blocks.map((el) => ({ el, source: 'block' }));
    }
  }

  if (picked.length === 0) return viewportSlices(pageHeight);

  const used = new Set<string>();
  return picked
    .map(({ el, source }) => ({ el, source, rect: pageRect(el) }))
    .sort((a, b) => a.rect.y - b.rect.y)
    .map(({ el, source, rect }, i) => {
      const name = uniqueName(sectionName(el), used);
      return { id: sectionId(i, name), name, selector: uniqueSelector(el), rect, source };
    });
}

/** Re-measures sections at the current viewport (rects change between breakpoints). */
export function measureSections(sections: Section[]): Section[] {
  return sections.map((s) => {
    const el = s.selector ? document.querySelector(s.selector) : null;
    return el ? { ...s, rect: pageRect(el) } : s;
  });
}

/** For each selector, the id of the section that contains it (or null). Viewport slices match by position. */
export function sectionsContaining(selectors: (string | null)[], sections: Section[]): (string | null)[] {
  const roots = sections.map((s) => ({ id: s.id, el: s.selector ? document.querySelector(s.selector) : null, rect: s.rect }));
  return selectors.map((sel) => {
    const el = sel ? document.querySelector(sel) : null;
    if (!el) return null;
    const hit = roots.find((r) => r.el && (r.el === el || r.el.contains(el)));
    if (hit) return hit.id;
    // Not inside any section's markup (positioned layers, portals): the section it sits over.
    const box = pageRect(el);
    const middle = box.y + box.height / 2;
    return roots.map((r) => ({ ...r, rect: r.el ? pageRect(r.el) : r.rect })).find((r) => middle >= r.rect.y && middle < r.rect.y + r.rect.height)?.id ?? null;
  });
}

export function sectionFromElement(el: Element, index: number): Section {
  const name = sectionName(el);
  return { id: sectionId(index, name), name, selector: uniqueSelector(el), rect: pageRect(el), source: 'picked' };
}

export function sectionName(el: Element): string {
  const label = el.getAttribute('aria-label') ?? el.getAttribute('data-framer-name') ?? el.getAttribute('data-section');
  if (label?.trim()) return clean(label);
  const heading = el.querySelector('h1, h2, h3, h4');
  // innerText keeps line breaks as spaces ("Intake<br>and integrations" → "Intake and integrations").
  const headingText = heading ? ((heading as HTMLElement).innerText || heading.textContent || '') : '';
  if (headingText.trim()) return clean(headingText);
  if (el.id) return clean(el.id.replace(/[-_]+/g, ' '));
  const tag = el.tagName.toLowerCase();
  return tag === 'header' ? 'Header' : tag === 'footer' ? 'Footer' : tag === 'nav' ? 'Navigation' : 'Section';
}

/** Headers, navs and footers are often shorter than content sections but still worth their own capture. */
const BAR_SELECTOR = 'header, nav, footer, [role="banner"], [role="contentinfo"]';
const BAR_MIN_HEIGHT = 32;

function isSectionSized(el: Element, opts: SectionOptions): boolean {
  if (!isRendered(el)) return false;
  const r = el.getBoundingClientRect();
  const minHeight = el.matches(BAR_SELECTOR) ? Math.min(BAR_MIN_HEIGHT, opts.minHeight) : opts.minHeight;
  return r.height >= minHeight && r.width >= window.innerWidth * opts.minWidthRatio;
}

/** Drops candidates nested inside another candidate. */
function outermost(els: Element[]): Element[] {
  return els.filter((el) => !els.some((other) => other !== el && other.contains(el)));
}

/** Direct children of the page's main column that look like full-width blocks. */
function layoutBlocks(opts: SectionOptions): Element[] {
  let column: Element = document.body;
  // Descend through wrappers that hold a single large child (e.g. #root > div > main).
  for (;;) {
    const big = Array.from(column.children).filter((c) => isSectionSized(c, opts));
    if (big.length !== 1) break;
    column = big[0];
  }
  return Array.from(column.children).filter((c) => isSectionSized(c, opts));
}

/** A block taller than a few screens is usually a wrapper: use its section-sized children instead. */
function splitTall(el: Element, opts: SectionOptions, depth: number): Element[] {
  if (depth === 0 || el.getBoundingClientRect().height < window.innerHeight * 2.5) return [el];
  const children = Array.from(el.children).filter((c) => isSectionSized(c, opts));
  if (children.length < 2) return [el];
  return children.flatMap((c) => splitTall(c, opts, depth - 1));
}

function coverage(els: Element[]): number {
  return els.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
}

function viewportSlices(pageHeight: number): Section[] {
  const h = window.innerHeight;
  const count = Math.max(1, Math.ceil(pageHeight / h));
  return Array.from({ length: count }, (_, i) => {
    const name = `Slice ${i + 1}`;
    return {
      id: sectionId(i, name),
      name,
      selector: null,
      rect: { x: 0, y: i * h, width: window.innerWidth, height: Math.min(h, pageHeight - i * h) },
      source: 'split' as const,
    };
  });
}

function sectionId(index: number, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'section';
  return `${String(index + 1).padStart(2, '0')}-${slug}`;
}

function uniqueName(name: string, used: Set<string>): string {
  let out = name;
  for (let n = 2; used.has(out); n++) out = `${name} ${n}`;
  used.add(out);
  return out;
}

function clean(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 40 ? `${t.slice(0, 39)}…` : t;
}
