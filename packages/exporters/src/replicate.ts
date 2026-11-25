import { cubicBezierOf, easingFunction, parseColor, evaluateBezier, isBezierEasing, linearStopsOf, parseTransform, type AnimationInfo, type Rect, type Sample, type StyleChange, type TrackKind } from '@specimen/core';
import { fitEasing, springAt, type EasingFit, type ProgressSample } from './fit';
import { specFromAnimation, specFromInteraction, type AnimProp, type AnimationSpec } from './spec';

/** What phase 2 recorded for one section (structurally the extension's SectionMotion). */
export interface ReplicateInput {
  animations: (AnimationInfo & { rect: Rect | null })[];
  interactions: { selector: string; label: string; trigger: 'hover' | 'focus'; changes: StyleChange[]; transitions: { property: string; duration: number; delay: number; easing: string }[]; rect: Rect }[];
  tracks: { selector: string; prop: string; samples: Sample[]; kind: TrackKind; rect?: Rect | null }[];
  gsap?: { targets: string[]; vars: Record<string, unknown>; duration: number | null; delay: number | null; repeat: number | null; yoyo: boolean | null; scrollTrigger: boolean }[];
}

/**
 * Fitted effects below this match are not turned into code: the recording (video) is the reference
 * for them. They stay listed, with their score, in replication.json.
 */
export const MIN_FIT_SCORE = 0.8;

export type ReplicaTrigger = 'loop' | 'load' | 'hover' | 'scroll-reveal' | 'scroll-linked';

export interface Replica {
  id: string;
  name: string;
  selector: string;
  trigger: ReplicaTrigger;
  /** Where the timing came from: read from the page, or fitted to recorded motion. */
  source: 'css-animation' | 'css-transition' | 'gsap' | 'fitted';
  spec: AnimationSpec | null;
  easing: EasingFit | null;
  scroll: { start: number; end: number } | null;
  /** Scroll-linked effects: each property's own scroll range (px), values and curve. */
  ranges?: Partial<Record<AnimProp, { start: number; end: number; from: number; to: number; easing: string }>>;
  /** 1 = reproduces the original exactly; fitted effects report how close the fit is. */
  score: number;
  rect: Rect | null;
  css: string;
  gsap: string;
  motion: string;
}

/**
 * Page-controlled text (animation names, labels, selectors) placed in a generated comment: no line
 * breaks (would end a // comment) and no comment terminators (would end a block comment).
 */
