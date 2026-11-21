import { isRendered, pageRect, uniqueSelector } from './dom';
import type { StyleSnapshot } from './motion-math';
import type { Rect, StyleSheetText } from './types';

export type InteractionState = 'hover' | 'focus' | 'focus-visible' | 'focus-within' | 'active';

export interface InteractionCandidate {
  selector: string;
  label: string;
  states: InteractionState[];
  sources: ('css' | 'js')[];
  /** Tag and classes; elements sharing one are usually copies of the same component. */
  signature: string;
  focusable: boolean;
}

const STATE_RE = /:(hover|focus-visible|focus-within|focus|active)\b/;

/** Base selectors of rules that style an interaction state, e.g. `.card:hover .title` → `.card` (hover). */
export function stateSelectors(cssTexts: string[]): Map<string, Set<InteractionState>> {
  const out = new Map<string, Set<InteractionState>>();
  for (const text of cssTexts) {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of clean.matchAll(/([^{}@;]+)\{/g)) {
      for (const part of m[1].split(',')) {
        const sel = part.trim();
        const state = sel.match(STATE_RE);
        if (!state) continue;
        const base = sel.slice(0, state.index).replace(/[\s>+~]+$/, '').trim();
        if (!base) continue;
        const set = out.get(base) ?? new Set<InteractionState>();
        set.add(state[1] as InteractionState);
        out.set(base, set);
      }
    }
  }
  return out;
}

/**
 * Elements that react to hover, focus or press: from CSS state rules in `sheets` (and readable
 * stylesheets), plus `pointerTargets` found by the deep-mode hooks. Copies of the same component are
 * limited to `perSignature`.
 */
export function findInteractionCandidates(
  sheets: StyleSheetText[],
  pointerTargets: string[] = [],
  max = 40,
  perSignature = 2,
): InteractionCandidate[] {
  const texts = sheets.map((s) => s.text);
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      texts.push(Array.from(sheet.cssRules, (r) => r.cssText).join('\n'));
    } catch {
      // Cross-origin; covered by `sheets`.
    }
  }
  const found = new Map<Element, { states: Set<InteractionState>; sources: Set<'css' | 'js'> }>();
  const note = (el: Element, state: InteractionState, source: 'css' | 'js') => {
    const entry = found.get(el) ?? { states: new Set(), sources: new Set() };
    entry.states.add(state);
    entry.sources.add(source);
    found.set(el, entry);
  };
  for (const [base, states] of stateSelectors(texts)) {
    let els: Element[] = [];
    try {
      els = Array.from(document.querySelectorAll(base)).slice(0, 50);
    } catch {
      continue;
    }
    for (const el of els) for (const s of states) note(el, s, 'css');
  }
  for (const sel of pointerTargets) {
    const el = document.querySelector(sel);
    if (el) note(el, 'hover', 'js');
  }

  const perSig = new Map<string, number>();
  const out: InteractionCandidate[] = [];
  for (const [el, { states, sources }] of found) {
    if (el === document.documentElement || el === document.body || !isRendered(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const signature = `${el.tagName.toLowerCase()}.${Array.from(el.classList).sort().join('.')}`;
    const n = perSig.get(signature) ?? 0;
    if (n >= perSignature) continue;
    perSig.set(signature, n + 1);
    out.push({
      selector: uniqueSelector(el),
      label: labelOf(el),
      states: [...states],
      sources: [...sources],
      signature,
      focusable: el instanceof HTMLElement && el.tabIndex >= 0,
    });
    if (out.length >= max) break;
  }
  return out;
}

/** Visual properties compared before and after an interaction. */
export const VISUAL_PROPS = [
  'color', 'background-color', 'background-image', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
  'border-top-width', 'border-radius', 'box-shadow', 'outline-color', 'outline-width', 'outline-offset', 'opacity', 'transform',
  'translate', 'scale', 'rotate', 'filter', 'backdrop-filter', 'clip-path', 'text-decoration-line', 'text-decoration-color',
  'text-underline-offset', 'letter-spacing', 'font-weight', 'width', 'height', 'padding-left', 'padding-right', 'gap', 'visibility',
];

/** Computed visual styles of an element, its ::before/::after and up to `maxDescendants` descendants. */
export function snapshotStyles(selector: string, maxDescendants = 40): StyleSnapshot[] {
  const root = document.querySelector(selector);
  if (!root) return [];
  const read = (style: CSSStyleDeclaration) => Object.fromEntries(VISUAL_PROPS.map((p) => [p, style.getPropertyValue(p)]));
  const out: StyleSnapshot[] = [{ path: '', props: read(getComputedStyle(root)) }];
  for (const pseudo of ['::before', '::after']) {
    const s = getComputedStyle(root, pseudo);
    if (s.content && s.content !== 'none' && s.content !== 'normal') out.push({ path: pseudo, props: read(s) });
  }
  const walk = (el: Element, path: string) => {
    Array.from(el.children).forEach((child, i) => {
      if (out.length > maxDescendants) return;
      const p = path ? `${path}.${i}` : String(i);
      out.push({ path: p, props: read(getComputedStyle(child)) });
      walk(child, p);
    });
  };
  walk(root, '');
  return out;
}

/** Scrolls an element to the middle of the viewport; returns its viewport and page rects. */
export function prepareElement(selector: string): { viewport: Rect; page: Rect } | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  return { viewport: { x: r.left, y: r.top, width: r.width, height: r.height }, page: pageRect(el) };
}

