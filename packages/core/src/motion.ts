import { allElements, isRendered, sleep, uniqueSelector } from './dom';
import { downsample, type Track } from './motion-math';

export interface AnimationInfo {
  id: string;
  kind: 'css-animation' | 'css-transition' | 'waapi';
  /** `scroll`: driven by scroll position (animation-timeline: scroll()/view()), not by time. */
  timeline: 'document' | 'scroll';
  /** Keyframes name, transitioned property, or the animation's id. */
  name: string;
  target: string | null;
  pseudo: string | null;
  keyframes: Record<string, unknown>[];
  duration: number;
  delay: number;
  iterations: number | 'infinite';
  easing: string;
  direction: string;
  fill: string;
  playState: string;
}

// Animations stay addressable between calls: the isolated world keeps this module alive.
const registry = new Map<string, Animation>();
const ids = new WeakMap<Animation, string>();
const resumeState = new Map<string, { time: number | null; playing: boolean }>();

function idOf(a: Animation): string {
  let id = ids.get(a);
  if (!id) {
    id = `a${registry.size + 1}`;
    ids.set(a, id);
    registry.set(id, a);
  }
  return id;
}

/** Every CSS animation, CSS transition and Web Animation on the page (or under `withinSelector`). */
export function collectAnimations(withinSelector: string | null = null): AnimationInfo[] {
  const root = withinSelector ? document.querySelector(withinSelector) : null;
  const list = root ? root.getAnimations({ subtree: true }) : document.getAnimations();
  return list.map((a) => {
    const effect = a.effect as KeyframeEffect | null;
    const timing = effect?.getComputedTiming();
    const target = effect?.target ?? null;
    const kind = a instanceof CSSAnimation ? 'css-animation' : a instanceof CSSTransition ? 'css-transition' : 'waapi';
    const name = a instanceof CSSAnimation ? a.animationName : a instanceof CSSTransition ? a.transitionProperty : a.id || 'animation';
    let keyframes: Record<string, unknown>[] = [];
    try {
      keyframes = (effect?.getKeyframes() ?? []).map((k) => JSON.parse(JSON.stringify(k)));
    } catch {
      // Keyframes of some pseudo-element animations can't be read.
    }
    return {
      id: idOf(a),
      kind,
      timeline: a.timeline instanceof DocumentTimeline ? 'document' : 'scroll',
      name,
      target: target ? uniqueSelector(target) : null,
      pseudo: effect?.pseudoElement ?? null,
      keyframes,
      // Scroll-driven animations report 'auto' or a percentage: not a time.
      duration: Number.isFinite(Number(timing?.duration)) ? Number(timing?.duration) : 0,
      delay: Number(timing?.delay ?? 0),
      iterations: timing?.iterations === Infinity ? 'infinite' : Number(timing?.iterations ?? 1),
      easing: String(effect?.getTiming().easing ?? 'linear'),
      direction: String(timing?.direction ?? 'normal'),
      fill: String(timing?.fill ?? 'none'),
      playState: a.playState,
    };
  });
}

/** Pauses every animation on the page so a frame can be stepped exactly. Remembers how to resume. */
export function pauseAllAnimations(): number {
  const all = document.getAnimations();
  for (const a of all) {
    if (!(a.timeline instanceof DocumentTimeline)) continue; // scroll-driven: follows the scroll position
    const id = idOf(a);
    if (!resumeState.has(id)) resumeState.set(id, { time: a.currentTime === null ? null : Number(a.currentTime), playing: a.playState === 'running' });
    a.pause();
  }
  return all.length;
}

/** Sets animations to a point in their active duration (ms after their delay). */
export async function seekAnimations(animationIds: string[], timeMs: number): Promise<void> {
  for (const id of animationIds) {
    const a = registry.get(id);
    if (!a || !(a.timeline instanceof DocumentTimeline)) continue;
    const time = Number((a.effect as KeyframeEffect | null)?.getComputedTiming().delay ?? 0) + timeMs;
    if (!Number.isFinite(time)) continue;
    try {
      a.pause();
      a.currentTime = time;
    } catch {
      // An animation the page replaced or cancelled meanwhile.
    }
  }
  // Let the style change reach the compositor before the screenshot.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export function resumeAllAnimations(): void {
  for (const [id, state] of resumeState) {
    const a = registry.get(id);
    if (!a) continue;
    try {
      if (state.time !== null && Number.isFinite(state.time)) a.currentTime = state.time;
      if (state.playing) a.play();
    } catch {
      // Gone or replaced meanwhile.
    }
  }
  resumeState.clear();
}

