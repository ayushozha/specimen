import { sectionFromElement } from './sections';
import type { Section } from './types';

const OVERLAY_ID = '__specimen-overlay';

/** Box-model tints from the browsers' Inspect Element highlight, softened so the page stays readable. */
const BOX = {
  margin: 'rgba(246, 178, 107, 0.32)',
  padding: 'rgba(147, 196, 125, 0.32)',
  content: 'rgba(111, 168, 220, 0.28)',
};
const FONT = '500 11px/16px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
/** Every overlay node starts from `all: initial`, so page CSS can't restyle it. */
const RESET = 'all:initial;position:absolute;box-sizing:border-box;pointer-events:none;';
const EASE = 'left 90ms ease-out,top 90ms ease-out,width 90ms ease-out,height 90ms ease-out';

type Overlay = { root: HTMLElement; margin: HTMLElement; padding: HTMLElement; ring: HTMLElement; label: HTMLElement; tag: HTMLElement; size: HTMLElement; hints: HTMLElement };

function node(css: string, parent?: HTMLElement, text = ''): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = RESET + css;
  el.textContent = text;
  parent?.appendChild(el);
  return el;
}

/**
 * The overlay: margin box (orange), border and padding band (green) around the content (blue), a
 * crisp black-and-white ring that reads on light and dark pages, a `tag  w × h` label, and, while
 * picking, a key-hint bar at the bottom of the window.
 */
function overlay(): Overlay {
  const existing = (globalThis as { __specimenOverlay?: Overlay }).__specimenOverlay;
  if (existing?.root.isConnected) return existing;
  const root = node('position:fixed;inset:0;z-index:2147483647;display:none');
  root.id = OVERLAY_ID;
  const margin = node(`border-style:solid;border-color:${BOX.margin};transition:${EASE}`, root);
  const padding = node(`inset:0;border-style:solid;border-color:${BOX.padding};background:${BOX.content};background-clip:padding-box`, margin);
  const ring = node(`border-radius:2px;box-shadow:0 0 0 1px #FFFFFF,0 0 0 2.5px #0A0A0A,0 0 0 3.5px rgba(255,255,255,0.7);transition:${EASE}`, root);
  const label = node(
    `display:flex;gap:6px;align-items:center;padding:3px 8px;border-radius:6px;background:#0A0A0A;color:#FFFFFF;font:${FONT};white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.22),0 0 0 1px rgba(255,255,255,0.12);transition:left 90ms ease-out,top 90ms ease-out`,
    root,
  );
  const tag = node(`position:static;font:${FONT};color:#FFFFFF`, label);
  const size = node(`position:static;font:${FONT};color:#A3A3A3;font-variant-numeric:tabular-nums`, label);
  const hints = node(
    `left:50%;bottom:20px;transform:translateX(-50%);display:none;gap:14px;align-items:center;padding:8px 14px;border-radius:999px;background:rgba(10,10,10,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#D4D4D4;font:${FONT};white-space:nowrap;box-shadow:0 8px 28px rgba(0,0,0,0.28),0 0 0 1px rgba(255,255,255,0.1)`,
    root,
  );
  for (const [keys, text] of [
    [['↑', '↓'], 'Parent / child'],
    [['↵'], 'Capture'],
    [['Esc'], 'Cancel'],
  ] as const) {
    const group = node('position:static;display:flex;gap:4px;align-items:center', hints);
    for (const k of keys)
      node(
        `position:static;min-width:18px;padding:0 5px;border-radius:4px;background:rgba(255,255,255,0.14);color:#FFFFFF;font:${FONT};text-align:center`,
        group,
        k,
      );
    node(`position:static;margin-left:2px;font:${FONT};color:#D4D4D4`, group, text);
  }
  document.documentElement.appendChild(root);
  const o = { root, margin, padding, ring, label, tag, size, hints };
  (globalThis as { __specimenOverlay?: Overlay }).__specimenOverlay = o;
  return o;
}

const px = (v: string) => Math.max(0, parseFloat(v) || 0);

