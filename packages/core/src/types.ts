export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SectionSource = 'semantic' | 'block' | 'split' | 'picked';

export interface Section {
  /** Stable id used for folder names, e.g. `01-hero`. */
  id: string;
  name: string;
  /** CSS selector of the section element; null for viewport-height slices. */
  selector: string | null;
  /** Position in page coordinates (CSS px) at the viewport it was measured in. */
  rect: Rect;
  source: SectionSource;
}

export interface MediaRect {
  kind: 'img' | 'video' | 'canvas' | 'background' | 'svg-image';
  src: string | null;
  rect: Rect;
}

export interface Breakpoint {
  name: string;
  width: number;
  height: number;
  mobile: boolean;
}

export interface StyleSheetText {
  url: string;
  text: string;
}
