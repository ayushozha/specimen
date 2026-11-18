import { medianCut, type MediaColor, type MediaRect } from '@specimen/core';

export interface MediaColors extends MediaRect {
  colors: MediaColor[];
}

export interface Tile {
  y: number;
  png: Uint8Array;
}

/**
 * Samples key colours of each image/video/canvas from the full-page screenshot, so cross-origin
 * media can be read without fetching it again. `scale` is the screenshot's device pixel ratio.
 */
export async function sampleMediaColors(tiles: Tile[], media: MediaRect[], scale: number, maxColors: number): Promise<MediaColors[]> {
  const out: MediaColors[] = [];
  const bitmaps = await Promise.all(tiles.map((t) => createImageBitmap(new Blob([t.png as BlobPart], { type: 'image/png' }))));
  try {
    for (const m of media) {
      const i = tiles.findIndex((t, idx) => m.rect.y >= t.y && m.rect.y + m.rect.height <= t.y + bitmaps[idx].height / scale);
      if (i < 0) continue;
      const w = Math.max(1, Math.round(m.rect.width * scale));
      const h = Math.max(1, Math.round(m.rect.height * scale));
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })!;
      ctx.drawImage(bitmaps[i], Math.round(m.rect.x * scale), Math.round((m.rect.y - tiles[i].y) * scale), w, h, 0, 0, w, h);
      out.push({ ...m, colors: medianCut(ctx.getImageData(0, 0, w, h).data, maxColors) });
    }
  } finally {
    bitmaps.forEach((b) => b.close());
  }
  return out;
}