export function commentText(s: string): string {
  return s.replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/\*\//g, '* /').replace(/\/\*/g, '/ *');
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const fixed = (v: number, d = 3) => String(Math.round(v * 10 ** d) / 10 ** d);
const MOTION_KEY: Record<AnimProp, string> = { opacity: 'opacity', tx: 'x', ty: 'y', scale: 'scale', rotate: 'rotate' };
const GSAP_KEY: Record<AnimProp, string> = { opacity: 'opacity', tx: 'x', ty: 'y', scale: 'scale', rotate: 'rotation' };

/** Numeric series for a traced property (transform split into its parts). */
function series(prop: string, samples: Sample[]): Partial<Record<AnimProp, [number, number, number][]>> {
  if (prop === 'opacity') return { opacity: samples.map(([t, y, v]) => [t, y, Number(v)]) };
  if (prop === 'translate') {
    const xy = samples.map(([t, y, v]) => ({ t, y, p: v === 'none' ? [0, 0] : v.split(/\s+/).map((n) => parseFloat(n) || 0) }));
    return { tx: xy.map((s) => [s.t, s.y, s.p[0] ?? 0]), ty: xy.map((s) => [s.t, s.y, s.p[1] ?? 0]) };
  }
  if (prop === 'scale') return { scale: samples.map(([t, y, v]) => [t, y, v === 'none' ? 1 : parseFloat(v)]) };
  if (prop === 'rotate') return { rotate: samples.map(([t, y, v]) => [t, y, v === 'none' ? 0 : parseFloat(v)]) };
  if (prop !== 'transform') return {};
  const parts = samples.map(([t, y, v]) => ({ t, y, m: parseTransform(v) }));
  return {
    tx: parts.map((p) => [p.t, p.y, p.m.tx]),
    ty: parts.map((p) => [p.t, p.y, p.m.ty]),
    scale: parts.map((p) => [p.t, p.y, p.m.sx]),
    rotate: parts.map((p) => [p.t, p.y, p.m.rotate]),
  };
}

/** Turns phase 2's recordings into reproducible effects with CSS, GSAP and Motion code. */
export function replicate(input: ReplicateInput, idPrefix = 'fx'): Replica[] {
  const out: Replica[] = [];
  const add = (r: Omit<Replica, 'id' | 'css' | 'gsap' | 'motion'> & Partial<Pick<Replica, 'css' | 'gsap' | 'motion'>>) => {
    const id = `${idPrefix}-${out.length + 1}`;
    const full: Replica = { ...r, id, css: '', gsap: '', motion: '' };
    full.css = r.css ?? cssFor(full);
    full.gsap = r.gsap ?? gsapFor(full);
    full.motion = r.motion ?? motionFor(full);
    out.push(full);
  };

  // CSS animations: the page's own keyframes, exactly.
  for (const a of input.animations) {
    if (!a.target) continue;
    const spec = specFromAnimation(a);
    add({ name: a.name, selector: a.target, trigger: spec.trigger === 'loop' ? 'loop' : 'load', source: 'css-animation', spec, easing: null, scroll: null, score: 1, rect: a.rect, css: cssAnimation(a, `${idPrefix}-${out.length + 1}`) });
  }

  // Hover: the computed before/after values and the browser's transition timing.
  for (const e of input.interactions) {
    if (e.trigger !== 'hover') continue;
    const spec = specFromInteraction(e);
    const colors = colorHover(e);
    add({ name: `${e.label} hover`, selector: e.selector, trigger: 'hover', source: 'css-transition', spec, easing: null, scroll: null, score: 1, rect: e.rect, css: cssHover(e), ...(spec ? {} : colors) });
  }

  // GSAP tweens: the library's own settings.
  for (const t of input.gsap ?? []) {
    if (!t.targets.length) continue;
    const vars = { ...t.vars };
    if (t.duration !== null && vars.duration === undefined) vars.duration = t.duration;
    const gsapCode = `gsap.to(${JSON.stringify(t.targets.join(', '))}, ${JSON.stringify(vars, null, 2)});\n`;
    add({ name: `GSAP tween on ${t.targets[0]}`, selector: t.targets[0], trigger: t.scrollTrigger ? 'scroll-reveal' : 'load', source: 'gsap', spec: null, easing: null, scroll: null, score: 1, rect: null, gsap: gsapCode, css: '/* Driven by GSAP; see the .gsap.js file. */\n', motion: '// Driven by GSAP; see the .gsap.js file.\n' });
  }

  // Everything else that moved during the scroll pass: fit it.
  const groups = new Map<string, { kind: 'scroll-reveal' | 'scroll-linked'; rect: Rect | null; parts: Partial<Record<AnimProp, [number, number, number][]>> }>();
  const animated = new Set(input.animations.map((a) => a.target));
  for (const track of input.tracks) {
    if ((track.kind !== 'scroll-reveal' && track.kind !== 'scroll-linked') || animated.has(track.selector)) continue;
    const g = groups.get(track.selector) ?? { kind: track.kind as 'scroll-reveal' | 'scroll-linked', rect: track.rect ?? null, parts: {} };
    Object.assign(g.parts, series(track.prop, track.samples));
    groups.set(track.selector, g);
  }
  for (const [selector, g] of groups) {
    const fitted = g.kind === 'scroll-reveal' ? fitReveal(g.parts) : fitLinked(g.parts);
    if (!fitted) continue;
    add({ name: g.kind === 'scroll-reveal' ? 'Scroll reveal' : 'Scroll-linked motion', selector, trigger: g.kind, source: 'fitted', rect: g.rect, ...fitted });
  }
  return out;
}

/** A one-off transition when the element scrolls into view: fit the easing on the property that moved most. */
function fitReveal(parts: Partial<Record<AnimProp, [number, number, number][]>>): Pick<Replica, 'spec' | 'easing' | 'scroll' | 'score'> | null {
  const moves = (Object.entries(parts) as [AnimProp, [number, number, number][]][])
    .map(([prop, s]) => {
      const first = s.findIndex((p, i) => i > 0 && p[2] !== s[i - 1][2]);
      if (first < 0) return null;
      let last = first;
      for (let i = first; i < s.length; i++) if (s[i][2] !== s[i - 1][2]) last = i;
      const v0 = s[first - 1][2];
      const v1 = s[last][2];
      if (Math.abs(v1 - v0) < 1e-3) return null;
      const t0 = s[first - 1][0];
      return { prop, v0, v1, t0, t1: s[last][0], points: s.slice(first - 1, last + 1) };
    })
    .filter((m): m is NonNullable<typeof m> => !!m);
  if (!moves.length) return null;
  const t0 = Math.min(...moves.map((m) => m.t0));
  const duration = Math.max(16, Math.max(...moves.map((m) => m.t1)) - t0);
  const progress = (m: (typeof moves)[number]): ProgressSample[] => m.points.map(([t, , v]) => [(t - t0) / duration, (v - m.v0) / (m.v1 - m.v0)]);
  // The property with the most in-between samples describes the curve best.
  const main = moves.reduce((a, b) => (b.points.length > a.points.length ? b : a));
  if (main.points.length < MIN_CURVE_POINTS) return { spec: null, easing: null, scroll: null, score: 0 };
  const easing = fitEasing(progress(main), duration);
  const curve = (u: number) => (easing.spring ? springAt((u * duration) / 1000, easing.spring.stiffness, easing.spring.damping, easing.spring.mass) : evaluateBezier(easing.bezier ?? [0, 0, 1, 1], u));
  // Score every property against the shared easing; the effect is as good as its worst property.
  const score = Math.min(...moves.map((m) => 1 - Math.sqrt(progress(m).reduce((s, [u, p]) => s + (curve(Math.min(1, u)) - p) ** 2, 0) / m.points.length)));
  const tracks: AnimationSpec['tracks'] = {};
  for (const m of moves) tracks[m.prop] = [{ offset: 0, value: m.v0, easing: easing.css }, { offset: 1, value: m.v1, easing: easing.css }];
  return {
    spec: { name: 'reveal', selector: null, trigger: 'scroll', durationMs: Math.round(duration), delayMs: 0, iterations: 1, direction: 'normal', rect: null, tracks },
    easing,
    scroll: null,
    score: round(Math.max(0, score)),
  };
}

/** Fewer measured points than this between start and end can't show a curve: no score, no code. */
export const MIN_CURVE_POINTS = 5;

/**
 * Motion tied to scroll position: finds the scroll range over which each property moves and fits the
 * curve of value against scroll within it (linear for most parallax, eased for scrubbed timelines).
 */
function fitLinked(parts: Partial<Record<AnimProp, [number, number, number][]>>): Pick<Replica, 'spec' | 'easing' | 'scroll' | 'score' | 'ranges'> | null {
  const moves = (Object.entries(parts) as [AnimProp, [number, number, number][]][])
    .map(([prop, s]) => {
      // One value per scroll position (the settled one), in scroll order.
      const byY = new Map<number, number>();
      for (const [, y, v] of s) byY.set(y, v);
      const pts = [...byY].sort((a, b) => a[0] - b[0]);
      const first = pts.findIndex((p, i) => i > 0 && Math.abs(p[1] - pts[i - 1][1]) > 1e-4);
      if (first < 0) return null;
      let last = first;
      for (let i = first; i < pts.length; i++) if (Math.abs(pts[i][1] - pts[i - 1][1]) > 1e-4) last = i;
      const active = pts.slice(first - 1, last + 1);
      const v0 = active[0][1];
      const v1 = active[active.length - 1][1];
      if (Math.abs(v1 - v0) < 1e-3) return null;
      // The motion starts and stops somewhere between two measured positions: follow the slope next
      // to each end to where it meets the resting value (kept between those two positions).
      const edge = (a: readonly [number, number], b: readonly [number, number], rest: number, lo: number, hi: number) => {
        const slope = (b[1] - a[1]) / (b[0] - a[0] || 1);
        const y = Math.abs(slope) > 1e-9 ? a[0] + (rest - a[1]) / slope : lo;
        return Math.min(hi, Math.max(lo, y));
      };
      let y0 = active[0][0];
      let y1 = active[active.length - 1][0];
      if (active.length >= 4) {
        y0 = edge(active[1], active[2], v0, active[0][0], active[1][0]);
        y1 = edge(active[active.length - 3], active[active.length - 2], v1, active[active.length - 2][0], active[active.length - 1][0]);
        active[0] = [y0, v0];
        active[active.length - 1] = [y1, v1];
      }
      return { prop, v0, v1, y0, y1, active };
    })
    .filter((m): m is NonNullable<typeof m> => !!m);
  if (!moves.length) return null;
  // Each property keeps its own scroll range and curve: a hero can fade over 300px while it drifts over 900px.
  const ranges: NonNullable<Replica['ranges']> = {};
  let worst = 1;
  let enough = true;
  for (const m of moves) {
    const span = Math.max(1, m.y1 - m.y0);
    const pr: ProgressSample[] = m.active.map(([y, v]) => [(y - m.y0) / span, (v - m.v0) / (m.v1 - m.v0)]);
    const e = fitEasing(pr, 0);
    const curve = (u: number) => evaluateBezier(e.bezier ?? [0, 0, 1, 1], Math.min(1, Math.max(0, u)));
    worst = Math.min(worst, 1 - Math.sqrt(pr.reduce((a, [u, q]) => a + (curve(u) - q) ** 2, 0) / pr.length));
    enough &&= m.active.length >= MIN_CURVE_POINTS;
    ranges[m.prop] = { start: Math.round(m.y0), end: Math.round(m.y1), from: m.v0, to: m.v1, easing: e.css };
  }
  const y0 = Math.min(...moves.map((m) => m.y0));
  const y1 = Math.max(...moves.map((m) => m.y1));
  const span = Math.max(1, y1 - y0);
  // The same motion as keyframes over the whole range (After Effects, Lottie): holds, then the curve.
  const tracks: AnimationSpec['tracks'] = {};
  for (const [prop, r] of Object.entries(ranges) as [AnimProp, NonNullable<Replica['ranges']>[AnimProp]][]) {
    const a = (r!.start - y0) / span;
    const b = (r!.end - y0) / span;
    tracks[prop] = [
      ...(a > 0 ? [{ offset: 0, value: r!.from, easing: 'linear' }] : []),
      { offset: a, value: r!.from, easing: r!.easing },
      { offset: b, value: r!.to, easing: 'linear' },
      ...(b < 1 ? [{ offset: 1, value: r!.to, easing: 'linear' }] : []),
    ];
  }
  const main = moves.reduce((a, b) => (b.active.length > a.active.length ? b : a));
  return {
    spec: { name: 'scroll-linked', selector: null, trigger: 'scroll', durationMs: 0, delayMs: 0, iterations: 1, direction: 'normal', rect: null, tracks },
    easing: { kind: 'named', css: ranges[main.prop]!.easing, bezier: cubicBezierOf(ranges[main.prop]!.easing), spring: null, score: round(worst) },
    scroll: { start: Math.round(y0), end: Math.round(y1) },
    ranges,
    // Too few measured points can't show a curve: report no match rather than a perfect one.
    score: enough ? round(Math.max(0, worst)) : 0,
  };
}

// ---------- CSS ----------

function transformCss(v: Partial<Record<AnimProp, number>>): string | null {
  const parts: string[] = [];
  if (v.tx || v.ty) parts.push(`translate(${fixed(v.tx ?? 0, 2)}px, ${fixed(v.ty ?? 0, 2)}px)`);
  if (v.scale !== undefined && v.scale !== 1) parts.push(`scale(${fixed(v.scale)})`);
  if (v.rotate) parts.push(`rotate(${fixed(v.rotate, 2)}deg)`);
  return parts.length ? parts.join(' ') : v.tx !== undefined || v.ty !== undefined || v.scale !== undefined || v.rotate !== undefined ? 'none' : null;
}

function stateAt(spec: AnimationSpec, end: 0 | 1): { css: string[]; values: Partial<Record<AnimProp, number>> } {
  const values: Partial<Record<AnimProp, number>> = {};
  for (const [p, keys] of Object.entries(spec.tracks) as [AnimProp, AnimationSpec['tracks'][AnimProp]][]) values[p] = keys![end === 0 ? 0 : keys!.length - 1].value;
  const css: string[] = [];
  if (values.opacity !== undefined) css.push(`opacity: ${fixed(values.opacity)};`);
  const t = transformCss(values);
  if (t) css.push(`transform: ${t};`);
  return { css, values };
}

function cssAnimation(a: AnimationInfo, name: string): string {
  const frames = (a.keyframes as Record<string, unknown>[]).map((k) => {
    const offset = Number(k.computedOffset ?? k.offset ?? 0);
    const decls = Object.entries(k)
      .filter(([key, v]) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key) && v !== undefined && v !== '')
      .map(([key, v]) => `${kebab(key)}: ${v};`);
    if (k.easing && k.easing !== 'linear') decls.push(`animation-timing-function: ${k.easing};`);
    return `  ${fixed(offset * 100, 2)}% { ${decls.join(' ')} }`;
  });
  const iterations = a.iterations === 'infinite' ? 'infinite' : a.iterations;
  return `/* ${commentText(a.name)}: the page's own keyframes and timing */
@keyframes ${name} {
${frames.join('\n')}
}
${a.target} {
  animation: ${name} ${a.duration}ms ${a.easing} ${a.delay}ms ${iterations} ${a.direction} ${a.fill === 'auto' ? 'none' : a.fill};
}
`;
}

