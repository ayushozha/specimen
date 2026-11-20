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
  /** Longest wait for a section's one-off animations (reveals) to finish before its screenshot. */
  settleAnimationsMs: 1500,
  scroll: { stepRatio: 0.8, delayMs: 150, quickDelayMs: 60 },
  /** Click "Reject all" / "Necessary only" on cookie banners before capturing. */
  rejectCookies: true,
  palette: { groupThreshold: 1, maxSelectors: 5 },
  /** Colours sampled per image or video from the screenshot. */
  mediaColors: 5,
  /** Stop downloading section assets after this many bytes. */
  maxAssetBytes: 200 * 1024 * 1024,
  /** Limits that keep a hostile or endless page from exhausting memory. */
  maxPageHeight: 60000,
  maxSections: 60,
  /** Boxes read per section for the design-tool exports. */
  maxLayoutNodes: 1500,
  /** Time limit for code run in the page's own JS world (page getters can run during it). */
  mainWorldTimeoutMs: 5000,
  motion: {
    /** Record load, scroll, animations, hover/focus and toggles during "Capture everything". */
    enabled: true,
    fps: 30,
    /** Page-load recording after the deep-mode reload. */
    introMs: 3000,
    loadTimeoutMs: 15000,
    scrollStepRatio: 0.5,
    scrollDelayMs: 120,
    traceMaxElements: 500,
    maxAnimations: 12,
    /** Frames per animation clip; long animations are sampled more sparsely, never cut short. */
    maxFramesPerAnimation: 30,
    maxInteractions: 24,
    /** Time limit per motion step on heavy pages; what's left is reported in the bundle. */
    stepBudgetMs: 45000,
    /** Copies of one component (same tag and classes) probed at most this many times. */
    perSignature: 2,
    maxToggles: 10,
    pointerSweepMs: 2000,
    settleMs: 250,
    clipPadding: 12,
  },
} as const;
