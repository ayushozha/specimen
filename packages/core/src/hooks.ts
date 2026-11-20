/**
 * Instrumentation installed in the page's own JS world before any page script runs ("deep mode").
 * It records which elements react to the pointer and which are watched for scrolling into view,
 * without changing behaviour. Both functions are serialised and must stay self-contained.
 */

export interface HookReport {
  /** Elements with pointer listeners (hover effects driven by JavaScript). */
  pointerTargets: string[];
  /** True when window/document listen to pointer movement (cursor followers, parallax, magnets). */
  globalPointer: boolean;
  /** Elements passed to IntersectionObserver.observe (scroll reveals). */
  observed: string[];
  /** requestAnimationFrame calls per second while the page was idle (JS animation loops). */
  rafPerSecond: number;
}

/** Runs at document start in the MAIN world. */
export function installHooks(): void {
  const KEY = '__specimenHooks';
  const w = window as unknown as Record<string, unknown>;
  if (w[KEY]) return;
  const POINTER = new Set(['mouseenter', 'mouseover', 'mouseleave', 'mouseout', 'mousemove', 'pointerenter', 'pointerover', 'pointerleave', 'pointermove']);
  const pointerTargets = new Set<EventTarget>();
  const observed = new Set<Element>();
  let globalPointer = false;
  let rafCalls = 0;
  const started = performance.now();

  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: unknown[]) {
    if (POINTER.has(type)) {
      if (this === window || this === document || this === document.documentElement || this === document.body) {
        if (type === 'mousemove' || type === 'pointermove') globalPointer = true;
      } else pointerTargets.add(this);
    }
    return (add as (...a: unknown[]) => void).call(this, type, ...rest);
  } as typeof add;

  const observe = IntersectionObserver.prototype.observe;
  IntersectionObserver.prototype.observe = function (this: IntersectionObserver, target: Element) {
    observed.add(target);
    return observe.call(this, target);
  };

  // Timers and frames go through a gate so a capture can stop the page's clock for a moment, including
  // intervals started long before (see freezePageScripts). Frames and timeouts wait; interval ticks
  // are skipped, as if no time passed.
  let frozen = false;
  const waiting: (() => void)[] = [];
  const gate = (cb: (...a: unknown[]) => unknown, skip: boolean) =>
    function (this: unknown, ...args: unknown[]) {
      if (!frozen) return cb.apply(this, args);
      if (!skip) waiting.push(() => cb.apply(this, args));
    };
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb: FrameRequestCallback) {
    rafCalls++;
    return raf.call(window, gate(cb as never, false) as FrameRequestCallback);
  };
  const st = window.setTimeout;
  window.setTimeout = function (cb: unknown, ...rest: unknown[]) {
    return (st as (...a: unknown[]) => number).call(window, typeof cb === 'function' ? gate(cb as never, false) : cb, ...rest);
  } as typeof setTimeout;
  const si = window.setInterval;
  window.setInterval = function (cb: unknown, ...rest: unknown[]) {
    return (si as (...a: unknown[]) => number).call(window, typeof cb === 'function' ? gate(cb as never, true) : cb, ...rest);
  } as typeof setInterval;
  const setFrozen = (on: boolean) => {
    frozen = on;
    if (!on) waiting.splice(0).forEach((run) => raf.call(window, () => run()));
  };

  Object.defineProperty(w, KEY, {
    configurable: false,
    enumerable: false,
    value: { pointerTargets, observed, getGlobalPointer: () => globalPointer, rafStats: () => ({ rafCalls, started }), setFrozen },
  });
}

/** Reads what the hooks recorded. MAIN world, self-contained. */
export function readHooks(): HookReport {
  const hooks = (window as unknown as Record<string, unknown>).__specimenHooks as
    | { pointerTargets: Set<EventTarget>; observed: Set<Element>; getGlobalPointer(): boolean; rafStats(): { rafCalls: number; started: number } }
    | undefined;
  const empty: HookReport = { pointerTargets: [], globalPointer: false, observed: [], rafPerSecond: 0 };
  if (!hooks) return empty;

  const selectorOf = (el: Element): string => {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node !== document.documentElement) {
      const current: Element = node;
      if (current.id && document.querySelectorAll(`#${CSS.escape(current.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      const parent: Element | null = current.parentElement;
      const tag = current.tagName.toLowerCase();
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const same = Array.from(parent.children).filter((c) => c.tagName === current.tagName);
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(current) + 1})` : tag);
      node = parent;
    }
    return parts.join(' > ');
  };
  const live = (targets: Iterable<EventTarget>) =>
    Array.from(targets)
      .filter((t): t is Element => t instanceof Element && t.isConnected)
      .slice(0, 300)
      .map(selectorOf);

  const { rafCalls, started } = hooks.rafStats();
  return {
    pointerTargets: live(hooks.pointerTargets),
    globalPointer: hooks.getGlobalPointer(),
    observed: live(hooks.observed),
    rafPerSecond: Math.round((rafCalls / Math.max(1, performance.now() - started)) * 1000),
  };
}