export interface DeclarativeMotion {
  library: 'AOS' | 'Locomotive Scroll' | 'Webflow';
  selector: string;
  settings: Record<string, string>;
}

/** Motion declared in HTML attributes (AOS, Locomotive Scroll, Webflow interactions). */
export function collectDeclarativeMotion(): DeclarativeMotion[] {
  const out: DeclarativeMotion[] = [];
  const attrs = (el: Element, prefix: string) =>
    Object.fromEntries(Array.from(el.attributes).filter((a) => a.name.startsWith(prefix)).map((a) => [a.name.slice(prefix.length) || 'value', a.value]));
  for (const el of Array.from(document.querySelectorAll('[data-aos]')).slice(0, 200)) out.push({ library: 'AOS', selector: uniqueSelector(el), settings: attrs(el, 'data-aos') });
  for (const el of Array.from(document.querySelectorAll('[data-scroll-speed], [data-scroll-direction]')).slice(0, 200)) {
    out.push({ library: 'Locomotive Scroll', selector: uniqueSelector(el), settings: attrs(el, 'data-scroll') });
  }
  for (const el of Array.from(document.querySelectorAll('[data-w-id]')).slice(0, 200)) out.push({ library: 'Webflow', selector: uniqueSelector(el), settings: attrs(el, 'data-w-id') });
  return out;
}

export interface TraceOptions {
  /** Scroll from top to bottom while tracing. */
  scroll: boolean;
  stepRatio: number;
  stepDelayMs: number;
  /** Time to trace when not scrolling. */
  durationMs: number;
  maxElements: number;
  maxSamplesPerTrack: number;
}

export const TRACE_PROPS = ['transform', 'opacity', 'filter', 'clip-path', 'translate', 'scale', 'rotate', 'background-color', 'color', 'top', 'left'] as const;

/**
 * Samples visual properties of every visible element each frame and returns the ones that changed.
 * With `scroll`, it scrolls through the page meanwhile, so scroll reveals and parallax show up.
 */
export async function traceMotion(options: Partial<TraceOptions> = {}): Promise<Track[]> {
  const opts: TraceOptions = { scroll: true, stepRatio: 0.5, stepDelayMs: 120, durationMs: 2000, maxElements: 500, maxSamplesPerTrack: 240, ...options };
  const fixed = (el: Element) => {
    const p = getComputedStyle(el).position;
    return p === 'fixed' || p === 'sticky';
  };
  // Fixed elements move with scrolling by definition; skip them then, but keep them for pointer sweeps (cursor followers).
  const elements = allElements(document.body)
    .filter((el) => isRendered(el) && !(opts.scroll && fixed(el)))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width >= 8 && r.height >= 8;
    })
    .slice(0, opts.maxElements);

  const last: (string[] | undefined)[] = [];
  const tracks = new Map<string, Track>();
  const start = performance.now();
  // Time and scroll of the previous pass: a track's "before" value was last seen then.
  let prevT = 0;
  let prevY = Math.round(window.scrollY);
  const sample = () => {
    const t = Math.round(performance.now() - start);
    const y = Math.round(window.scrollY);
    elements.forEach((el, index) => {
      const s = getComputedStyle(el);
      const values = TRACE_PROPS.map((p) => s.getPropertyValue(p));
      const prev = last[index];
      prev?.forEach((before, i) => {
        if (values[i] === before) return;
        const key = `${index}|${TRACE_PROPS[i]}`;
        let track = tracks.get(key);
        if (!track) {
          // Seed with the value before the first change.
          track = { selector: uniqueSelector(el), prop: TRACE_PROPS[i], samples: [[prevT, prevY, before]] };
          tracks.set(key, track);
        }
        track.samples.push([t, y, values[i]]);
      });
      last[index] = values;
    });
    prevT = t;
    prevY = y;
  };

  let running = true;
  const loop = () => {
    if (!running) return;
    sample();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  if (opts.scroll) {
    window.scrollTo(0, 0);
    await sleep(opts.stepDelayMs);
    for (let i = 0; i < 400; i++) {
      const before = window.scrollY;
      window.scrollBy(0, Math.round(window.innerHeight * opts.stepRatio));
      await sleep(opts.stepDelayMs);
      if (window.scrollY === before) break;
    }
    await sleep(opts.stepDelayMs * 3);
  } else {
    await sleep(opts.durationMs);
  }
  running = false;
  if (opts.scroll) window.scrollTo(0, 0);

  return Array.from(tracks.values()).map((tr) => ({ ...tr, samples: downsample(tr.samples, opts.maxSamplesPerTrack) }));
}

