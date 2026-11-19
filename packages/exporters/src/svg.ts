import type { LayoutNode, LayoutTree } from '@specimen/core';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Hex with alpha → fill + fill-opacity attributes. */
function paint(hex: string, attr = 'fill'): string {
  if (hex.length === 9) return `${attr}="${hex.slice(0, 7)}" ${attr}-opacity="${(parseInt(hex.slice(7), 16) / 255).toFixed(3)}"`;
  return `${attr}="${hex}"`;
}

function roundedRect(n: LayoutNode, x: number, y: number): string {
  const [tl, tr, br, bl] = n.radius.map((r) => Math.min(r, n.width / 2, n.height / 2));
  const w = n.width;
  const h = n.height;
  if (tl === tr && tr === br && br === bl) return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${tl ? ` rx="${tl}"` : ''}`;
  return `<path d="M${x + tl},${y}H${x + w - tr}${tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : ''}V${y + h - br}${br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : ''}H${x + bl}${bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : ''}V${y + tl}${tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : ''}Z"`;
}

/**
 * An editable SVG of a section: boxes, gradients, borders, shadows, images and live text placed line
 * by line. Opens in Illustrator, Figma (paste or import), Sketch and browsers.
 * `href` maps an image URL to the path or data URL to embed (null drops the image).
 */
export function toSvg(tree: LayoutTree, href: (url: string) => string | null): string {
  const defs: string[] = [];
  let id = 0;
  const body: string[] = [];

  const draw = (n: LayoutNode, ox: number, oy: number): string => {
    const x = round(ox + n.x);
    const y = round(oy + n.y);
    const parts: string[] = [];
    const shape = roundedRect(n, x, y);

    if (n.shadows.length) {
      const fid = `s${id++}`;
      defs.push(
        `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%">${n.shadows
          .filter((s) => !s.inset)
          .map((s) => `<feDropShadow dx="${s.x}" dy="${s.y}" stdDeviation="${s.blur / 2}" flood-color="${s.color.slice(0, 7)}" flood-opacity="${s.color.length === 9 ? (parseInt(s.color.slice(7), 16) / 255).toFixed(3) : 1}"/>`)
          .join('')}</filter>`,
      );
      if (n.fill || n.gradient) parts.push(`${shape} ${n.fill ? paint(n.fill) : 'fill="#000"'} filter="url(#${fid})"/>`);
    }
    if (n.gradient) {
      const gid = `g${id++}`;
      const a = ((n.gradient.angle - 90) * Math.PI) / 180;
      const [x1, y1, x2, y2] = [0.5 - Math.cos(a) / 2, 0.5 - Math.sin(a) / 2, 0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2].map(round);
      const stops = n.gradient.stops.map((c, i, all) => `<stop offset="${all.length > 1 ? i / (all.length - 1) : 0}" stop-color="${c.slice(0, 7)}"${c.length === 9 ? ` stop-opacity="${(parseInt(c.slice(7), 16) / 255).toFixed(3)}"` : ''}/>`);
      defs.push(`<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.join('')}</linearGradient>`);
      parts.push(`${shape} fill="url(#${gid})"/>`);
    } else if (n.fill) parts.push(`${shape} ${paint(n.fill)}/>`);

    if (n.image) {
      const src = href(n.image);
      if (src) {
        const fit = n.imageFit === 'cover' ? 'xMidYMid slice' : n.imageFit === 'contain' ? 'xMidYMid meet' : 'none';
        parts.push(`<image href="${esc(src)}" x="${x}" y="${y}" width="${n.width}" height="${n.height}" preserveAspectRatio="${fit}"/>`);
      }
    }
    if (n.svg) parts.push(n.svg.replace(/^<svg\b/, `<svg x="${x}" y="${y}"`));
    if (n.text) {
      const t = n.text;
      const lines = t.lines
        .map((l) => {
          const baseline = round(oy + l.y + (l.height - t.fontSize) / 2 + t.fontSize * 0.8);
          return `<tspan x="${round(ox + l.x)}" y="${baseline}">${esc(t.transform === 'uppercase' ? l.text.toUpperCase() : l.text)}</tspan>`;
        })
        .join('');
      parts.push(
        `<text font-family="${esc(t.fontFamily)}" font-size="${t.fontSize}" font-weight="${t.fontWeight}"${t.italic ? ' font-style="italic"' : ''}${t.letterSpacing ? ` letter-spacing="${t.letterSpacing}"` : ''} ${paint(t.color)}${t.decoration.includes('underline') ? ' text-decoration="underline"' : ''}>${lines}</text>`,
      );
    }
    if (n.border) parts.push(`${roundedRect({ ...n, width: n.width - n.border.width, height: n.height - n.border.width }, x + n.border.width / 2, y + n.border.width / 2)} fill="none" ${paint(n.border.color, 'stroke')} stroke-width="${n.border.width}"/>`);

    let children = n.children.map((c) => draw(c, ox, oy)).join('');
    if (n.clips && children) {
      const cid = `c${id++}`;
      defs.push(`<clipPath id="${cid}">${shape}/></clipPath>`);
      children = `<g clip-path="url(#${cid})">${children}</g>`;
    }
    const content = parts.join('') + children;
    const label = ` data-name="${esc(n.name)}"`;
    return n.opacity < 1 ? `<g opacity="${n.opacity}"${label}>${content}</g>` : `<g${label}>${content}</g>`;
  };

  body.push(draw(tree.root, 0, 0));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tree.width}" height="${tree.height}" viewBox="0 0 ${tree.width} ${tree.height}">
<defs>${defs.join('')}</defs>
<rect width="${tree.width}" height="${tree.height}" ${paint(tree.background)}/>
${body.join('')}
</svg>
`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
