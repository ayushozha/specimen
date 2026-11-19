import { cubicBezierOf, evaluateBezier, parseTransform, type AnimationInfo, type Rect, type Sample, type StyleChange, type TrackKind } from '@specimen/core';
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
    add({ name: `${e.label} hover`, selector: e.selector, trigger: 'hover', source: 'css-transition', spec, easing: null, scroll: null, score: 1, rect: e.rect, css: cssHover(e) });
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

/** Motion tied to scroll position: a linear map from a scroll range to values. */
function fitLinked(parts: Partial<Record<AnimProp, [number, number, number][]>>): Pick<Replica, 'spec' | 'easing' | 'scroll' | 'score'> | null {
  const tracks: AnimationSpec['tracks'] = {};
  let start = Infinity;
  let end = -Infinity;
  let worst = 1;
  for (const [prop, s] of Object.entries(parts) as [AnimProp, [number, number, number][]][]) {
    const pts = s.map(([, y, v]) => [y, v] as const);
    const n = pts.length;
    const my = pts.reduce((a, p) => a + p[0], 0) / n;
    const mv = pts.reduce((a, p) => a + p[1], 0) / n;
    const cov = pts.reduce((a, p) => a + (p[0] - my) * (p[1] - mv), 0);
    const vy = pts.reduce((a, p) => a + (p[0] - my) ** 2, 0);
    if (!vy) continue;
    const slope = cov / vy;
    const lo = Math.min(...pts.map((p) => p[0]));
    const hi = Math.max(...pts.map((p) => p[0]));
    const v0 = mv + slope * (lo - my);
    const v1 = mv + slope * (hi - my);
    if (Math.abs(v1 - v0) < 1e-3) continue;
    const residual = Math.sqrt(pts.reduce((a, p) => a + (p[1] - (mv + slope * (p[0] - my))) ** 2, 0) / n) / Math.abs(v1 - v0);
    worst = Math.min(worst, 1 - residual);
    start = Math.min(start, lo);
    end = Math.max(end, hi);
    tracks[prop] = [{ offset: 0, value: v0, easing: 'linear' }, { offset: 1, value: v1, easing: 'linear' }];
  }
  if (!Object.keys(tracks).length) return null;
  return {
    spec: { name: 'scroll-linked', selector: null, trigger: 'scroll', durationMs: 0, delayMs: 0, iterations: 1, direction: 'normal', rect: null, tracks },
    easing: { kind: 'named', css: 'linear', bezier: [0, 0, 1, 1], spring: null, score: round(worst) },
    scroll: { start: Math.round(start), end: Math.round(end) },
    score: round(Math.max(0, worst)),
  };
}

// ---------- CSS ----------

function transformCss(v: Partial<Record<AnimProp, number>>): string | null {
  const parts: string[] = [];
  if (v.tx || v.ty) parts.push(`translate(${fixed(v.tx ?? 0, 2)}px, ${fixed(v.ty ?? 0, 2)}px)`);
  if (v.scale !== undefined && v.scale !== 1) parts.push(`scale(${fixed(v.scale)})`);
  if (v.rotate) parts.push(`rotate(${fixed(v.rotate, 2)}deg)`);
  return parts.length ? parts.join(' ') : v.tx !== undefined || v.scale !== undefined || v.rotate !== undefined ? 'none' : null;
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
  if (r.trigger === 'scroll-linked' && r.scroll) {
    return `/* ${commentText(r.name)}: tied to scroll position ${r.scroll.start}px → ${r.scroll.end}px (match ${Math.round(r.score * 100)}%) */
@keyframes ${r.id} {
  from { ${from.css.join(' ')} }
  to { ${to.css.join(' ')} }
}
${r.selector} {
  animation: ${r.id} linear both;
  animation-timeline: scroll(root);
  animation-range: ${r.scroll.start}px ${r.scroll.end}px;
}
`;
  }
  return '';
}

// ---------- GSAP ----------