export interface GsapTween {
  targets: string[];
  vars: Record<string, unknown>;
  duration: number | null;
  delay: number | null;
  startTime: number | null;
  repeat: number | null;
  yoyo: boolean | null;
  scrollTrigger: boolean;
}

export interface LibraryMotion {
  gsap: { version: string | null; tweens: GsapTween[] } | null;
  scrollTriggers: Record<string, unknown>[];
  lottie: Record<string, unknown>[];
}

/**
 * Reads animation libraries' own data (GSAP timelines, ScrollTrigger, Lottie) from the page's
 * MAIN world. Self-contained: it is serialised. Only plain values are returned.
 */
export function probeMotionLibraries(): LibraryMotion {
  const w = window as unknown as Record<string, any>;
  const selectorOf = (el: unknown): string | null => {
    if (!(el instanceof Element)) return typeof el === 'string' ? el : null;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node !== document.documentElement) {
      const current: Element = node;
      if (current.id) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      const parent: Element | null = current.parentElement;
      if (!parent) break;
      const same = Array.from(parent.children).filter((c) => c.tagName === current.tagName);
      const tag = current.tagName.toLowerCase();
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(current) + 1})` : tag);
      node = parent;
    }
    return parts.join(' > ');
  };
  const plain = (vars: Record<string, unknown> | undefined) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(vars ?? {})) {
      if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') out[k] = v;
      else if (k === 'ease' && v && typeof v === 'function') out[k] = 'custom';
    }
    return out;
  };
  const result: LibraryMotion = { gsap: null, scrollTriggers: [], lottie: [] };
  const limit = 200;

  try {
    const gsap = w.gsap;
    if (gsap && typeof gsap === 'object' && gsap.globalTimeline?.getChildren) {
      const tweens = (gsap.globalTimeline.getChildren(true, true, false) as any[]).slice(0, limit).map((t) => ({
        targets: (typeof t.targets === 'function' ? t.targets() : []).slice(0, 20).map(selectorOf).filter(Boolean),
        vars: plain(t.vars),
        duration: typeof t.duration === 'function' ? t.duration() : null,
        delay: typeof t.delay === 'function' ? t.delay() : null,
        startTime: typeof t.startTime === 'function' ? t.startTime() : null,
        repeat: typeof t.repeat === 'function' ? t.repeat() : null,
        yoyo: typeof t.yoyo === 'function' ? t.yoyo() : null,
        scrollTrigger: !!t.scrollTrigger,
      }));
      result.gsap = { version: typeof gsap.version === 'string' ? gsap.version : null, tweens };
    }
  } catch {
    // A page can break its own GSAP objects; report nothing rather than fail.
  }
  try {
    const st = w.ScrollTrigger;
    if (st && typeof st.getAll === 'function') {
      result.scrollTriggers = (st.getAll() as any[]).slice(0, limit).map((s) => ({
        trigger: selectorOf(s.trigger ?? s.vars?.trigger),
        start: typeof s.vars?.start === 'string' ? s.vars.start : s.start,
        end: typeof s.vars?.end === 'string' ? s.vars.end : s.end,
        scrub: s.vars?.scrub ?? false,
        pin: !!s.vars?.pin,
        toggleActions: s.vars?.toggleActions ?? null,
      }));
    }
  } catch {
    // Ignore.
  }
  try {
    const lottie = w.lottie ?? w.bodymovin;
    if (lottie && typeof lottie.getRegisteredAnimations === 'function') {
      result.lottie = (lottie.getRegisteredAnimations() as any[]).slice(0, limit).map((a) => ({
        name: a.name ?? null,
        path: typeof a.path === 'string' ? a.path + (a.fileName ?? '') : null,
        container: selectorOf(a.wrapper),
        totalFrames: a.totalFrames ?? null,
        frameRate: a.frameRate ?? null,
        renderer: a.renderer?.rendererType ?? null,
      }));
    }
  } catch {
    // Ignore.
  }
  return result;
}
