import {
  classifyTrack,
  diffSnapshots,
  installHooks,
  probeMotionLibraries,
  readHooks,
  type AnimationInfo,
  type Breakpoint,
  type DeclarativeMotion,
  type HookReport,
  type InteractionCandidate,
  type LibraryMotion,
  type Rect,
  type Section,
  type StyleChange,
  type StyleSheetText,
  type Track,
  type TrackKind,
} from '@specimen/core';
import type { PageAdapter, ScreencastFrame } from './adapter';
import { CONFIG } from './config';
import { encodeFrames } from './video';

export interface ClassifiedTrack extends Track {
  kind: TrackKind;
  /** Element box in page coordinates at the desktop breakpoint. */
  rect: Rect | null;
  section: string | null;
  /** The element is watched by an IntersectionObserver (a JS scroll reveal). */
  observed: boolean;
}

export type CapturedAnimation = AnimationInfo & { rect: Rect | null };

export interface SectionMotion {
  gsap: NonNullable<LibraryMotion['gsap']>['tweens'];
  animations: CapturedAnimation[];
  tracks: ClassifiedTrack[];
  interactions: InteractionEffect[];
}

export interface InteractionEffect {
  selector: string;
  /** Element box in page coordinates at the desktop breakpoint. */
  rect: Rect;
  label: string;
  trigger: 'hover' | 'focus';
  sources: InteractionCandidate['sources'];
  changes: StyleChange[];
  transitions: { property: string; duration: number; delay: number; easing: string }[];
  files: string[];
}

export interface MotionSummary {
  hooks: HookReport | null;
  libraries: LibraryMotion | null;
  declarative: DeclarativeMotion[];
  animations: number;
  interactions: number;
  scrollEffects: number;
  pointerEffects: number;
  toggles: number;
  sections: Record<string, { animations: number; interactions: number; scrollEffects: number }>;
}

export interface MotionContext {
  adapter: PageAdapter;
  sections: Section[];
  sheets: StyleSheetText[];
  desktop: Breakpoint;
  scale: number;
  put(path: string, data: Uint8Array, compress?: boolean): void;
  step(name: string, fn: () => Promise<void>): Promise<void>;
  addSectionFile(sectionId: string, path: string): void;
  /** Records something the capture had to leave out (shown with the bundle's errors). */
  note(step: string, message: string): void;
}

export const MOTION_STEPS = 7;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v, null, 2));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';

/**
 * Phase 2: records page-load and scroll video, traces motion, steps CSS animations frame by frame,
 * probes hover/focus states with the real pointer, sweeps pointer-driven effects and opens toggles.
 */