/** Colour properties a hover can animate in GSAP and Motion, by their camelCase names. */
const COLOR_PROPS = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke'];

/**
 * GSAP and Motion code for a hover that only changes colours (no transform or opacity): the element's
 * own colour changes with the page's transition timing. Empty when there are none.
 */
function colorHover(e: ReplicateInput['interactions'][number]): { gsap: string; motion: string } {
  const own = e.changes.filter((c) => c.path === '' && COLOR_PROPS.includes(c.prop));
  const t = e.transitions.find((x) => own.some((c) => c.prop === x.property) || x.property === 'all') ?? e.transitions[0];
  if (!own.length || !t) return { gsap: '', motion: '' };
  const camel = (p: string) => p.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  // GSAP and Motion blend rgba channels; browsers blend premultiplied, so a fade from transparent keeps
  // the target's hue. Give a fully transparent end the other end's colour to match.
  const rgba = (v: string, other: string) => {
    const a = parseColor(v)?.rgba;
    const b = parseColor(other)?.rgba;
    if (!a) return v;
    const c = a.alpha === 0 && b ? { ...b, alpha: 0 } : a;
    return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${fixed(c.alpha, 4)})`;
  };
  const from = Object.fromEntries(own.map((c) => [camel(c.prop), rgba(c.from, c.to)]));
  const to = Object.fromEntries(own.map((c) => [camel(c.prop), rgba(c.to, c.from)]));
  const sec = Number(fixed(t.duration / 1000));
  const delay = Number(fixed(t.delay / 1000));
  const sel = JSON.stringify(e.selector);
  const bez = cubicBezierOf(t.easing);
  const gsapEaseRef = !isBezierEasing(t.easing) ? motionEase(t.easing) : t.easing === 'linear' ? '"none"' : `CustomEase.create("${e.label.replace(/\W+/g, '-')}-hover", "M0,0 C${bez[0]},${bez[1]} ${bez[2]},${bez[3]} 1,1")`;
  const name = `${e.label.replace(/[^A-Za-z0-9]+/g, ' ').trim().replace(/(^|\s)(\w)/g, (_m, _s, c: string) => c.toUpperCase()) || 'Effect'}Hover`.replace(/^\d/, 'E$&');
  return {
    gsap: `// ${commentText(e.label)} hover\ndocument.querySelectorAll(${sel}).forEach((el) => {\n  el.addEventListener("mouseenter", () => gsap.to(el, { ...${JSON.stringify(to)}, duration: ${sec}, delay: ${delay}, ease: ${gsapEaseRef} }));\n  el.addEventListener("mouseleave", () => gsap.to(el, { ...${JSON.stringify(from)}, duration: ${sec}, delay: ${delay}, ease: ${gsapEaseRef} }));\n});\n`,
    motion: `// ${commentText(e.label)} hover — ${commentText(e.selector)}\nexport function ${name}(props) {\n  return <motion.div {...props} initial={${JSON.stringify(from)}} whileHover={${JSON.stringify(to)}} transition={${withEases({ duration: sec, delay, ease: '__ease0__' }, [motionEase(t.easing)])}} />;\n}\n`,
  };
}

