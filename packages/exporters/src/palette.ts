import type { Palette } from '@specimen/core';

export interface NamedColor {
  name: string;
  hex: string;
}

/** Every palette colour once, named by its CSS variable, else its role, else its hex. */
export function namedColors(palette: Palette): NamedColor[] {
  const used = new Set<string>();
  const unique = (name: string) => {
    let n = name;
    for (let i = 2; used.has(n); i++) n = `${name}-${i}`;
    used.add(n);
    return n;
  };
  return palette.colors.map((c) => {
    const base = c.variables[0]?.replace(/^--/, '') ?? c.roles[0] ?? `color-${c.hex.slice(1)}`;
    return { name: unique(base), hex: c.hex };
  });
}

/** W3C Design Tokens Community Group format. */
export function toDesignTokens(palette: Palette): Record<string, unknown> {
  const color: Record<string, unknown> = {};
  for (const { name, hex } of namedColors(palette)) color[name] = { $type: 'color', $value: hex };
  return { color };
}

/** A Tailwind theme extension with the palette's colours. */
export function toTailwindTheme(palette: Palette): string {
  const colors = Object.fromEntries(namedColors(palette).map((c) => [c.name, c.hex]));
  return `/** Colours captured by Specimen. Merge into tailwind.config: theme.extend.colors */\nexport default ${JSON.stringify({ theme: { extend: { colors } } }, null, 2)};\n`;
}

/** Adobe Swatch Exchange (.ase), readable by Illustrator, Photoshop, InDesign and After Effects. */
export function toAse(colors: NamedColor[]): Uint8Array {
  const blocks = colors.map(({ name, hex }) => {
    const nameLen = name.length + 1;
    const length = 2 + nameLen * 2 + 4 + 12 + 2;
    const buf = new DataView(new ArrayBuffer(6 + length));
    let o = 0;
    buf.setUint16(o, 0x0001); // colour entry
    buf.setUint32((o += 2), length);
    buf.setUint16((o += 4), nameLen);
    o += 2;
    for (let i = 0; i < name.length; i++) {
      buf.setUint16(o, name.charCodeAt(i)); // UTF-16BE code units
      o += 2;
    }
    buf.setUint16(o, 0);
    o += 2;
    for (const ch of 'RGB ') buf.setUint8(o++, ch.charCodeAt(0));
    for (let i = 0; i < 3; i++) {
      buf.setFloat32(o, parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255);
      o += 4;
    }
    buf.setUint16(o, 2); // normal (not spot/global)
    return new Uint8Array(buf.buffer);
  });
  const header = new DataView(new ArrayBuffer(12));
  'ASEF'.split('').forEach((c, i) => header.setUint8(i, c.charCodeAt(0)));
  header.setUint16(4, 1);
  header.setUint16(6, 0);
  header.setUint32(8, blocks.length);
  const total = 12 + blocks.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  out.set(new Uint8Array(header.buffer), 0);
  let pos = 12;
  for (const b of blocks) {
    out.set(b, pos);
    pos += b.length;
  }
  return out;
}
