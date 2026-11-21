import type { Rect } from '@specimen/core';
import type { ScreencastFrame } from './adapter';

/**
 * Pointer-driven effects drawn into pixels (canvas, WebGL, video) can't be traced from styles: they
 * are found by moving the pointer and comparing frames, and shown with the cursor drawn in, since
 * screen recordings don't include the pointer.
 */

/** One pointer sample: wall-clock seconds (screencast frame times use the same clock) and viewport CSS px. */
export interface PointerSample {
  t: number;
  x: number;
  y: number;
  down?: boolean;
}

type Frame = Pick<ScreencastFrame, 'data' | 'type' | 'time'>;

/** An S-shaped stroke across `area` (viewport CSS px), like a hand writing across it. */
export function strokePath(area: Rect, steps: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({
      x: area.x + area.width * (0.12 + 0.76 * t),
      y: area.y + area.height * (0.5 + 0.3 * Math.sin(t * Math.PI * 3)),
    });
  }
  return out;
}

/** Where the pointer was at time `t`, interpolated between samples (null before the first). */
export function pointerAt(path: PointerSample[], t: number): PointerSample | null {
  if (!path.length || t < path[0].t) return null;
  for (let i = 1; i < path.length; i++) {
    if (path[i].t >= t) {
      const a = path[i - 1];
      const b = path[i];
      const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, down: b.down };
    }
  }
  return path[path.length - 1];
}

/** Draws a macOS-style arrow cursor with its tip at (x, y), in frame pixels. */
export function drawCursor(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, size: number, down = false): void {
  const s = size / 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (down) {
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 10, 10, 0.18)';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 17);
  ctx.lineTo(4.2, 13);
  ctx.lineTo(7.2, 19.6);
  ctx.lineTo(10, 18.4);
  ctx.lineTo(7.1, 12);
  ctx.lineTo(12.6, 12);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#0A0A0A';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.restore();
}

/** An overlay for encodeFrames that draws the pointer where it was at each frame. `cssWidth` maps CSS px to frame px. */
export function cursorOverlay(path: PointerSample[], cssWidth: number) {
  return (ctx: OffscreenCanvasRenderingContext2D, time: number, width: number) => {
    const p = pointerAt(path, time);
    if (!p) return;
    const k = width / cssWidth;
    drawCursor(ctx, p.x * k, p.y * k, 22 * Math.max(1, k), p.down);
  };
}

const decode = (f: Pick<Frame, 'data' | 'type'>) => createImageBitmap(new Blob([f.data as BlobPart], { type: f.type }));

/** Small greyscale copy of a frame for comparing. */
async function thumb(f: Frame, width = 160): Promise<{ px: Uint8ClampedArray; w: number; h: number }> {
  const bitmap = await decode(f);
  const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * width));
  const canvas = new OffscreenCanvas(width, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, h);
  bitmap.close();
  return { px: ctx.getImageData(0, 0, width, h).data, w: width, h };
}

export interface FrameDiff {
  /** Share of pixels that changed noticeably. */
  changed: number;
  /** Box around the changes, as shares of the frame (0–1). */
  box: { x: number; y: number; width: number; height: number } | null;
}

/** How much changed between two frames (JPEG noise ignored). */
export async function frameDiff(a: Frame, b: Frame): Promise<FrameDiff> {
  const [x, y] = await Promise.all([thumb(a), thumb(b)]);
  let changed = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < x.px.length; i += 4) {
    const d = Math.max(Math.abs(x.px[i] - y.px[i]), Math.abs(x.px[i + 1] - y.px[i + 1]), Math.abs(x.px[i + 2] - y.px[i + 2]));
    if (d > 24) {
      changed++;
      const p = i / 4;
      const px = p % x.w;
      const py = Math.floor(p / x.w);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  const total = x.px.length / 4;
  return {
    changed: changed / total,
    box: maxX < 0 ? null : { x: minX / x.w, y: minY / x.h, width: (maxX - minX + 1) / x.w, height: (maxY - minY + 1) / x.h },
  };
}

/** The frame closest to time `t`. */
export function frameAt(frames: Frame[], t: number): Frame {
  return frames.reduce((best, f) => (Math.abs(f.time - t) < Math.abs(best.time - t) ? f : best), frames[0]);
}

/**
 * Frames side by side with the cursor drawn in and their time under each, so an agent can see a
 * motion in one image.
 */
export async function filmstrip(frames: Frame[], path: PointerSample[], cssWidth: number, count = 6, tileWidth = 360): Promise<Uint8Array | null> {
  if (frames.length < 2) return null;
  const t0 = frames[0].time;
  const span = frames[frames.length - 1].time - t0;
  const picks = Array.from({ length: count }, (_, i) => frameAt(frames, t0 + (span * i) / (count - 1)));
  const first = await decode(picks[0]);
  const tileHeight = Math.round((first.height / first.width) * tileWidth);
  first.close();
  const label = 22;
  const gap = 8;
  const canvas = new OffscreenCanvas(count * tileWidth + (count - 1) * gap, tileHeight + label);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const overlay = cursorOverlay(path, cssWidth);
  for (const [i, f] of picks.entries()) {
    const bitmap = await decode(f);
    const tile = new OffscreenCanvas(tileWidth, tileHeight);
    const tctx = tile.getContext('2d')!;
    tctx.drawImage(bitmap, 0, 0, tileWidth, tileHeight);
    bitmap.close();
    overlay(tctx, f.time, tileWidth);
    const x = i * (tileWidth + gap);
    ctx.drawImage(tile, x, 0);
    ctx.fillStyle = '#525252';
    ctx.font = '500 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round((f.time - t0) * 1000)} ms`, x + 4, tileHeight + label / 2);
  }
  return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
}