function cssHover(e: ReplicateInput['interactions'][number]): string {
  const sel = (path: string) => (path ? `${e.selector}${path.split('.').map((i) => ` > :nth-child(${Number(i) + 1})`).join('')}` : e.selector);
  const byPath = new Map<string, StyleChange[]>();
  for (const c of e.changes) byPath.set(c.path, [...(byPath.get(c.path) ?? []), c]);
  const transition = e.transitions.length ? e.transitions.map((t) => `${t.property} ${t.duration}ms ${t.easing}${t.delay ? ` ${t.delay}ms` : ''}`).join(', ') : null;
  const rules = [...byPath].map(([path, changes]) => {
    const base = sel(path);
    const hoverSel = path ? `${e.selector}:hover${base.slice(e.selector.length)}` : `${e.selector}:hover`;
    return `${hoverSel} {\n${changes.map((c) => `  ${c.prop}: ${c.to};`).join('\n')}\n}`;
  });
  return `/* ${commentText(e.label)}: hover, with the page's computed values and transition */
${transition ? `${e.selector} {\n  transition: ${transition};\n}\n` : ''}${rules.join('\n')}
`;
}

/**
 * A scroll-linked replica's properties as CSS animations. Transform parts that share one scroll range and
 * curve stay one `transform` animation, as the page wrote it (so a static `translate` on the element is
 * kept). Parts with ranges of their own use the individual `translate`, `scale` and `rotate` properties.
 */
