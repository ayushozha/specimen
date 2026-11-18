import type { Breakpoint } from '@specimen/core';

/** Defaults for a capture. One place, so nothing in the pipeline hard-codes these. */
export const CONFIG = {
  breakpoints: [
    { name: 'desktop', width: 1440, height: 900, mobile: false },
    { name: 'tablet', width: 768, height: 1024, mobile: false },
    { name: 'mobile', width: 390, height: 844, mobile: true },
  ] satisfies Breakpoint[],
  /** Device pixel ratio for screenshots. */
  scale: 1,
  /** Pages taller than this (CSS px × scale) are saved as several full-page tiles. */
  maxTileHeight: 16000,
  /** Wait after changing the viewport, for layout and lazy images. */
  settleMs: 600,
  scroll: { stepRatio: 0.8, delayMs: 150, quickDelayMs: 60 },
  /** Click "Reject all" / "Necessary only" on cookie banners before capturing. */
  rejectCookies: true,
  palette: { groupThreshold: 1, maxSelectors: 5 },
  /** Colours sampled per image or video from the screenshot. */
  mediaColors: 5,
  /** Stop downloading section assets after this many bytes. */
  maxAssetBytes: 200 * 1024 * 1024,
} as const;