export function focusElement(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return false;
  el.focus({ focusVisible: true } as FocusOptions);
  return document.activeElement === el;
}

export function blurActive(): void {
  (document.activeElement as HTMLElement | null)?.blur?.();
}

export interface ToggleCandidate {
  selector: string;
  label: string;
}

/** Buttons that open menus, accordions and tabs (aria-expanded), and <details> summaries. Never links or submit buttons. */
export function findToggles(max = 10): ToggleCandidate[] {
  const els = Array.from(document.querySelectorAll('button[aria-expanded], [role="button"][aria-expanded], details > summary'))
    .filter((el) => isRendered(el))
    .filter((el) => !(el instanceof HTMLButtonElement && el.type === 'submit' && el.form))
    .slice(0, max);
  return els.map((el) => ({ selector: uniqueSelector(el), label: labelOf(el) }));
}

/** Clicks a toggle (no navigation possible: only buttons and summaries are returned by findToggles). */
export function clickToggle(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return false;
  el.click();
  return true;
}

function labelOf(el: Element): string {
  const text = (el.getAttribute('aria-label') ?? (el as HTMLElement).innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return (text || el.tagName.toLowerCase()).slice(0, 40);
}

const SIM_ATTR = 'data-specimen-hover';

/**
 * Hover without a real pointer (Firefox, Safari): fires the pointer/mouse events JS listeners wait
 * for, and applies the page's own `:hover` rules (from `cssTexts`) as inline styles, which also
 * runs their CSS transitions. `on = false` undoes it.
 */
export function simulateHover(selector: string, on: boolean, cssTexts: string[] = []): boolean {
  const el = document.querySelector(selector);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const init = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, view: window };
  const fire = (types: string[]) => types.forEach((t) => el.dispatchEvent(t.startsWith('pointer') ? new PointerEvent(t, init) : new MouseEvent(t, init)));
  if (!on) {
    for (const t of Array.from(document.querySelectorAll<HTMLElement>(`[${SIM_ATTR}]`))) {
      const prev = t.getAttribute(SIM_ATTR);
      if (prev) t.setAttribute('style', prev);
      else t.removeAttribute('style');
      t.removeAttribute(SIM_ATTR);
    }
    fire(['pointerout', 'pointerleave', 'mouseout', 'mouseleave']);
    return true;
  }
  fire(['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']);
  const texts = [...cssTexts];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      texts.push(Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n'));
    } catch {
      // Cross-origin: the caller passes its text in `cssTexts`.
    }
  }
  for (const text of texts) {
    for (const m of text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const part of m[1].split(',')) {
        const sel = part.trim();
        const idx = sel.indexOf(':hover');
        if (idx < 0) continue;
        const base = sel.slice(0, idx);
        try {
          if (!base || !el.matches(base)) continue;
          const targets = Array.from(document.querySelectorAll<HTMLElement>(sel.replace(/:hover/g, ''))).filter((t) => t === el || el.contains(t));
          for (const t of targets) {
            if (!t.hasAttribute(SIM_ATTR)) t.setAttribute(SIM_ATTR, t.getAttribute('style') ?? '');
            for (const decl of m[2].split(';')) {
              const i = decl.indexOf(':');
              if (i > 0) t.style.setProperty(decl.slice(0, i).trim(), decl.slice(i + 1).replace(/!important/, '').trim(), 'important');
            }
          }
        } catch {
          // Selector this browser can't parse.
        }
      }
    }
  }
  return true;
}

