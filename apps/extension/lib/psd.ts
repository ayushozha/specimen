import type { LayoutNode, LayoutTree, Rect } from '@specimen/core';
import { writePsdUint8Array, type Layer } from 'ag-psd';

/**
 * A layered Photoshop file of a section: one group per box, its background drawn as its own layer,
 * images and icons as exact pixel crops of the screenshot, and editable text layers (with the
 * screenshot pixels as their preview until edited). The full screenshot is a hidden reference layer.
 */
export async function toPsd(tree: LayoutTree, screenshotPng: Uint8Array, scale: number): Promise<Uint8Array> {
  const shot = await createImageBitmap(new Blob([screenshotPng as BlobPart], { type: 'image/png' }));
  try {
    const crop = (r: Rect): HTMLCanvasElement => {
      const c = canvas(r.width * scale, r.height * scale);
      c.getContext('2d')!.drawImage(shot, r.x * scale, r.y * scale, r.width * scale, r.height * scale, 0, 0, c.width, c.height);
      return c;
    };

    const build = (n: LayoutNode): Layer | null => {
      const pos = { left: Math.round(n.x * scale), top: Math.round(n.y * scale) };
      if (n.type === 'text' && n.text) {
        const t = n.text;
        return {
          name: n.name || 'Text',
          ...pos,
          canvas: crop(n),
          text: {
            text: t.content,
            transform: [1, 0, 0, 1, pos.left, pos.top + t.fontSize * scale * 0.8],
            style: {
              font: { name: t.fontFamily.replace(/\s+/g, '') + (t.fontWeight >= 600 ? '-Bold' : '') },
              fontSize: t.fontSize * scale,
              leading: t.lineHeight * scale,
              tracking: t.letterSpacing ? (t.letterSpacing / t.fontSize) * 1000 : 0,
              fillColor: rgb(t.color),
            },
            paragraphStyle: { justification: t.align === 'center' ? 'center' : t.align === 'right' ? 'right' : 'left' },
          },
        };
      }
      if (n.type === 'image' || n.type === 'svg') return { name: n.name, ...pos, canvas: crop(n) };

      const children: Layer[] = [];
      const fill = fillLayer(n, scale);
      if (fill) children.push({ name: 'Background', ...pos, canvas: fill });
      if (n.image) children.push({ name: 'Background image', ...pos, canvas: crop(n) });
      for (const child of n.children) {
        const layer = build(child);
        if (layer) children.push(layer);
      }
      if (!children.length) return null;
      return { name: n.name, opened: false, opacity: n.opacity, children };
    };

    const root = build(tree.root);
    const reference = canvas(shot.width, shot.height);
    reference.getContext('2d')!.drawImage(shot, 0, 0);
    return writePsdUint8Array(
      {
        width: Math.round(tree.width * scale),
        height: Math.round(tree.height * scale),
        children: [{ name: 'Reference (screenshot)', hidden: true, canvas: reference }, ...(root ? [root] : [])],
      },
      { generateThumbnail: true, invalidateTextLayers: true },
    );
  } finally {
    shot.close();
  }
}

/** The box's own paint: fill or gradient, rounded corners and border. Null when it paints nothing. */
function fillLayer(n: LayoutNode, scale: number): HTMLCanvasElement | null {
  if (!n.fill && !n.gradient && !n.border) return null;
  const c = canvas(n.width * scale, n.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  const path = () => {
    ctx.beginPath();
    ctx.roundRect(0, 0, n.width, n.height, n.radius.map((r) => Math.min(r, n.width / 2, n.height / 2)));
  };
  if (n.gradient) {
    const a = ((n.gradient.angle - 90) * Math.PI) / 180;
    const g = ctx.createLinearGradient(
      n.width / 2 - (Math.cos(a) * n.width) / 2,
      n.height / 2 - (Math.sin(a) * n.height) / 2,
      n.width / 2 + (Math.cos(a) * n.width) / 2,
      n.height / 2 + (Math.sin(a) * n.height) / 2,
    );
    n.gradient.stops.forEach((s, i, all) => g.addColorStop(all.length > 1 ? i / (all.length - 1) : 0, s));
    ctx.fillStyle = g;
    path();
    ctx.fill();
  } else if (n.fill) {
    ctx.fillStyle = n.fill;
    path();
    ctx.fill();
  }
  if (n.border) {
    ctx.strokeStyle = n.border.color;
    ctx.lineWidth = n.border.width;
    ctx.beginPath();
    const h = n.border.width / 2;
    ctx.roundRect(h, h, n.width - n.border.width, n.height - n.border.width, n.radius.map((r) => Math.max(0, r - h)));
    ctx.stroke();
  }
  return c;
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function rgb(hex: string): { r: number; g: number; b: number } {
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}
