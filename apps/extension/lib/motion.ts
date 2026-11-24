import {
  classifyTrack,
  diffSnapshots,
  followsPointer,
  installHooks,
  probeMotionLibraries,
  readHooks,
  readShaders,
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
import { encodeFrames, type FrameOverlay } from './video';
import { filmstrip, frameAt, frameDiff, strokePath, type PointerSample, type Share } from './pointer';

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
  pointer?: PointerEffect;
}

/** What a pointer stroke over a section did. */
export interface PointerEffect {
  /** `canvas`/`pixels`: the stroke painted pixels (ink, fluid, WebGL); `dom`: only elements followed the pointer. */
  kind: 'canvas' | 'pixels' | 'dom';
  /** Share of the viewport the stroke changed, and the share the page changed by itself meanwhile. */
  changed: number;
  idleChange: number;
  /** Time for the trail to fade after the pointer stops; null when it stays. */
  fadeMs: number | null;
  /** Where the changes were, in viewport CSS px. */
  region: Rect | null;
  /** The stroke: ms from its start, viewport CSS px. */
  path: { t: number; x: number; y: number }[];
  /** Elements that followed the pointer. */
  tracks: number;
  /** Clip with the cursor drawn in, and a filmstrip. */
  files: string[];
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
  /** Shader programs the page compiled for its canvas effects (deep mode only). */
  shaders: number;
  sections: Record<string, { animations: number; interactions: number; scrollEffects: number; pointer?: number }>;
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
  /** Aborted when the user cancels; long loops check it between items. */
  signal?: AbortSignal;
  /**
   * Only `sections` were asked for (one section, a picked button or header): hover probes and
   * animations outside them are skipped, and the pointer sweep covers them however small they are.
   */
  scoped?: boolean;
}