/** Readable stylesheet texts, plus URLs of cross-origin sheets the caller must fetch itself. */
export function styleSheetTexts(): { texts: StyleSheetText[]; unreadable: string[] } {
  const texts: StyleSheetText[] = [];
  const unreadable: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      texts.push({ url: sheet.href ?? location.href, text: Array.from(sheet.cssRules, (r) => r.cssText).join('\n') });
    } catch {
      if (sheet.href) unreadable.push(sheet.href);
    }
  }
  return { texts, unreadable };
}

export function viewportSize(): { width: number; height: number; scrollY: number; dpr: number; screenWidth: number; screenHeight: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollY: window.scrollY,
    dpr: window.devicePixelRatio,
    screenWidth: screen.availWidth,
    screenHeight: screen.availHeight,
  };
}

/** Scrolls the page to `y` and resolves after a frame; returns where it actually ended up. */
export async function scrollToY(y: number, timeoutMs = 2000): Promise<number> {
  const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
  const target = Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight));
  // Smooth-scroll libraries (Lenis, Locomotive) finish their own animation over a native scroll, so
  // keep setting the position until it has held for a few frames.
  const deadline = Date.now() + timeoutMs;
  let held = 0;
  window.scrollTo({ top: target, left: 0, behavior: 'instant' as ScrollBehavior });
  while (held < 3 && Date.now() < deadline) {
    await frame();
    if (Math.abs(window.scrollY - target) <= 1) held++;
    else {
      held = 0;
      window.scrollTo({ top: target, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }
  return window.scrollY;
}

/**
 * A fingerprint of everything clicking toggles can change: expanded/open states, open dialogs and
 * modal layers. Compared before and after the toggle step to make sure the page was put back.
 */
export function interactiveState(): string {
  const expanded = Array.from(document.querySelectorAll('[aria-expanded]'), (el) => el.getAttribute('aria-expanded')).join(',');
  const open = Array.from(document.querySelectorAll('details'), (el) => (el as HTMLDetailsElement).open).join(',');
  const dialogs = document.querySelectorAll('dialog[open], [aria-modal="true"], [role="dialog"]:not([hidden])').length;
  return `${expanded}|${open}|${dialogs}|${document.body.style.overflow}`;
}

/** Closes what a click may have left open: presses Escape where focus is, as a person would. */
export function pressEscape(): void {
  const target = document.activeElement ?? document.body;
  for (const type of ['keydown', 'keyup'] as const) target.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
}

/** One pointer sample from the page: wall-clock seconds and viewport CSS px. */
export interface PointerLogSample {
  t: number;
  x: number;
  y: number;
  down: boolean;
}

const POINTER_LOG = '__specimenPointerLog';
type PointerLogGlobal = { [POINTER_LOG]?: { samples: PointerLogSample[]; stop: () => void } };

/**
 * Logs the real pointer while the user records an interaction, so the recording can show the
 * cursor (screen recordings leave it out). Listens without affecting the page.
 */
export function startPointerLog(maxSamples = 20_000): void {
  stopPointerLog();
  const samples: PointerLogSample[] = [];
  const onEvent = (e: PointerEvent) => {
    if (samples.length < maxSamples) samples.push({ t: Date.now() / 1000, x: e.clientX, y: e.clientY, down: e.buttons > 0 });
  };
  const types = ['pointermove', 'pointerdown', 'pointerup'] as const;
  for (const type of types) window.addEventListener(type, onEvent, { capture: true, passive: true });
  (globalThis as PointerLogGlobal)[POINTER_LOG] = { samples, stop: () => types.forEach((type) => window.removeEventListener(type, onEvent, { capture: true })) };
}

/** Stops logging and returns the samples (empty when nothing was logged). */
export function stopPointerLog(): PointerLogSample[] {
  const log = (globalThis as PointerLogGlobal)[POINTER_LOG];
  if (!log) return [];
  log.stop();
  delete (globalThis as PointerLogGlobal)[POINTER_LOG];
  return log.samples;
}
