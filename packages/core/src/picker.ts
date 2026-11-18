import { sectionFromElement } from './sections';
import type { Section } from './types';

const OVERLAY_ID = '__specimen-overlay';

function overlay(): HTMLDivElement {
  let el = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.style.cssText =
      'position:fixed;pointer-events:none;z-index:2147483647;outline:2px solid #0A0A0A;box-shadow:0 0 0 1px #FFFFFF,0 0 0 9999px rgba(10,10,10,0.08);transition:all 80ms ease-out;display:none';
    const label = document.createElement('span');
    label.style.cssText =
      'position:absolute;left:-2px;top:-24px;background:#0A0A0A;color:#FFFFFF;font:500 11px/1 system-ui,sans-serif;padding:5px 7px;border-radius:4px;white-space:nowrap';
    el.appendChild(label);
    document.documentElement.appendChild(el);
  }
  return el;
}

function place(target: Element | null, text = '') {
  const box = overlay();
  if (!target) {
    box.style.display = 'none';
    return;
  }
  const r = target.getBoundingClientRect();
  Object.assign(box.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  (box.firstChild as HTMLSpanElement).textContent = text;
  (box.firstChild as HTMLSpanElement).style.top = r.top < 26 ? '4px' : '-24px';
}

/** Outlines a section on the page (null clears it) and scrolls it into view. */
export function highlight(selector: string | null, label = ''): void {
  const el = selector ? document.querySelector(selector) : null;
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    requestAnimationFrame(() => place(el, label));
  } else place(null);
}

/** Lets the user click an element on the page. Resolves with it as a section, or null on Escape. */
export function pickElement(index: number): Promise<Section | null> {
  return new Promise((resolve) => {
    let current: Element | null = null;
    const describe = (el: Element) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()} · ${Math.round(r.width)}×${Math.round(r.height)}`;
    };
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== current && el.id !== OVERLAY_ID) {
        current = el;
        place(el, describe(el));
      }
    };
    const onWheel = () => current && place(current, describe(current));
    const finish = (result: Section | null) => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', onWheel, true);
      place(null);
      resolve(result);
    };
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      finish(current ? sectionFromElement(current, index) : null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(null);
      } else if (e.key === 'ArrowUp' && current?.parentElement && current.parentElement !== document.body) {
        // Arrow up selects the parent, for when the target is hard to hover.
        e.preventDefault();
        current = current.parentElement;
        place(current, describe(current));
      }
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', onWheel, true);
  });
}
