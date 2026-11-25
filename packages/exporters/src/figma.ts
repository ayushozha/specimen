import type { LayoutTree } from '@specimen/core';
import type { NamedColor } from './palette';

/** A hover state the Figma plugin turns into component variants with a Smart Animate prototype. */
export interface FigmaVariant {
  name: string;
  /** Element box relative to the section. */
  x: number;
  y: number;
  width: number;
  height: number;
  defaultImage: string;
  hoverImage: string;
  durationMs: number;
  easing: [number, number, number, number];
  /** Set when the page's easing is a spring (CSS linear()): Figma plays a spring instead of the bezier. */
  spring?: { mass: number; stiffness: number; damping: number } | null;
}

export interface FigmaSection {
  id: string;
  name: string;
  /** Section screenshot path in the bundle, placed as a locked reference layer. */
  screenshot: string;
  /** Screenshot without text and images, for boxes drawn from pixels; null when none are. */
  background: string | null;
  tree: LayoutTree;
  variants: FigmaVariant[];
  /**
   * Motion placed beside the section: clips as video layers that play in Figma, and filmstrips
   * (frame by frame, cursor drawn in). Plain strings are filmstrip paths from older plugin files.
   */
  motion?: (FigmaMotionMedia | string)[];
  /** Motion cues (hover, scroll, pointer, shaders) shown as a Dev Mode annotation on the section. */
  notes?: string[];
}

export interface FigmaMotionMedia {
  kind: 'video' | 'image';
  /** Bundle path. */
  path: string;
  label: string;
  /** Size in CSS px the clip was recorded at (videos; images are measured). */
  width: number;
  height: number;
}

/** `exports/figma.json`: everything the Specimen Figma plugin needs, with image paths into the bundle. */
export interface FigmaDocument {
  format: 'specimen-figma';
  version: 1;
  source: { url: string; title: string };
  colors: NamedColor[];
  sections: FigmaSection[];
  /** Image URL → bundle path. */
  assets: Record<string, string>;
}

/**
 * Whether a flex box can become Figma auto layout without moving anything: its children must sit
 * exactly where auto layout (padding, gap, start alignment) would put them. Otherwise keep absolute
 * positions, which are always exact.
 */
export function autoLayoutFits(n: import('@specimen/core').LayoutNode, tolerance = 1): boolean {
  const l = n.layout;
  if (!l || l.wrap || n.children.length < 2) return false;
  if (!['normal', 'flex-start', 'start', 'left'].includes(l.justify)) return false;
  const [pt, pr, pb, pl] = l.padding;
  const row = l.mode === 'row';
  let cursor = row ? pl : pt;
  for (const c of n.children) {
    const main = row ? c.x - n.x : c.y - n.y;
    if (Math.abs(main - cursor) > tolerance) return false;
    cursor += (row ? c.width : c.height) + l.gap;
    const cross = row ? c.y - n.y : c.x - n.x;
    const size = row ? c.height : c.width;
    const space = row ? n.height - pt - pb : n.width - pl - pr;
    const start = row ? pt : pl;
    const expected = l.align === 'center' ? start + (space - size) / 2 : ['flex-end', 'end'].includes(l.align) ? start + space - size : start;
    if (Math.abs(cross - expected) > tolerance) return false;
  }
  return true;
}