export const MOTION_STEPS = 8;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** `r` grown around its centre to at least `min` px a side, kept inside the viewport. */
const grow = (r: Rect, min: number, vp: { width: number; height: number }): Rect => {
  const width = Math.min(vp.width, Math.max(r.width, min));
  const height = Math.min(vp.height, Math.max(r.height, min));
  const x = Math.min(Math.max(0, r.x + r.width / 2 - width / 2), vp.width - width);
  const y = Math.min(Math.max(0, r.y + r.height / 2 - height / 2), vp.height - height);
  return { x, y, width, height };
};
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
    shaders: 0,
    sections: Object.fromEntries(sections.map((s) => [s.id, { animations: 0, interactions: 0, scrollEffects: 0 }])),
  };
  const perSection = new Map<string, SectionMotion>(
    sections.map((s) => [s.id, { gsap: [], animations: [], tracks: [], interactions: [] }]),
  );
  const saveVideo = async (frames: Pick<ScreencastFrame, 'data' | 'type' | 'time'>[], pathNoExt: string, overlay?: FrameOverlay): Promise<string | null> => {
    // One clip that can't be encoded must not lose the rest of the step (hover data, other clips).
    const video = await encodeFrames(frames, m.fps, undefined, overlay).catch((err) => {
      ctx.note('Encoding a clip', `${pathNoExt.split('/').pop()}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    });
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
  const snapshot = async (clip: Rect, visible: boolean | undefined, undo: () => Promise<unknown>) => {
    try {
      return await adapter.screenshot(clip, { visible });
    } catch (error) {
      if (adapter.captureTargetChanged) await undo().catch(() => {});
      throw error;
    }
  };

  await adapter.setViewport(desktop, scale).catch(() => null);

  await ctx.step('Recording page load (deep mode)', async () => {
    if (!caps.hooks) return;
    // Reload from the top: browsers restore the scroll position, and a page reloaded scrolled down
    // (after hovering a section in the panel, say) fires its scroll reveals at load, so none get traced.
    await adapter.evaluateMain(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }));
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
      ctx.signal?.throwIfAborted();
      const inView = frames.filter((f) => f.scrollY / scale < s.rect.y + s.rect.height && f.scrollY / scale + desktop.height > s.rect.y);
      if (inView.length < 5) continue;
      const path = await saveVideo(inView, `sections/${s.id}/scroll`);
      if (path) ctx.addSectionFile(s.id, path);
    }
  });

  await ctx.step('Capturing animations frame by frame', async () => {
    const found = (await adapter.call('collectAnimations', null)).filter((a) => a.kind !== 'css-transition' && a.timeline === 'document' && a.target && a.duration > 0);
    const foundIds = await sectionOf(found.map((a) => a.target));
    const keep = found.map((a, i) => ({ a, id: foundIds[i] })).filter(({ id }) => !ctx.scoped || id).slice(0, m.maxAnimations);
    const anims = keep.map(({ a }) => a);
    const ids = keep.map(({ id }) => id);
    summary.animations = anims.length;
    if (!caps.frameStepping || anims.length === 0) {
      anims.forEach((a, i) => ids[i] && perSection.get(ids[i]!)?.animations.push({ ...a, rect: null }));
      return;
    }
    await adapter.call('pauseAllAnimations');
    const overBudget = budget();
    try {
      for (const [i, anim] of anims.entries()) {
        ctx.signal?.throwIfAborted();
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
    const within = ctx.scoped ? sections.flatMap((s) => (s.selector ? [s.selector] : [])) : undefined;
    const candidates = await adapter.call('findInteractionCandidates', ctx.sheets, summary.hooks?.pointerTargets ?? [], m.maxInteractions, m.perSignature, within);
    const ids = await sectionOf(candidates.map((c) => c.selector));
    const overBudget = budget();
    for (const [i, c] of candidates.entries()) {
      ctx.signal?.throwIfAborted();
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
          ctx.put(png, await snapshot(clip, visible, () => adapter.hover(c.selector, box.viewport, false)), false);
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
            ctx.put(png, await snapshot(clip, visible, () => adapter.call('blurActive')), false);
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

  await ctx.step('Drawing pointer strokes over sections', async () => {
    if (!caps.realPointer || !caps.screencast) return;
    const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    // Every section tall enough to move over gets a stroke, so effects that only listen for the pointer
    // (followers, trails, tilts) are found without a hint from the page. Canvas sections and the hero
    // go first in case the limit cuts the list short.
    const tall = ctx.scoped ? sections : sections.filter((sec) => sec.rect.height >= m.pointerMinSection);
    const canvasIds = await adapter.call('sectionsWithCanvas', tall, m.pointerMinCanvas);
    const hero = tall.find((sec) => sec.rect.height > desktop.height * 0.4);
    const first = [...tall.filter((sec) => canvasIds.includes(sec.id)), ...(hero ? [hero] : [])];
    const candidates = [...new Set([...first, ...tall])].slice(0, m.maxPointerSections);
    const known = new Set([...perSection.values()].flatMap((d) => [...d.interactions.map((e) => e.selector), ...d.tracks.filter((t) => t.kind === 'time').map((t) => t.selector)]));
    const allTracks: ClassifiedTrack[] = [];
    const started = Date.now();
    const overBudget = () => Date.now() - started > m.pointerBudgetMs;

    /** One stroke over what is on screen of `sec` with the page scrolled to `scrollTo`. */
    const strokeScreen = async (sec: Section, scrollTo: number) => {
      const top = await adapter.call('scrollToY', scrollTo);
      const [measured] = await adapter.call('measureSections', [sec]);
      const areaTop = Math.max(0, measured.rect.y - top);
      const visible: Rect = { x: measured.rect.x, y: areaTop, width: measured.rect.width, height: Math.min(measured.rect.y + measured.rect.height - top, desktop.height) - areaTop };
      if (visible.height < 1 || (!ctx.scoped && visible.height < 80)) return null;
      // A small element (a button, a logo) gets a stroke over it and the space around it, where
      // effects it owns (glows, magnetic pulls) show.
      const area = grow(visible, m.pointerMinArea, desktop);
      await adapter.mouseMove(1, 1);
      await sleep(m.settleMs);
      // Canvases on screen now (off-screen ones may have been hidden by the site until now).
      const canvases = (await adapter.call('listMedia', 48)).filter((x) => x.kind === 'canvas' && x.rect.width >= m.pointerMinCanvas && x.rect.height >= m.pointerMinCanvas);

      await adapter.startScreencast(desktop.width * scale, desktop.height * scale);
      const traceStart = Date.now();
      const tracing = adapter.call('traceMotion', { scroll: false, durationMs: m.pointerIdleMs + m.pointerSweepMs + m.pointerFadeMs, maxElements: m.traceMaxElements });
      await sleep(m.pointerIdleMs);
      const path: PointerSample[] = [];
      const points = strokePath(area, Math.round(m.pointerSweepMs / 30));
      for (const pt of points) {
        await adapter.mouseMove(pt.x, pt.y);
        path.push({ t: Date.now() / 1000, x: pt.x, y: pt.y });
        await sleep(25);
      }
      await sleep(m.pointerFadeMs);
      // Hover effects, looping animations and followers already found also change during a stroke; they are reported once, elsewhere.
      // The stroke's start and end on the trace's clock (ms from when tracing started).
      const strokeFrom = path[0].t * 1000 - traceStart;
      const strokeTo = path[path.length - 1].t * 1000 - traceStart;
      const tracks = (await tracing).filter((t) => !known.has(t.selector) && followsPointer(t, strokeFrom, strokeTo)).map((t) => ({ ...t, kind: 'pointer' as TrackKind, rect: null, section: sec.id, observed: false }));
      const frames = await adapter.stopScreencast();
      await adapter.mouseMove(1, 1);
      if (frames.length < 3) return null;

      // Pixels that change while the pointer moves, beyond what the page does by itself meanwhile.
      // Hover effects found earlier change pixels as the stroke crosses them; leave their boxes out.
      const hovers: Share[] = [...perSection.values()].flatMap((d) =>
        d.interactions.map((e) => ({ x: (e.rect.x - m.clipPadding) / desktop.width, y: (e.rect.y - top - m.clipPadding) / desktop.height, width: (e.rect.width + m.clipPadding * 2) / desktop.width, height: (e.rect.height + m.clipPadding * 2) / desktop.height })),
      );
      const diff = (a: Parameters<typeof frameDiff>[0], b: Parameters<typeof frameDiff>[0]) => frameDiff(a, b, hovers);
      const start = path[0].t;
      const end = path[path.length - 1].t;
      const idle = await diff(frames[0], frameAt(frames, start));
      // The largest change during the stroke, so trails that fade fast still count.
      let stroke = await diff(frameAt(frames, start), frameAt(frames, end));
      for (const k of [0.25, 0.5, 0.75, 0.9]) {
        const d = await diff(frameAt(frames, start), frameAt(frames, start + (end - start) * k));
        if (d.changed > stroke.changed) stroke = d;
      }
      const painted = stroke.changed > Math.max(m.pointerMinChange, idle.changed * 3);
      let fadeMs: number | null = null;
      if (painted) {
        // Fade is timed from what is on screen when the pointer stops, down to a quarter of it.
        const base = frameAt(frames, start);
        const atEnd = (await diff(base, frameAt(frames, end))).changed;
        for (const f of frames.filter((f) => f.time > end)) {
          if ((await diff(base, f)).changed <= idle.changed + Math.max(0, atEnd - idle.changed) * 0.25) {
            fadeMs = Math.round((f.time - end) * 1000);
            break;
          }
        }
      }
      if (!painted && !tracks.length) return null;
      const region = stroke.box && { x: Math.round(stroke.box.x * desktop.width), y: Math.round(stroke.box.y * desktop.height), width: Math.round(stroke.box.width * desktop.width), height: Math.round(stroke.box.height * desktop.height) };
      const inCanvas = !!region && canvases.some((c) => overlaps({ ...c.rect, y: c.rect.y - top }, region));
      const effect: PointerEffect = {
        kind: painted ? (inCanvas ? 'canvas' : 'pixels') : 'dom',
        changed: Math.round(stroke.changed * 1000) / 1000,
        idleChange: Math.round(idle.changed * 1000) / 1000,
        fadeMs,
        region,
        path: path.map((p) => ({ t: Math.round((p.t - start) * 1000), x: Math.round(p.x), y: Math.round(p.y) })),
        tracks: tracks.length,
        files: [],
      };
      return { effect, painted, tracks, frames };
    };

    // The cursor Specimen draws in the page shows in the recording itself, so clips need no overlay.
    await adapter.call('showSweepCursor');
    try {
      sweep: for (const [i, sec] of candidates.entries()) {
        // Go to where the scan found the section first: a sticky or fixed hero measured while the page
        // is scrolled down reports the current scroll as its position. Then measure there.
        await adapter.call('scrollToY', sec.rect.y);
        const [measured] = await adapter.call('measureSections', [sec]);
        const screens = Math.min(m.pointerScreensPerSection, Math.max(1, Math.ceil(measured.rect.height / desktop.height)));
        // The strongest result over the section's screens: painted pixels first, then followers.
        let best: Awaited<ReturnType<typeof strokeScreen>> = null;
        for (let s = 0; s < screens; s++) {
          ctx.signal?.throwIfAborted();
          if (overBudget()) {
            ctx.note('Drawing pointer strokes over sections', `Stopped after ${m.pointerBudgetMs / 1000}s: swept ${i} of ${candidates.length} sections (motion.pointerBudgetMs in config.ts).`);
            break sweep;
          }
          const r = await strokeScreen(sec, measured.rect.y + s * desktop.height);
          const score = (x: typeof r) => (x ? (x.painted ? 1 + x.effect.changed : 0) + x.tracks.length * 0.01 : -1);
          if (score(r) > score(best)) best = r;
        }
        if (!best) continue;
        const { effect, painted, tracks, frames } = best;
        const video = await saveVideo(frames, `sections/${sec.id}/pointer`);
        if (video) effect.files.push(video);
        const strip = await filmstrip(frames, [], desktop.width);
        if (strip) {
          ctx.put(`sections/${sec.id}/pointer-strip.png`, strip, false);
          effect.files.push(`sections/${sec.id}/pointer-strip.png`);
        }
        ctx.put(`sections/${sec.id}/pointer.json`, json({ ...effect, tracks }));
        ctx.addSectionFile(sec.id, `sections/${sec.id}/pointer.json`);
        for (const f of effect.files) ctx.addSectionFile(sec.id, f);
        perSection.get(sec.id)!.pointer = effect;
        summary.sections[sec.id].pointer = (painted ? 1 : 0) + tracks.length;
        summary.pointerEffects += (painted ? 1 : 0) + tracks.length;
        allTracks.push(...tracks);
        // A follower that tracks the pointer page-wide shows up under every stroke; report it once.
        for (const t of tracks) known.add(t.selector);
      }
    } finally {
      await adapter.call('hideSweepCursor').catch(() => {});
    }
    ctx.put('page/pointer.json', json(allTracks));
  });

  // After the sweep: every section has been on screen, so effects that start in view have compiled theirs.
  await ctx.step('Reading shaders', async () => {
    if (!caps.hooks) return;
    const report = await adapter.evaluateMain(readShaders);
    if (!report.shaders.length) return;
    const selectors = report.shaders.map((sh) => (sh.canvas === null ? null : `[data-specimen-gl="${sh.canvas}"]`));
    const owners = await sectionOf(selectors);
    // Where each canvas sits on the page, so exports can put a live canvas back in its place.
    const rects = await adapter.call('pageRectsOf', selectors.map((sel) => sel ?? '[data-specimen-gl="0"]'));
    const list = report.shaders.map((sh, i) => {
      const ext = sh.api === 'webgpu' ? 'wgsl' : 'glsl';
      const path = `page/shaders/${String(i + 1).padStart(2, '0')}-${sh.api}-${sh.stage}.${ext}`;
      ctx.put(path, new TextEncoder().encode(sh.source));
      const section = owners[i];
      if (section) ctx.addSectionFile(section, path);
      return { path, api: sh.api, stage: sh.stage, canvas: sh.canvas, section, rect: sh.canvas === null ? null : rects[i], lines: sh.source.split('\n').length };
    });
    const uniforms = report.uniforms.map((u) => ({ ...u, values: u.values.sort((a, b) => b.updates - a.updates) }));
    ctx.put('page/shaders.json', json({ shaders: list, uniforms }));
    summary.shaders = list.length;
    await adapter.call('clearShaderTags');
  });

  await ctx.step('Opening menus and accordions', async () => {
    const before = await adapter.call('interactiveState');
    const toggles = await adapter.call('findToggles', m.maxToggles);
    const ids = await sectionOf(toggles.map((t) => t.selector));
    for (const [i, t] of toggles.entries()) {
      ctx.signal?.throwIfAborted();
      const sid = ids[i];
      const section = sections.find((s) => s.id === sid);
      if (!section) continue;
      await adapter.call('prepareElement', t.selector);
      await adapter.call('clickToggle', t.selector);
      await sleep(m.settleMs * 2);
      const [measured] = await adapter.call('measureSections', [section]);
      const path = `sections/${sid}/states/${slug(t.label)}-${i + 1}--open.png`;
      ctx.put(path, await snapshot(measured.rect, undefined, async () => {
        await adapter.call('clickToggle', t.selector);
        if ((await adapter.call('interactiveState')) !== before) await adapter.call('pressEscape');
      }), false);
      ctx.addSectionFile(sid!, path);
      summary.toggles++;
      await adapter.call('clickToggle', t.selector);
      await sleep(m.settleMs);
    }
    // The rest of the capture needs the page as it was. A toggle can open something its own button
    // can't close (stripe.com's expanding cards): try Escape, else reload the page as deep mode did.
    if ((await adapter.call('interactiveState')) !== before) {
      await adapter.call('pressEscape');
      await sleep(m.settleMs);
    }
    if ((await adapter.call('interactiveState')) !== before) {
      ctx.note('Opening menus and accordions', 'A menu or dialog stayed open after closing it; the page was reloaded before the screenshots.');
      await adapter.reloadWithHooks(`(${installHooks.toString()})();`, m.loadTimeoutMs);
      if (CONFIG.rejectCookies) await adapter.call('rejectCookieBanner');
      await adapter.call('waitForFonts', 5000);
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
