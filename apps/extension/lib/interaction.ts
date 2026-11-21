import type { PointerLogSample } from '@specimen/core';
import { strToU8 } from 'fflate';
import type { PageAdapter } from './adapter';
import { CONFIG } from './config';
import { cursorOverlay, filmstrip } from './pointer';
import { encodeFrames, type EncodedVideo } from './video';

/**
 * Record interaction: the user moves their own mouse over the page while the visible tab is
 * recorded; the cursor (which screen recordings leave out) is drawn back in from the page's pointer
 * events. For effects only a person can drive well: ink and fluid trails, drag, scrubbing.
 */

export interface InteractionRecording {
  url: string;
  title: string;
  at: string;
  width: number;
  height: number;
  durationMs: number;
  samples: PointerLogSample[];
  video: EncodedVideo | null;
  strip: Uint8Array | null;
}

export interface RecordingSession {
  width: number;
  height: number;
  started: number;
}

/** Recording needs the DevTools screencast (Chrome, Edge and other Chromium browsers). */
export const canRecordInteraction = (adapter: PageAdapter) => adapter.capabilities.screencast;

export async function startInteraction(adapter: PageAdapter): Promise<RecordingSession> {
  const vp = await adapter.call('viewportSize');
  await adapter.startScreencast(vp.width * CONFIG.scale, vp.height * CONFIG.scale);
  await adapter.call('startPointerLog');
  return { width: vp.width, height: vp.height, started: Date.now() };
}

export async function stopInteraction(adapter: PageAdapter, session: RecordingSession): Promise<InteractionRecording> {
  const samples = await adapter.call('stopPointerLog').catch(() => []);
  const frames = await adapter.stopScreencast();
  const { url, title } = await adapter.pageInfo();
  const overlay = cursorOverlay(samples, session.width);
  const video = await encodeFrames(frames, CONFIG.motion.fps, undefined, overlay).catch(() => null);
  const strip = await filmstrip(frames, samples, session.width, 8).catch(() => null);
  return { url, title, at: new Date(session.started).toISOString(), width: session.width, height: session.height, durationMs: Date.now() - session.started, samples, video, strip };
}

/** INTERACTION.md and its files, for an agent to see what the pointer did and what the page did back. */
export function interactionFiles(r: InteractionRecording): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const clip = r.video ? `interaction.${r.video.ext}` : null;
  if (r.video && clip) files[clip] = r.video.data;
  if (r.strip) files['interaction-strip.png'] = r.strip;
  const t0 = r.samples[0]?.t ?? 0;
  files['pointer.json'] = strToU8(JSON.stringify(r.samples.map((s) => ({ ms: Math.round((s.t - t0) * 1000), x: Math.round(s.x), y: Math.round(s.y), down: s.down })), null, 1));
  const presses = r.samples.filter((s, i) => s.down && !r.samples[i - 1]?.down).length;
  const md = [
    `# Interaction on ${r.title || r.url}`,
    '',
    `Recorded from ${r.url} on ${r.at.slice(0, 10)} by Specimen: ${(r.durationMs / 1000).toFixed(1)}s in a ${r.width}×${r.height} viewport.`,
    `A person moved the pointer over the page (${r.samples.length} samples${presses ? `, ${presses} presses` : ''}); the clip and filmstrip show the cursor where it was.`,
    '',
    r.strip ? '![Frame by frame, cursor drawn in](interaction-strip.png)\n' : '',
    clip ? `Clip: [${clip}](${clip})` : 'The clip could not be encoded in this browser.',
    '',
    'Pointer path: `pointer.json` (ms from the start, viewport CSS px, button down). Rebuild the effect so that it responds to this path the way the clip shows: what follows the pointer, what it leaves behind, and how long that takes to fade.',
    '',
  ].join('\n');
  files['INTERACTION.md'] = strToU8(md);
  return files;
}
