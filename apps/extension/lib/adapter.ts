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
  /** Emulates a viewport; null restores the tab's own. */
  setViewport(bp: Breakpoint | null, scale: number): Promise<void>;
  /** PNG of a page-coordinate rect, at the device scale set by `setViewport`. */
  screenshot(clip: Rect): Promise<Uint8Array>;
  styleSheets(): Promise<StyleSheetText[]>;
  /** A resource the page already loaded (image, font, video), without re-downloading it. */
  resource(url: string): Promise<{ data: Uint8Array; mimeType: string } | null>;
  mhtml(): Promise<string | null>;
  detach(): Promise<void>;
  onDetach(listener: (reason: string) => void): void;
}