function linkedGroups(r: Replica): { name: string; from: string; to: string; start: number; end: number; easing: string }[] {
  const g: { name: string; from: string; to: string; start: number; end: number; easing: string }[] = [];
  const R = r.ranges!;
  const parts = (['tx', 'ty', 'scale', 'rotate'] as const).filter((p) => R[p]);
  const same = parts.every((p) => R[p]!.start === R[parts[0]]!.start && R[p]!.end === R[parts[0]]!.end && R[p]!.easing === R[parts[0]]!.easing);
  if (parts.length && same) {
    const at = (end: 'from' | 'to') => transformCss({ tx: R.tx?.[end], ty: R.ty?.[end], scale: R.scale?.[end], rotate: R.rotate?.[end] }) ?? 'none';
    const a = R[parts[0]]!;
    g.push({ name: 'transform', from: `transform: ${at('from')};`, to: `transform: ${at('to')};`, start: a.start, end: a.end, easing: a.easing });
  } else {
    if (R.tx || R.ty) {
      const a = R.tx ?? R.ty!;
      g.push({ name: 'translate', from: `translate: ${fixed(R.tx?.from ?? 0, 2)}px ${fixed(R.ty?.from ?? 0, 2)}px;`, to: `translate: ${fixed(R.tx?.to ?? 0, 2)}px ${fixed(R.ty?.to ?? 0, 2)}px;`, start: Math.min(R.tx?.start ?? Infinity, R.ty?.start ?? Infinity), end: Math.max(R.tx?.end ?? -Infinity, R.ty?.end ?? -Infinity), easing: a.easing });
    }
    if (R.scale) g.push({ name: 'scale', from: `scale: ${fixed(R.scale.from)};`, to: `scale: ${fixed(R.scale.to)};`, start: R.scale.start, end: R.scale.end, easing: R.scale.easing });
    if (R.rotate) g.push({ name: 'rotate', from: `rotate: ${fixed(R.rotate.from, 2)}deg;`, to: `rotate: ${fixed(R.rotate.to, 2)}deg;`, start: R.rotate.start, end: R.rotate.end, easing: R.rotate.easing });
  }
  if (R.opacity) g.push({ name: 'opacity', from: `opacity: ${fixed(R.opacity.from)};`, to: `opacity: ${fixed(R.opacity.to)};`, start: R.opacity.start, end: R.opacity.end, easing: R.opacity.easing });
  return g;
}

