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
import { encodeFrames, type FrameOverlay } from './video';
import { cursorOverlay, filmstrip, frameAt, frameDiff, strokePath, type PointerSample } from './pointer';

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
      ctx.signal?.throwIfAborted();
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
    const candidates = await adapter.call('findInteractionCandidates', ctx.sheets, summary.hooks?.pointerTargets ?? [], m.maxInteractions, m.perSignature);
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

  await ctx.step('Drawing pointer strokes over sections', async () => {
    if (!caps.realPointer || !caps.screencast) return;
    // Sections worth a stroke: ones holding a canvas (WebGL, 2D), and the first content section when
    // the page listens for the pointer everywhere (cursor followers, ink and fluid effects).
    const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const tall = sections.filter((sec) => sec.rect.height >= m.pointerMinCanvas);
    const canvasIds = await adapter.call('sectionsWithCanvas', tall, m.pointerMinCanvas);
    const hero = tall.find((sec) => sec.rect.height > desktop.height * 0.4);
    // Canvas sections in page order, then the hero when the page tracks the pointer everywhere.
    const candidates = [...new Set([...tall.filter((sec) => canvasIds.includes(sec.id)), ...(summary.hooks?.globalPointer && hero ? [hero] : [])])].slice(0, m.maxPointerSections);
    const allTracks: ClassifiedTrack[] = [];
    for (const sec of candidates) {
      ctx.signal?.throwIfAborted();
      // Go to where the scan found the section first: a sticky or fixed hero measured while the page
      // is scrolled down reports the current scroll as its position. Then measure there.
      await adapter.call('scrollToY', sec.rect.y);
      const [measured] = await adapter.call('measureSections', [sec]);
      const top = await adapter.call('scrollToY', measured.rect.y);
      const areaTop = Math.max(0, measured.rect.y - top);
      const area: Rect = { x: measured.rect.x, y: areaTop, width: measured.rect.width, height: Math.min(measured.rect.height, desktop.height - areaTop) };
      if (area.height < 80) continue;
      await adapter.mouseMove(1, 1);
      await sleep(m.settleMs);
      // Canvases on screen now (off-screen ones may have been hidden by the site until now).
      const canvases = (await adapter.call('listMedia', 48)).filter((x) => x.kind === 'canvas' && x.rect.width >= m.pointerMinCanvas && x.rect.height >= m.pointerMinCanvas);

      await adapter.startScreencast(desktop.width * scale, desktop.height * scale);
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
      const tracks = (await tracing).map((t) => ({ ...t, kind: 'pointer' as TrackKind, rect: null, section: sec.id, observed: false }));
      const frames = await adapter.stopScreencast();
      await adapter.mouseMove(1, 1);
      if (frames.length < 3) continue;

      // Pixels that change while the pointer moves, beyond what the page does by itself meanwhile.
      const start = path[0].t;
      const end = path[path.length - 1].t;
      const idle = await frameDiff(frames[0], frameAt(frames, start));
      // The largest change during the stroke, so trails that fade fast still count.
      let stroke = await frameDiff(frameAt(frames, start), frameAt(frames, end));
      for (const k of [0.25, 0.5, 0.75, 0.9]) {
        const d = await frameDiff(frameAt(frames, start), frameAt(frames, start + (end - start) * k));
        if (d.changed > stroke.changed) stroke = d;
      }
      const painted = stroke.changed > Math.max(m.pointerMinChange, idle.changed * 3);
      let fadeMs: number | null = null;
      if (painted) {
        // Fade is timed from what is on screen when the pointer stops, down to a quarter of it.
        const base = frameAt(frames, start);
        const atEnd = (await frameDiff(base, frameAt(frames, end))).changed;
        for (const f of frames.filter((f) => f.time > end)) {
          if ((await frameDiff(base, f)).changed <= idle.changed + Math.max(0, atEnd - idle.changed) * 0.25) {
            fadeMs = Math.round((f.time - end) * 1000);
            break;
          }
        }
      }
      if (!painted && !tracks.length) continue;
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
      const video = await saveVideo(frames, `sections/${sec.id}/pointer`, cursorOverlay(path, desktop.width));
      if (video) effect.files.push(video);
      const strip = await filmstrip(frames, path, desktop.width);
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
    }
    ctx.put('page/pointer.json', json(allTracks));
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
      ctx.put(path, await adapter.screenshot(measured.rect), false);
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
