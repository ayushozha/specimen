import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat, canEncodeVideo } from 'mediabunny';
import type { ScreencastFrame } from './adapter';
import { CONFIG } from './config';

export interface EncodedVideo {
  data: Uint8Array;
  ext: 'mp4' | 'webm';
}

/**
 * Encodes image frames into a video in the browser (WebCodecs via Mediabunny). H.264/MP4 when the
 * browser can encode it, otherwise VP9/WebM. Frame times are kept, so irregular screencast frames
 * play back at their real speed.
 */
/** Draws on top of each frame (e.g. the cursor); `time` is the frame's own time. */
export type FrameOverlay = (ctx: OffscreenCanvasRenderingContext2D, time: number, width: number, height: number) => void;

export async function encodeFrames(
  frames: Pick<ScreencastFrame, 'data' | 'type' | 'time'>[],
  fallbackFps = 30,
  maxSide = CONFIG.motion.maxVideoSide,
  overlay?: FrameOverlay,
): Promise<EncodedVideo | null> {
  // Screencast frames can arrive out of order or with repeated times; encoders need increasing times.
  frames = [...frames].sort((a, b) => a.time - b.time).filter((f, i, all) => i === 0 || f.time > all[i - 1].time);
  if (frames.length < 2) return null;
  const first = await decode(frames[0]);
  // Hardware H.264 encoders refuse large frames ("Flushing error." on a 2880×1800 hero), so clips are
  // scaled to fit maxSide; H.264 also needs even dimensions.
  const scale = Math.min(1, maxSide / Math.max(first.width, first.height));
  const width = Math.floor((first.width * scale) / 2) * 2;
  const height = Math.floor((first.height * scale) / 2) * 2;
  first.close();
  if (width < 2 || height < 2) return null;

  const avc = await canEncodeVideo('avc', { width, height });
  let lastError: unknown = null;
  // H.264/MP4 first; if the encoder still fails, VP9/WebM.
  for (const codec of avc ? (['avc', 'vp9'] as const) : (['vp9'] as const)) {
    try {
      return await encodeWith(codec, frames, width, height, fallbackFps, overlay);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function encodeWith(
  codec: 'avc' | 'vp9',
  frames: Pick<ScreencastFrame, 'data' | 'type' | 'time'>[],
  width: number,
  height: number,
  fallbackFps: number,
  overlay?: FrameOverlay,
): Promise<EncodedVideo | null> {
  const target = new BufferTarget();
  const output = new Output({ format: codec === 'avc' ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(source);
  await output.start();
  try {
    const t0 = frames[0].time;
    for (let i = 0; i < frames.length; i++) {
      const bitmap = await decode(frames[i]);
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      overlay?.(ctx, frames[i].time, width, height);
      const time = frames[i].time - t0;
      const next = i + 1 < frames.length ? frames[i + 1].time - t0 : time + 1 / fallbackFps;
      await source.add(time, Math.max(1 / 120, next - time));
    }
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  }
  return target.buffer ? { data: new Uint8Array(target.buffer), ext: codec === 'avc' ? 'mp4' : 'webm' } : null;
}

function decode(frame: Pick<ScreencastFrame, 'data' | 'type'>): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([frame.data as BlobPart], { type: frame.type }));
}
