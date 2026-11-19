import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat, canEncodeVideo } from 'mediabunny';
import type { ScreencastFrame } from './adapter';

export interface EncodedVideo {
  data: Uint8Array;
  ext: 'mp4' | 'webm';
}

/**
 * Encodes image frames into a video in the browser (WebCodecs via Mediabunny). H.264/MP4 when the
 * browser can encode it, otherwise VP9/WebM. Frame times are kept, so irregular screencast frames
 * play back at their real speed.
 */
export async function encodeFrames(frames: Pick<ScreencastFrame, 'data' | 'type' | 'time'>[], fallbackFps = 30): Promise<EncodedVideo | null> {
  if (frames.length < 2) return null;
  const first = await decode(frames[0]);
  // H.264 needs even dimensions.
  const width = first.width - (first.width % 2);
  const height = first.height - (first.height % 2);
  first.close();
  if (width < 2 || height < 2) return null;

  const avc = await canEncodeVideo('avc', { width, height });
  const codec = avc ? 'avc' : 'vp9';
  const target = new BufferTarget();
  const output = new Output({ format: avc ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(source);
  await output.start();

  const t0 = frames[0].time;
  for (let i = 0; i < frames.length; i++) {
    const bitmap = await decode(frames[i]);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const time = frames[i].time - t0;
    const next = i + 1 < frames.length ? frames[i + 1].time - t0 : time + 1 / fallbackFps;
    await source.add(time, Math.max(1 / 120, next - time));
  }
  await output.finalize();
  return target.buffer ? { data: new Uint8Array(target.buffer), ext: avc ? 'mp4' : 'webm' } : null;
}

function decode(frame: Pick<ScreencastFrame, 'data' | 'type'>): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([frame.data as BlobPart], { type: frame.type }));
}