export function cssFor(r: Replica): string {
  if (!r.spec) return '';
  const from = stateAt(r.spec, 0);
  const to = stateAt(r.spec, 1);
  if (r.trigger === 'scroll-reveal') {
    const props = [from.values.opacity !== undefined ? 'opacity' : null, transformCss(from.values) ? 'transform' : null].filter(Boolean);
    return `/* ${commentText(r.name)}: fitted to the recorded motion (match ${Math.round(r.score * 100)}%). Add .is-visible when it enters the viewport. */
${r.selector} {
  ${from.css.join('\n  ')}
  transition: ${props.map((p) => `${p} ${r.spec!.durationMs}ms ${r.easing?.css ?? 'ease'}`).join(', ')};
}
${r.selector}.is-visible {
  ${to.css.join('\n  ')}
}
`;
  }
  if (r.trigger === 'scroll-linked' && r.ranges) {
    // One scroll-driven animation per property, each over its own range with its own curve. Individual
    // transform properties (translate, scale, rotate) let them run side by side.
    const groups = linkedGroups(r);
    return `/* ${commentText(r.name)}: tied to scroll position (match ${Math.round(r.score * 100)}%) */
${groups.map((g) => `@keyframes ${r.id}-${g.name} {
  from { ${g.from} animation-timing-function: ${g.easing}; }
  to { ${g.to} }
}`).join('\n')}
${r.selector} {
  animation: ${groups.map((g) => `${r.id}-${g.name} linear both`).join(', ')};
  animation-timeline: ${groups.map(() => 'scroll(root)').join(', ')};
  animation-range: ${groups.map((g) => `${g.start}px ${g.end}px`).join(', ')};
}
`;
  }
  return '';
}

// ---------- GSAP ----------

function gsapEase(r: Replica, easing: string): { ref: string; setup: string } {
  if (easing === 'linear') return { ref: '"none"', setup: '' };
  if (r.easing?.spring) {
    // The fitted spring itself, as a function of progress over the effect's duration.
    const { stiffness: k, damping: c, mass: m } = r.easing.spring;
    const T = (r.spec?.durationMs ?? 1000) / 1000;
    return { ref: `((p) => { if (p >= 1) return 1; const t = p * ${T}, w0 = Math.sqrt(${k} / ${m}), z = ${c} / (2 * Math.sqrt(${k} * ${m})); if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t)); } return 1 - Math.exp(-w0 * t) * (1 + w0 * t); })`, setup: '' };
  }
  // linear() and steps(): GSAP takes any function of progress, so the page's own curve is used as is
  // (a CustomEase path would smooth a spring's sharp peaks).
  if (!isBezierEasing(easing)) return { ref: motionEase(easing), setup: '' };
  const [x1, y1, x2, y2] = cubicBezierOf(easing);
  const id = `${r.id}-${[x1, y1, x2, y2].join('-').replace(/\./g, '_')}`;
  return { ref: `"${id}"`, setup: `CustomEase.create("${id}", "M0,0 C${x1},${y1} ${x2},${y2} 1,1");\n` };
}

function gsapVars(values: Partial<Record<AnimProp, number>>): Record<string, number> {
  return Object.fromEntries(Object.entries(values).map(([p, v]) => [GSAP_KEY[p as AnimProp], Number(fixed(v!))]));
}

