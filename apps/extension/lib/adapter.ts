import type * as Core from '@specimen/core';
import type { Breakpoint, Rect, StyleSheetText } from '@specimen/core';

export type CoreFn = {
  [K in keyof typeof Core]: (typeof Core)[K] extends (...args: never[]) => unknown ? K : never;
}[keyof typeof Core];

export interface Capabilities {
  /** Screenshots beyond the viewport without scrolling. */
  exactFullPage: boolean;
  /** Single-file MHTML snapshot of the page. */
  mhtml: boolean;
  /** Read every stylesheet, including cross-origin ones. */
  allStyleSheets: boolean;
  /** Record the tab as video frames. */
  screencast: boolean;
  /** Install instrumentation before page scripts run (deep mode). */
  hooks: boolean;
  /** Screenshots fast enough to step animations frame by frame. */
  frameStepping: boolean;
  /** A real pointer (CSS :hover from the browser itself); otherwise hover is simulated. */
  realPointer: boolean;
  /** Mobile device emulation (touch, mobile viewport); otherwise breakpoints are window widths. */
  deviceEmulation: boolean;
}

export interface ScreencastFrame {
  data: Uint8Array;
  type: 'image/jpeg' | 'image/png';
  /** Seconds. */
  time: number;
  scrollY: number;
}

/**
 * Everything the capture pipeline needs from a browser. Chromium implements it with the
 * DevTools Protocol; Firefox and Safari adapters (phase 5) fall back to extension APIs.
 */
export interface PageAdapter {
  readonly browser: 'chromium' | 'firefox' | 'safari';
  readonly capabilities: Capabilities;
  /** Calls a function from `@specimen/core` inside the page, in an isolated world. */
  call<K extends CoreFn>(fn: K, ...args: Parameters<(typeof Core)[K]>): Promise<Awaited<ReturnType<(typeof Core)[K]>>>;
  /** Runs a self-contained function in the page's own JS world (to read page globals). */
  evaluateMain<A extends unknown[], R>(fn: (...args: A) => R, ...args: A): Promise<R>;
  pageInfo(): Promise<{ url: string; title: string }>;
  /** Emulates a viewport; null restores the tab's own. Returns the viewport width actually reached. */
  setViewport(bp: Breakpoint | null, scale: number): Promise<number | null>;
  /** PNG of a page-coordinate rect, at the device scale set by `setViewport`. */
  screenshot(clip: Rect): Promise<Uint8Array>;
  styleSheets(): Promise<StyleSheetText[]>;
  /** A resource the page already loaded (image, font, video), without re-downloading it. */
  resource(url: string): Promise<{ data: Uint8Array; mimeType: string } | null>;
  mhtml(): Promise<string | null>;
  /** Moves the real pointer (triggers CSS :hover and JS listeners). Viewport coordinates. */
  mouseMove(x: number, y: number): Promise<void>;
  /** Puts an element into (or out of) hover: the real pointer where available, else simulated. */
  hover(selector: string, viewportBox: Rect, on: boolean): Promise<void>;
  startScreencast(maxWidth: number, maxHeight: number): Promise<void>;
  stopScreencast(): Promise<ScreencastFrame[]>;
  /** Reloads the tab with `source` running before any page script, and waits for load. */
  reloadWithHooks(source: string, timeoutMs: number): Promise<void>;
  detach(): Promise<void>;
  onDetach(listener: (reason: string) => void): void;
}