function place(target: Element | null, text = '') {
  const o = overlay();
  if (!target) {
    o.root.style.display = 'none';
    o.hints.style.display = 'none';
    return;
  }
  const r = target.getBoundingClientRect();
  const s = getComputedStyle(target);
  const m = [px(s.marginTop), px(s.marginRight), px(s.marginBottom), px(s.marginLeft)];
  // Border and padding share the green band, as in the browsers' highlight.
  const p = [
    px(s.borderTopWidth) + px(s.paddingTop),
    px(s.borderRightWidth) + px(s.paddingRight),
    px(s.borderBottomWidth) + px(s.paddingBottom),
    px(s.borderLeftWidth) + px(s.paddingLeft),
  ];
  o.root.style.display = 'block';
  Object.assign(o.margin.style, {
    left: `${r.left - m[3]}px`,
    top: `${r.top - m[0]}px`,
    width: `${r.width + m[1] + m[3]}px`,
    height: `${r.height + m[0] + m[2]}px`,
    borderWidth: m.map((v) => `${v}px`).join(' '),
  });
  o.padding.style.borderWidth = p.map((v) => `${v}px`).join(' ');
  Object.assign(o.ring.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const [name, dims] = text.split('  ');
  o.tag.textContent = name ?? '';
  o.size.textContent = dims ?? '';
  o.size.style.display = dims ? 'block' : 'none';
  // Above the element, or inside its top edge when there is no room above.
  const top = r.top - m[0] - 30 >= 4 ? r.top - m[0] - 30 : Math.max(4, Math.min(r.top + 6, innerHeight - 30));
  Object.assign(o.label.style, { left: `${Math.min(Math.max(4, r.left), Math.max(4, innerWidth - 260))}px`, top: `${top}px` });
}

/** `tag.class  width × height`, like the browsers' highlight label. */
function describe(el: Element): string {
  const r = el.getBoundingClientRect();
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
  return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : cls ? `.${cls}` : ''}  ${Math.round(r.width)} × ${Math.round(r.height)}`;
}

/** Outlines a section on the page (null clears it) and scrolls it into view. */
export function highlight(selector: string | null, label = ''): void {
  const el = selector ? document.querySelector(selector) : null;
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    requestAnimationFrame(() => place(el, label || describe(el)));
  } else place(null);
}

export type PickState = { picking: boolean; section: Section | null };

const PICK = '__specimenPick';
type PickGlobal = { [PICK]?: { state: PickState; stop: () => void } };

/**
 * Lets the user click an element on the page; read the outcome with `pickState`. Starting returns at
 * once, so the panel polls instead of holding one script call open while the user picks (Safari may
 * not wait for a pending one, and the panel can cancel from its own window).
 */
export function startPick(index: number): void {
  cancelPick();
  let current: Element | null = null;
  let pointer = { x: 0, y: 0 };
  /** Elements left by ↑, so ↓ walks back down the same path. */
  let trail: Element[] = [];
  const state: PickState = { picking: true, section: null };
  const show = (el: Element) => {
    current = el;
    place(el, describe(el));
    overlay().hints.style.display = 'flex';
  };
  const onMove = (e: MouseEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== current && !el.closest(`#${OVERLAY_ID}`)) {
      trail = [];
      show(el);
    }
  };
  // Follows the target every frame: hover effects move it (cards that lift) and the page scrolls.
  let frame = 0;
  const follow = () => {
    if (current) place(current, describe(current));
    frame = requestAnimationFrame(follow);
  };
  const swallow = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const finish = (section: Section | null) => {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('pointerdown', swallow, true);
    document.removeEventListener('mousedown', swallow, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    cancelAnimationFrame(frame);
    place(null);
    state.picking = false;
    state.section = section;
  };
  const onClick = (e: MouseEvent) => {
    swallow(e);
    // A click without a hover first (the window wasn't focused yet) picks what is under the pointer.
    const el = current ?? document.elementFromPoint(e.clientX, e.clientY);
    finish(el ? sectionFromElement(el, index) : null);
  };
  /** The child to step into: back along the ↑ path, else the child under the pointer, else the first. */
  const child = (el: Element): Element | null => {
    if (trail.length) return trail.pop()!;
    const kids = Array.from(el.children).filter((k) => k.getBoundingClientRect().width > 0 && k.id !== OVERLAY_ID);
    return kids.find((k) => k.contains(document.elementFromPoint(pointer.x, pointer.y))) ?? kids[0] ?? null;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      swallow(e);
      finish(null);
    } else if (e.key === 'Enter' && current) {
      swallow(e);
      finish(sectionFromElement(current, index));
    } else if (e.key === 'ArrowUp' && current?.parentElement && current.parentElement !== document.body) {
      // ↑ selects the parent, for when the target is hard to hover; ↓ goes back down.
      swallow(e);
      trail.push(current);
      const parent = current.parentElement;
      show(parent);
    } else if (e.key === 'ArrowDown' && current) {
      swallow(e);
      const next = child(current);
      if (next) show(next);
    }
  };
  document.addEventListener('mousemove', onMove, true);
  // Links and buttons must not act on the press that picks them.
  document.addEventListener('pointerdown', swallow, true);
  document.addEventListener('mousedown', swallow, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  frame = requestAnimationFrame(follow);
  (globalThis as PickGlobal)[PICK] = { state, stop: () => finish(null) };
}

/** Where picking stands. After a reload there is no picker any more, which reads as cancelled. */
export function pickState(): PickState {
  return (globalThis as PickGlobal)[PICK]?.state ?? { picking: false, section: null };
}

export function cancelPick(): void {
  const pick = (globalThis as PickGlobal)[PICK];
  if (pick?.state.picking) pick.stop();
}