function gsapEase(r: Replica, easing: string): { ref: string; setup: string } {
  if (easing === 'linear') return { ref: '"none"', setup: '' };
  if (r.easing?.spring) {
    const s = r.easing.spring;
    const pts = Array.from({ length: 41 }, (_, i) => `${fixed(i / 40)},${fixed(springAt(((i / 40) * (r.spec?.durationMs ?? 1000)) / 1000, s.stiffness, s.damping, s.mass))}`);
    return { ref: `"${r.id}"`, setup: `CustomEase.create("${r.id}", "M0,0 L${pts.join(' L')}");\n` };
  }
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
  const e = gsapEase(r, r.trigger === 'scroll-linked' ? 'linear' : firstEasing);
  if (r.trigger === 'hover') {
    return `// ${commentText(r.name)}\n${e.setup}document.querySelectorAll(${sel}).forEach((el) => {\n  el.addEventListener("mouseenter", () => gsap.to(el, { ...${JSON.stringify(to)}, duration: ${sec(spec.durationMs)}, ease: ${e.ref} }));\n  el.addEventListener("mouseleave", () => gsap.to(el, { ...${JSON.stringify(from)}, duration: ${sec(spec.durationMs)}, ease: ${e.ref} }));\n});\n`;
  }
  if (r.trigger === 'scroll-reveal') {
    return `// ${commentText(r.name)} (match ${Math.round(r.score * 100)}%)\n${e.setup}gsap.fromTo(${sel}, ${JSON.stringify(from)}, { ...${JSON.stringify(to)}, duration: ${sec(spec.durationMs)}, ease: ${e.ref}, scrollTrigger: { trigger: ${sel}, start: "top 85%", once: true } });\n`;
  }
  if (r.trigger === 'scroll-linked' && r.scroll) {
    return `// ${commentText(r.name)} (match ${Math.round(r.score * 100)}%)\ngsap.fromTo(${sel}, ${JSON.stringify(from)}, { ...${JSON.stringify(to)}, ease: "none", scrollTrigger: { start: ${r.scroll.start}, end: ${r.scroll.end}, scrub: true } });\n`;
  }
  return '';
}

// ---------- Motion (React) ----------

function motionTransition(r: Replica, easing: string, extra: Record<string, unknown> = {}): string {
  const spec = r.spec!;
  if (r.easing?.spring) return JSON.stringify({ type: 'spring', ...r.easing.spring, ...extra });
  return JSON.stringify({ duration: spec.durationMs / 1000, delay: spec.delayMs / 1000, ease: cubicBezierOf(easing), ...extra });
}

export function motionFor(r: Replica): string {
  const spec = r.spec;
  if (!spec) return '';
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
    const ease = offsets.slice(0, -1).map((o) => cubicBezierOf(firstKeys.find((k) => k.offset === o)?.easing ?? 'linear'));
    const transition = { duration: spec.durationMs / 1000, delay: spec.delayMs / 1000, times: offsets, ease, ...(r.trigger === 'loop' ? { repeat: 'Infinity' } : {}) };
    return `${header}export function ${comp}(props) {\n  return <motion.div {...props} animate={${JSON.stringify(animate)}} transition={${JSON.stringify(transition).replace('"Infinity"', 'Infinity')}} />;\n}\n`;
  }
  const easing = Object.values(spec.tracks)[0]![0].easing;
  if (r.trigger === 'hover') {
    return `${header}export function ${comp}(props) {\n  return <motion.div {...props} initial={${JSON.stringify(values(0))}} whileHover={${JSON.stringify(values(1))}} transition={${motionTransition(r, easing)}} />;\n}\n`;
  }
  if (r.trigger === 'scroll-reveal') {
    return `${header}export function ${comp}(props) {\n  return <motion.div {...props} initial={${JSON.stringify(values(0))}} whileInView={${JSON.stringify(values(1))}} viewport={{ once: true, amount: 0.2 }} transition={${motionTransition(r, easing)}} />;\n}\n`;
  }
  if (r.trigger === 'scroll-linked' && r.scroll) {
    const from = values(0);
    const to = values(1);
    const hooks = Object.keys(from).map((k) => `  const ${k} = useTransform(scrollY, [${r.scroll!.start}, ${r.scroll!.end}], [${from[k]}, ${to[k]}]);`);
    return `${header}export function ${comp}(props) {\n  const { scrollY } = useScroll();\n${hooks.join('\n')}\n  return <motion.div {...props} style={{ ${Object.keys(from).join(', ')} }} />;\n}\n`;
  }
  return '';
}

/** Whether a replica's code reproduces the original well enough to ship. */
export function isTrustworthy(r: Replica): boolean {
  return r.source !== 'fitted' || r.score >= MIN_FIT_SCORE;
}

/** One file per target for a section's replicas (effects that fit poorly are left out). */
export function replicaFiles(all: Replica[]): { css: string; gsap: string; motion: string } {
  const replicas = all.filter(isTrustworthy);
  const gsap = replicas.map((r) => r.gsap).filter(Boolean);
  const motion = replicas.map((r) => r.motion).filter(Boolean);
  return {
    css: `/* Generated by Specimen. */\n\n${replicas.map((r) => r.css).filter(Boolean).join('\n')}`,
    gsap: gsap.length
      ? `// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).\nimport { gsap } from "gsap";\nimport { ScrollTrigger } from "gsap/ScrollTrigger";\nimport { CustomEase } from "gsap/CustomEase";\ngsap.registerPlugin(ScrollTrigger, CustomEase);\n\n${gsap.join('\n')}`
      : '',
    motion: motion.length ? `// Generated by Specimen. Motion for React: npm install motion\nimport { motion, useScroll, useTransform } from "motion/react";\n\n${motion.join('\n')}` : '',
  };
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