export function gsapFor(r: Replica): string {
  const spec = r.spec;
  if (!spec) return '';
  const sel = JSON.stringify(r.selector);
  const sec = (ms: number) => Number(fixed(ms / 1000));
  if (r.trigger === 'loop' || r.trigger === 'load') {
    const offsets = [...new Set(Object.values(spec.tracks).flatMap((k) => k!.map((x) => x.offset)))].sort((a, b) => a - b);
    let setup = '';
    const steps = offsets.slice(1).map((o, i) => {
      const prev = offsets[i];
      const values: Partial<Record<AnimProp, number>> = {};
      let easing = 'linear';
      for (const [p, keys] of Object.entries(spec.tracks) as [AnimProp, AnimationSpec['tracks'][AnimProp]][]) {
        const k = keys!.find((x) => x.offset === o);
        if (k) values[p] = k.value;
        easing = keys!.find((x) => x.offset === prev)?.easing ?? easing;
      }
      const e = gsapEase(r, easing);
      setup += e.setup;
      return `  .to(${sel}, ${JSON.stringify({ ...gsapVars(values), duration: sec((o - prev) * spec.durationMs) }).slice(0, -1)}, "ease": ${e.ref} })`;
    });
    const first = Object.fromEntries((Object.entries(spec.tracks) as [AnimProp, AnimationSpec['tracks'][AnimProp]][]).map(([p, k]) => [GSAP_KEY[p], k![0].value]));
    const repeat = r.trigger === 'loop' ? ', repeat: -1' : '';
    return `// ${commentText(r.name)}\n${setup}gsap.set(${sel}, ${JSON.stringify(first)});\ngsap.timeline({ delay: ${sec(spec.delayMs)}${repeat} })\n${steps.join('\n')};\n`;
  }
  const from = gsapVars(stateAt(spec, 0).values);
  const to = gsapVars(stateAt(spec, 1).values);
  const firstEasing = Object.values(spec.tracks)[0]![0].easing;
  const e = gsapEase(r, firstEasing);
  if (r.trigger === 'hover') {
    return `// ${commentText(r.name)}\n${e.setup}document.querySelectorAll(${sel}).forEach((el) => {\n  el.addEventListener("mouseenter", () => gsap.to(el, { ...${JSON.stringify(to)}, duration: ${sec(spec.durationMs)}, ease: ${e.ref} }));\n  el.addEventListener("mouseleave", () => gsap.to(el, { ...${JSON.stringify(from)}, duration: ${sec(spec.durationMs)}, ease: ${e.ref} }));\n});\n`;
  }
  if (r.trigger === 'scroll-reveal') {
    return `// ${commentText(r.name)} (match ${Math.round(r.score * 100)}%)\n${e.setup}gsap.fromTo(${sel}, ${JSON.stringify(from)}, { ...${JSON.stringify(to)}, duration: ${sec(spec.durationMs)}, ease: ${e.ref}, scrollTrigger: { trigger: ${sel}, start: "top 85%", once: true } });\n`;
  }
  if (r.trigger === 'scroll-linked' && r.ranges) {
    // A scrubbed tween per property, each over its own scroll range with its own curve.
    const parts = (Object.entries(r.ranges) as [AnimProp, NonNullable<Replica['ranges']>[AnimProp]][]).map(([p, g]) => {
      const pe = gsapEase(r, g!.easing);
      return `${pe.setup}gsap.fromTo(${sel}, { ${GSAP_KEY[p]}: ${fixed(g!.from)} }, { ${GSAP_KEY[p]}: ${fixed(g!.to)}, ease: ${pe.ref}, scrollTrigger: { start: ${g!.start}, end: ${g!.end}, scrub: true } });\n`;
    });
    return `// ${commentText(r.name)} (match ${Math.round(r.score * 100)}%)\n${parts.join('')}`;
  }
  return '';
}

// ---------- Motion (React) ----------

function motionTransition(r: Replica, easing: string, extra: Record<string, unknown> = {}): string {
  const spec = r.spec!;
  if (r.easing?.spring) return JSON.stringify({ type: 'spring', ...r.easing.spring, ...extra });
  return withEases({ duration: spec.durationMs / 1000, delay: spec.delayMs / 1000, ease: '__ease0__', ...extra }, [motionEase(easing)]);
}

/** The pieces of a replica's Motion code: a name, hook lines, and the props for a motion element. */
function motionParts(r: Replica): { comp: string; header: string; hooks: string[]; props: string } | null {
  const spec = r.spec;
  if (!spec) return null;
  const name = r.name.replace(/[^A-Za-z0-9]+/g, ' ').trim().replace(/(^|\s)(\w)/g, (_m, _s, c: string) => c.toUpperCase()) || 'Effect';
  const comp = `${name.replace(/^\d/, 'E$&')}`;
  const header = `// ${commentText(r.name)} — ${commentText(r.selector)}\n`;
  const values = (end: 0 | 1) => Object.fromEntries(Object.entries(stateAt(spec, end).values).map(([p, v]) => [MOTION_KEY[p as AnimProp], Number(fixed(v!))]));
  if (r.trigger === 'loop' || r.trigger === 'load') {
    const offsets = [...new Set(Object.values(spec.tracks).flatMap((k) => k!.map((x) => x.offset)))].sort((a, b) => a - b);
    const animate = Object.fromEntries(
      (Object.entries(spec.tracks) as [AnimProp, AnimationSpec['tracks'][AnimProp]][]).map(([p, keys]) => [MOTION_KEY[p], offsets.map((o) => Number(fixed(keys!.find((k) => k.offset === o)?.value ?? keys![0].value)))]),
    );
    const firstKeys = Object.values(spec.tracks)[0]!;
    const eases = offsets.slice(0, -1).map((o) => motionEase(firstKeys.find((k) => k.offset === o)?.easing ?? 'linear'));
    const transition = { duration: spec.durationMs / 1000, delay: spec.delayMs / 1000, times: offsets, ease: eases.map((_, i) => `__ease${i}__`), ...(r.trigger === 'loop' ? { repeat: 'Infinity' } : {}) };
    return { comp, header, hooks: [], props: `animate={${JSON.stringify(animate)}} transition={${withEases(transition, eases).replace('"Infinity"', 'Infinity')}}` };
  }
  const easing = Object.values(spec.tracks)[0]![0].easing;
  if (r.trigger === 'hover') {
    return { comp, header, hooks: [], props: `initial={${JSON.stringify(values(0))}} whileHover={${JSON.stringify(values(1))}} transition={${motionTransition(r, easing)}}` };
  }
  if (r.trigger === 'scroll-reveal') {
    return { comp, header, hooks: [], props: `initial={${JSON.stringify(values(0))}} whileInView={${JSON.stringify(values(1))}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={${motionTransition(r, easing)}}` };
  }
  if (r.trigger === 'scroll-linked' && r.ranges) {
    const entries = Object.entries(r.ranges) as [AnimProp, NonNullable<Replica['ranges']>[AnimProp]][];
    const ease = (e: string) => (e === 'linear' ? '' : isBezierEasing(e) ? `, { ease: cubicBezier(${cubicBezierOf(e).join(', ')}) }` : `, { ease: ${motionEase(e)} }`);
    const hooks = ['  const { scrollY } = useScroll();', ...entries.map(([p, g]) => `  const ${MOTION_KEY[p]} = useTransform(scrollY, [${g!.start}, ${g!.end}], [${fixed(g!.from)}, ${fixed(g!.to)}]${ease(g!.easing)});`)];
    return { comp, header, hooks, props: `style={{ ...props.style, ${entries.map(([p]) => MOTION_KEY[p]).join(', ')} }}` };
  }
  return null;
}

