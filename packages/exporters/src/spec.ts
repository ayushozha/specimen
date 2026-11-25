import { cubicBezierOf, parseTransform, parseTransformFunctions, type AnimationInfo, type Rect, type StyleChange } from '@specimen/core';

/** Animated properties every exporter understands. Translation in CSS px, rotation in degrees. */
export type AnimProp = 'opacity' | 'tx' | 'ty' | 'scale' | 'rotate';

export interface SpecKeyframe {
  /** 0–1 within one iteration. */
  offset: number;
  value: number;
  /** Easing of the segment that starts at this keyframe. */
  easing: string;
}

/** One animation in a tool-neutral form: what After Effects, Lottie and code generators consume. */
export interface AnimationSpec {
  name: string;
  selector: string | null;
  trigger: 'load' | 'loop' | 'hover' | 'scroll';
  durationMs: number;
  delayMs: number;
  iterations: number | 'infinite';
  direction: string;
  /** Element box in page coordinates at the desktop breakpoint, when known. */
  rect: Rect | null;
  tracks: Partial<Record<AnimProp, SpecKeyframe[]>>;
}

const PROPS: AnimProp[] = ['opacity', 'tx', 'ty', 'scale', 'rotate'];

function partsOf(transform: string | undefined, matrix: boolean) {
  const t = matrix ? parseTransform(transform ?? 'none') : parseTransformFunctions(transform ?? 'none');
  return { tx: t.tx, ty: t.ty, scale: t.sx, rotate: t.rotate };
}

/** Removes tracks whose value never changes. */
function prune(tracks: AnimationSpec['tracks']): AnimationSpec['tracks'] {
  const out: AnimationSpec['tracks'] = {};
  for (const p of PROPS) {
    const keys = tracks[p];
    if (keys && keys.some((k) => Math.abs(k.value - keys[0].value) > 1e-4)) out[p] = keys;
  }
  return out;
}

/** From a CSS animation or Web Animation read by `collectAnimations`. */
export function specFromAnimation(info: AnimationInfo & { rect?: Rect | null }): AnimationSpec {
  const tracks: AnimationSpec['tracks'] = {};
  const frames = info.keyframes as { offset?: number; computedOffset?: number; easing?: string; transform?: string; opacity?: string }[];
  frames.forEach((k, i) => {
    const offset = Number(k.computedOffset ?? k.offset ?? i / Math.max(1, frames.length - 1));
    const easing = k.easing && k.easing !== 'linear' ? k.easing : info.easing;
    if (k.opacity !== undefined) (tracks.opacity ??= []).push({ offset, value: Number(k.opacity), easing });
    if (k.transform !== undefined) {
      const parts = partsOf(k.transform, false);
      for (const p of ['tx', 'ty', 'scale', 'rotate'] as const) (tracks[p] ??= []).push({ offset, value: parts[p], easing });
    }
  });
  return {
    name: info.name,
    selector: info.target,
    trigger: info.iterations === 'infinite' ? 'loop' : 'load',
    durationMs: info.duration,
    delayMs: info.delay,
    iterations: info.iterations,
    direction: info.direction,
    rect: info.rect ?? null,
    tracks: prune(tracks),
  };
}

/** From a hover/focus effect: the element's own transform/opacity change and its transition timing. */
export function specFromInteraction(
  effect: { selector: string; label: string; changes: StyleChange[]; transitions: { property: string; duration: number; delay: number; easing: string }[]; rect?: Rect | null },
): AnimationSpec | null {
  const own = effect.changes.filter((c) => c.path === '');
  const timing = (prop: string) => effect.transitions.find((t) => t.property === prop || t.property === 'all') ?? effect.transitions[0];
  const tracks: AnimationSpec['tracks'] = {};
  let durationMs = 0;
  let delayMs = 0;
  for (const c of own) {
    const t = timing(c.prop);
    if (!t) continue;
    durationMs = Math.max(durationMs, t.duration);
    delayMs = t.delay;
    if (c.prop === 'opacity') tracks.opacity = [{ offset: 0, value: Number(c.from), easing: t.easing }, { offset: 1, value: Number(c.to), easing: t.easing }];
    if (c.prop === 'transform') {
      const a = partsOf(c.from, true);
      const b = partsOf(c.to, true);
      for (const p of ['tx', 'ty', 'scale', 'rotate'] as const) tracks[p] = [{ offset: 0, value: a[p], easing: t.easing }, { offset: 1, value: b[p], easing: t.easing }];
    }
    // The individual transform properties (`translate: 4px`, `scale: 1.05`, `rotate: 10deg`).
    const key = (p: AnimProp, from: number, to: number) => (tracks[p] = [{ offset: 0, value: from, easing: t.easing }, { offset: 1, value: to, easing: t.easing }]);
    if (c.prop === 'translate') {
      const xy = (v: string) => (v === 'none' ? [0, 0] : v.split(/\s+/).map((n) => parseFloat(n) || 0));
      const [ax, ay = 0] = xy(c.from);
      const [bx, by = 0] = xy(c.to);
      key('tx', ax, bx);
      key('ty', ay, by);
    }
    if (c.prop === 'scale') key('scale', c.from === 'none' ? 1 : parseFloat(c.from), c.to === 'none' ? 1 : parseFloat(c.to));
    if (c.prop === 'rotate') key('rotate', c.from === 'none' ? 0 : parseFloat(c.from), c.to === 'none' ? 0 : parseFloat(c.to));
  }
  const pruned = prune(tracks);
  if (!durationMs || Object.keys(pruned).length === 0) return null;
  return { name: `${effect.label} hover`, selector: effect.selector, trigger: 'hover', durationMs, delayMs, iterations: 1, direction: 'normal', rect: effect.rect ?? null, tracks: pruned };
}

/** Value of a track at an offset (0–1), honouring each segment's easing. */
export function valueAt(keys: SpecKeyframe[], offset: number, evaluate: (bezier: [number, number, number, number], x: number) => number): number {
  if (offset <= keys[0].offset) return keys[0].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (offset <= b.offset) {
      const local = (offset - a.offset) / Math.max(1e-9, b.offset - a.offset);
      return a.value + (b.value - a.value) * evaluate(cubicBezierOf(a.easing), local);
    }
  }
  return keys[keys.length - 1].value;
}

export const SPEC_PROPS = PROPS;