export async function captureMotion(ctx: MotionContext): Promise<{ summary: MotionSummary; sections: Record<string, SectionMotion> }> {
  const { adapter, sections, desktop, scale } = ctx;
  const m = CONFIG.motion;
  const caps = adapter.capabilities;
  const summary: MotionSummary = {
    hooks: null,
    libraries: null,
    declarative: [],
    animations: 0,
    interactions: 0,
    scrollEffects: 0,
    pointerEffects: 0,
    toggles: 0,
    sections: Object.fromEntries(sections.map((s) => [s.id, { animations: 0, interactions: 0, scrollEffects: 0 }])),
  };
  const perSection = new Map<string, SectionMotion>(
    sections.map((s) => [s.id, { gsap: [], animations: [], tracks: [], interactions: [] }]),
  );
  const saveVideo = async (frames: Pick<ScreencastFrame, 'data' | 'type' | 'time'>[], pathNoExt: string): Promise<string | null> => {
    const video = await encodeFrames(frames, m.fps);
    if (!video) return null;
    const path = `${pathNoExt}.${video.ext}`;
    ctx.put(path, video.data, false);
    return path;
  };
  const sectionOf = async (selectors: (string | null)[]) => adapter.call('sectionsContaining', selectors, sections);
  const pad = (r: Rect, p: number): Rect => ({ x: Math.max(0, r.x - p), y: Math.max(0, r.y - p), width: r.width + p * 2, height: r.height + p * 2 });
  /** True when an element scrolled into view fits the viewport, so frames can use fast visible-area screenshots. */
  const fits = (viewport: Rect) => viewport.y - m.clipPadding >= 0 && viewport.y + viewport.height + m.clipPadding <= desktop.height;
  const budget = () => {
    const start = Date.now();
    return () => Date.now() - start > m.stepBudgetMs;
  };

  await adapter.setViewport(desktop, scale).catch(() => null);

  await ctx.step('Recording page load (deep mode)', async () => {
    if (!caps.hooks) return;
    if (caps.screencast) await adapter.startScreencast(desktop.width * scale, desktop.height * scale);
    await adapter.reloadWithHooks(`(${installHooks.toString()})();`, m.loadTimeoutMs);
    await sleep(m.introMs);
    if (caps.screencast) {
      const frames = await adapter.stopScreencast();
      await saveVideo(frames, 'page/intro');
    }
    if (CONFIG.rejectCookies) await adapter.call('rejectCookieBanner');
    await adapter.call('waitForFonts', 5000);
  });

  await ctx.step('Reading motion libraries', async () => {
    summary.hooks = caps.hooks ? await adapter.evaluateMain(readHooks) : null;
    summary.libraries = await adapter.evaluateMain(probeMotionLibraries);
    summary.declarative = await adapter.call('collectDeclarativeMotion');
    const tweens = summary.libraries.gsap?.tweens ?? [];
    const owners = await sectionOf(tweens.map((t) => t.targets[0] ?? null));
    tweens.forEach((t, i) => owners[i] && perSection.get(owners[i]!)?.gsap.push(t));
  });

  await ctx.step('Tracing scroll motion', async () => {
    if (caps.screencast) await adapter.startScreencast(desktop.width * scale, desktop.height * scale);
    const tracks = await adapter.call('traceMotion', { scroll: true, stepRatio: m.scrollStepRatio, stepDelayMs: m.scrollDelayMs, maxElements: m.traceMaxElements });
    const frames = caps.screencast ? await adapter.stopScreencast() : [];
    if (frames.length) await saveVideo(frames, 'page/scroll-desktop');

    const observed = new Set(summary.hooks?.observed ?? []);
    // Elements driven by an endless CSS/Web animation are time-based however the trace looks.
    const looping = new Set((await adapter.call('collectAnimations', null)).filter((a) => a.iterations === 'infinite' && a.target).map((a) => a.target));
    const ids = await sectionOf(tracks.map((t) => t.selector));
    const boxes = await adapter.call('pageRectsOf', tracks.map((t) => t.selector));
    tracks.forEach((t, i) => {
      const kind = looping.has(t.selector) ? 'time' : classifyTrack(t, desktop.height);
      const classified: ClassifiedTrack = { ...t, kind, rect: boxes[i], section: ids[i], observed: observed.has(t.selector) };
      if (classified.section) perSection.get(classified.section)?.tracks.push(classified);
      if (classified.kind === 'time') return;
      summary.scrollEffects++;
      if (classified.section) summary.sections[classified.section].scrollEffects++;
    });

    // Cut a scroll clip per section from the same recording.
    const measured = await adapter.call('measureSections', sections);
    for (const s of measured) {
      const inView = frames.filter((f) => f.scrollY / scale < s.rect.y + s.rect.height && f.scrollY / scale + desktop.height > s.rect.y);
      if (inView.length < 5) continue;
      const path = await saveVideo(inView, `sections/${s.id}/scroll`);
      if (path) ctx.addSectionFile(s.id, path);
    }
  });

  await ctx.step('Capturing animations frame by frame', async () => {
    const anims = (await adapter.call('collectAnimations', null))
      .filter((a) => a.kind !== 'css-transition' && a.timeline === 'document' && a.target && a.duration > 0)
      .slice(0, m.maxAnimations);
    summary.animations = anims.length;
    const ids = await sectionOf(anims.map((a) => a.target));
    if (!caps.frameStepping || anims.length === 0) {
      anims.forEach((a, i) => ids[i] && perSection.get(ids[i]!)?.animations.push({ ...a, rect: null }));
      return;
    }
    await adapter.call('pauseAllAnimations');
    const overBudget = budget();
    try {
      for (const [i, anim] of anims.entries()) {
        if (overBudget()) {
          ctx.note('Capturing animations frame by frame', `Stopped after ${m.stepBudgetMs / 1000}s: captured ${i} of ${anims.length} animations (motion.stepBudgetMs in config.ts).`);
          break;
        }
        const sid = ids[i];
        const box = await adapter.call('prepareElement', anim.target!);
        if (sid) {
          perSection.get(sid)?.animations.push({ ...anim, rect: box?.page ?? null });
          summary.sections[sid].animations++;
        }
        if (!box || box.page.width < 1) continue;
        const count = Math.max(2, Math.min(m.maxFramesPerAnimation, Math.ceil((anim.duration / 1000) * m.fps)));
        const frames: Pick<ScreencastFrame, 'data' | 'type' | 'time'>[] = [];
        for (let f = 0; f < count; f++) {
          await adapter.call('seekAnimations', [anim.id], (f / (count - 1)) * anim.duration);
          frames.push({ data: await adapter.screenshot(pad(box.page, m.clipPadding), { visible: fits(box.viewport) }), type: 'image/png', time: (f / (count - 1)) * (anim.duration / 1000) });
        }
        const path = await saveVideo(frames, `${sid ? `sections/${sid}` : 'page'}/motion/${slug(anim.name)}-${anim.id}`);
        if (path && sid) ctx.addSectionFile(sid, path);
      }
    } finally {
      await adapter.call('resumeAllAnimations');
    }
  });

  await ctx.step('Probing hover and focus', async () => {
    const candidates = await adapter.call('findInteractionCandidates', ctx.sheets, summary.hooks?.pointerTargets ?? [], m.maxInteractions, m.perSignature);
    const ids = await sectionOf(candidates.map((c) => c.selector));
    const overBudget = budget();
    for (const [i, c] of candidates.entries()) {
      if (overBudget()) {
        ctx.note('Probing hover and focus', `Stopped after ${m.stepBudgetMs / 1000}s: probed ${i} of ${candidates.length} interactive elements (motion.stepBudgetMs in config.ts).`);
        break;
      }
      const box = await adapter.call('prepareElement', c.selector);
      if (!box) continue;
      await sleep(m.settleMs / 2);
      const clip = pad(box.page, m.clipPadding);
      const visible = fits(box.viewport);
      const base = `${ids[i] ? `sections/${ids[i]}` : 'page'}/states/${slug(c.label)}-${i + 1}`;
      const before = await adapter.call('snapshotStyles', c.selector, 40);
      const beforePng = await adapter.screenshot(clip, { visible });
      const effects: InteractionEffect[] = [];

      if (c.states.includes('hover') || c.sources.includes('js')) {
        await adapter.hover(c.selector, box.viewport, true);
        await sleep(20);
        const running = (await adapter.call('collectAnimations', c.selector)).filter((a) => a.playState === 'running' && a.timeline === 'document' && a.duration > 0);
        const longest = Math.max(0, ...running.map((a) => a.delay + a.duration));
        const files: string[] = [];
        if (running.length && caps.frameStepping) {
          await adapter.call('pauseAllAnimations');
          try {
            const count = Math.max(2, Math.min(m.maxFramesPerAnimation, Math.ceil((longest / 1000) * m.fps)));
            const frames: Pick<ScreencastFrame, 'data' | 'type' | 'time'>[] = [];
            for (let f = 0; f < count; f++) {
              await adapter.call('seekAnimations', running.map((a) => a.id), (f / (count - 1)) * longest);
              frames.push({ data: await adapter.screenshot(clip, { visible }), type: 'image/png', time: (f / (count - 1)) * (longest / 1000) });
            }
            const path = await saveVideo(frames, `${base}--hover`);
            if (path) files.push(path);
          } finally {
            await adapter.call('resumeAllAnimations');
          }
        }
        await sleep(Math.min(2000, longest) + m.settleMs);
        const after = await adapter.call('snapshotStyles', c.selector, 40);
        const changes = diffSnapshots(before, after);
        if (changes.length) {
          const png = `${base}--hover.png`;
          ctx.put(png, await adapter.screenshot(clip, { visible }), false);
          files.push(png);
          effects.push({
            selector: c.selector,
            rect: box.page,
            label: c.label,
            trigger: 'hover',
            sources: c.sources,
            changes,
            transitions: running.map((a) => ({ property: a.name, duration: a.duration, delay: a.delay, easing: a.easing })),
            files,
          });
        }
        await adapter.hover(c.selector, box.viewport, false);
        await sleep(Math.min(2000, longest) + m.settleMs);
      }

      if (c.focusable && c.states.some((s) => s.startsWith('focus'))) {
        if (await adapter.call('focusElement', c.selector)) {
          await sleep(m.settleMs);
          const changes = diffSnapshots(before, await adapter.call('snapshotStyles', c.selector, 40));
          if (changes.length) {
            const png = `${base}--focus.png`;
            ctx.put(png, await adapter.screenshot(clip, { visible }), false);
            effects.push({ selector: c.selector, rect: box.page, label: c.label, trigger: 'focus', sources: c.sources, changes, transitions: [], files: [png] });
          }
          await adapter.call('blurActive');
        }
      }

      if (effects.length) {
        ctx.put(`${base}--default.png`, beforePng, false);
        for (const e of effects) e.files.unshift(`${base}--default.png`);
        summary.interactions += effects.length;
        if (ids[i]) {
          perSection.get(ids[i]!)?.interactions.push(...effects);
          summary.sections[ids[i]!].interactions += effects.length;
        }
      }
    }
  });

  await ctx.step('Sweeping pointer-driven effects', async () => {
    if (!summary.hooks?.globalPointer || !caps.realPointer) return;
    if (caps.screencast) await adapter.startScreencast(desktop.width * scale, desktop.height * scale);
    const tracing = adapter.call('traceMotion', { scroll: false, durationMs: m.pointerSweepMs, maxElements: m.traceMaxElements });
    const steps = Math.round(m.pointerSweepMs / 30);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      await adapter.mouseMove(desktop.width * (0.1 + 0.8 * t), desktop.height * (0.5 + 0.35 * Math.sin(t * Math.PI * 4)));
      await sleep(25);
    }
    const tracks = await tracing;
    const frames = caps.screencast ? await adapter.stopScreencast() : [];
    if (frames.length) await saveVideo(frames, 'page/pointer');
    summary.pointerEffects = tracks.length;
    ctx.put('page/pointer.json', json(tracks.map((t) => ({ ...t, kind: 'pointer' }))));
    await adapter.mouseMove(1, 1);
  });

  await ctx.step('Opening menus and accordions', async () => {
    const toggles = await adapter.call('findToggles', m.maxToggles);
    const ids = await sectionOf(toggles.map((t) => t.selector));
    for (const [i, t] of toggles.entries()) {
      const sid = ids[i];
      const section = sections.find((s) => s.id === sid);
      if (!section) continue;
      await adapter.call('prepareElement', t.selector);
      await adapter.call('clickToggle', t.selector);
      await sleep(m.settleMs * 2);
      const [measured] = await adapter.call('measureSections', [section]);
      const path = `sections/${sid}/states/${slug(t.label)}-${i + 1}--open.png`;
      ctx.put(path, await adapter.screenshot(measured.rect), false);
      ctx.addSectionFile(sid!, path);
      summary.toggles++;
      await adapter.call('clickToggle', t.selector);
      await sleep(m.settleMs);
    }
  });

  for (const [id, data] of perSection) {
    if (data.interactions.length) {
      const path = `sections/${id}/interactions.json`;
      ctx.put(path, json(data.interactions));
      ctx.addSectionFile(id, path);
    }
    if (data.animations.length || data.tracks.length) {
      const path = `sections/${id}/motion.json`;
      ctx.put(path, json({ animations: data.animations, tracks: data.tracks }));
      ctx.addSectionFile(id, path);
    }
  }
  ctx.put('page/motion.json', json(summary));
  return { summary, sections: Object.fromEntries(perSection) };
}