export function motionFor(r: Replica): string {
  const m = motionParts(r);
  if (!m) return '';
  return `${m.header}export function ${m.comp}(props) {\n${m.hooks.map((h) => `${h}\n`).join('')}  return <motion.div {...props} ${m.props} />;\n}\n`;
}

/**
 * A replica as a Framer code override: applied to any layer in Framer (frames are motion elements),
 * it gives that layer the captured effect with the captured timing.
 */
export function framerOverrideFor(r: Replica): string {
  const m = motionParts(r);
  if (!m) return '';
  return `${m.header}export function with${m.comp}(Component): ComponentType {\n  return (props) => {\n${m.hooks.map((h) => `  ${h}\n`).join('')}    return <Component {...props} ${m.props} />;\n  };\n}\n`;
}

/** Whether a replica's code reproduces the original well enough to ship. */
export function isTrustworthy(r: Replica): boolean {
  return r.source !== 'fitted' || r.score >= MIN_FIT_SCORE;
}

/** One file per target for a section's replicas (effects that fit poorly are left out). */
export function replicaFiles(all: Replica[]): { css: string; gsap: string; motion: string; framer: string } {
  const replicas = all.filter(isTrustworthy);
  const framer = replicas.filter((r) => r.source !== 'gsap').map(framerOverrideFor).filter(Boolean);
  const gsap = replicas.map((r) => r.gsap).filter(Boolean);
  const motion = replicas.map((r) => r.motion).filter(Boolean);
  return {
    css: `/* Generated by Specimen. */\n\n${replicas.map((r) => r.css).filter(Boolean).join('\n')}`,
    gsap: gsap.length
      ? `// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).\nimport { gsap } from "gsap";\nimport { ScrollTrigger } from "gsap/ScrollTrigger";\nimport { CustomEase } from "gsap/CustomEase";\ngsap.registerPlugin(ScrollTrigger, CustomEase);\n\n${gsap.join('\n')}`
      : '',
    motion: motion.length ? `// Generated by Specimen. Motion for React: npm install motion\nimport { cubicBezier, motion, useScroll, useTransform } from "motion/react";\n\n${motion.join('\n')}` : '',
    framer: framer.length
      ? `// Generated by Specimen. Framer code overrides: in Framer, Assets ▸ Code ▸ New file, paste this, then pick an override for a layer in its Code Overrides panel.\nimport type { ComponentType } from "react";\nimport { cubicBezier, useScroll, useTransform } from "framer-motion";\n\n${framer.join('\n')}`
      : '',
  };
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * A Motion (or GSAP) `ease` value as source: a cubic-bezier array, or for linear() and steps() an easing function
 * (Motion accepts any function of progress), so the curve is the page's own, not an approximation.
 */
export function motionEase(easing: string): string {
  if (isBezierEasing(easing)) return JSON.stringify(cubicBezierOf(easing));
  const stops = linearStopsOf(easing) ?? Array.from({ length: 201 }, (_, i) => [i / 200, easingFunction(easing)(i / 200)] as [number, number]);
  const pts = JSON.stringify(stops.map(([x, y]) => [Number(fixed(x, 4)), Number(fixed(y, 4))]));
  return `((p, s = ${pts}) => { let i = 1; while (i < s.length - 1 && p > s[i][0]) i++; const [x0, y0] = s[i - 1], [x1, y1] = s[i]; return x1 === x0 ? y1 : y0 + ((y1 - y0) * (Math.min(Math.max(p, x0), x1) - x0)) / (x1 - x0); })`;
}

/** JSON with `ease` values replaced by Motion easing source (arrays or functions). */
function withEases(value: Record<string, unknown>, eases: string[]): string {
  return JSON.stringify(value).replace(/"__ease(\d+)__"/g, (_m, i: string) => eases[Number(i)]);
}
