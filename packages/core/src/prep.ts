import { allElements, absoluteUrl, isRendered, pageRect, sleep, uniqueSelector } from './dom';
import type { MediaRect } from './types';

/** Scrolls to the bottom in steps so lazy content and scroll reveals load, then returns to the top. */
export async function autoScroll(stepRatio = 0.8, delayMs = 150, maxSteps = 200): Promise<number> {
  let steps = 0;
  while (steps < maxSteps) {
    const before = window.scrollY;
    window.scrollBy(0, Math.round(window.innerHeight * stepRatio));
    await sleep(delayMs);
    steps++;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom || window.scrollY === before) break;
  }
  await sleep(delayMs);
  window.scrollTo(0, 0);
  await sleep(delayMs);
  return document.documentElement.scrollHeight;
}

export async function waitForFonts(timeoutMs = 5000): Promise<void> {
  await Promise.race([document.fonts.ready, sleep(timeoutMs)]);
}

const REJECT_TEXT = /^(reject( all)?|decline( all)?|deny( all)?|refuse( all)?|(use )?(only )?(strictly )?necessary( cookies)?( only)?|only (essential|necessary)( cookies)?|continue without accepting)$/i;
const BANNER_HINT = /cookie|consent|gdpr|privacy|cmp|onetrust|didomi|usercentrics|cookiebot/i;

/**
 * Clicks the most privacy-preserving option ("Reject all", "Necessary only") in a cookie banner.
 * Returns the clicked button's text, or null when no banner was handled.
 */
export function rejectCookieBanner(): string | null {
  const buttons = allElements().filter(
    (el): el is HTMLElement => el instanceof HTMLElement && (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'A'),
  );
  for (const btn of buttons) {
    const text = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim();
    if (!REJECT_TEXT.test(text) || !isRendered(btn)) continue;
    let node: Element | null = btn;
    let inBanner = false;
    for (let depth = 0; node && depth < 8; depth++, node = node.parentElement) {
      if (BANNER_HINT.test(`${node.id} ${node.className} ${node.getAttribute('aria-label') ?? ''}`)) {
        inBanner = true;
        break;
      }
    }
    if (inBanner) {
      btn.click();
      return text;
    }
  }
  return null;
}

/** Selectors of fixed and sticky elements (headers, chat widgets, banners). */
export function findFixedElements(): string[] {
  return allElements()
    .filter((el) => {
      const s = getComputedStyle(el);
      return (s.position === 'fixed' || s.position === 'sticky') && isRendered(el, s);
    })
    .filter((el, _i, all) => !all.some((o) => o !== el && o.contains(el)))
    .map(uniqueSelector);
}

const HIDDEN_ATTR = 'data-specimen-hidden';

/**
 * Hides elements (keeping layout) so they don't repeat in section screenshots. Uses opacity, not
 * visibility: a child can undo `visibility: hidden` with `visibility: visible` (vercel.com's header
 * buttons do), but not `opacity: 0`. Transitions are off so the element is gone at once.
 */
export function hideElements(selectors: string[]): number {
  let n = 0;
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el || el.hasAttribute(HIDDEN_ATTR)) continue;
    el.setAttribute(HIDDEN_ATTR, el.getAttribute('style') ?? '');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('transition', 'none', 'important');
    n++;
  }
  return n;
}

/** Hides fixed/sticky elements that are neither inside nor around the given section. */
export function hideFixedOutside(fixed: string[], sectionSelector: string | null): number {
  const section = sectionSelector ? document.querySelector(sectionSelector) : null;
  return hideElements(
    fixed.filter((sel) => {
      const el = document.querySelector(sel);
      return el && !(section && (section.contains(el) || el.contains(section)));
    }),
  );
}

export function restoreHidden(): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`))) {
    const style = el.getAttribute(HIDDEN_ATTR);
    if (style) el.setAttribute('style', style);
    else el.removeAttribute('style');
    el.removeAttribute(HIDDEN_ATTR);
  }
}

/** Images, video, canvas and CSS background images with their page rects (for sampling media colours). */
export function listMedia(minSize = 48): MediaRect[] {
  const out: MediaRect[] = [];
  for (const el of allElements()) {
    const style = getComputedStyle(el);
    if (!isRendered(el, style)) continue;
    const rect = pageRect(el);
    if (rect.width < minSize || rect.height < minSize) continue;
    if (el instanceof HTMLImageElement) out.push({ kind: 'img', src: el.currentSrc || el.src, rect });
    else if (el instanceof HTMLVideoElement) out.push({ kind: 'video', src: el.currentSrc || el.poster || null, rect });
    else if (el instanceof HTMLCanvasElement) out.push({ kind: 'canvas', src: null, rect });
    else if (el instanceof SVGImageElement) out.push({ kind: 'svg-image', src: el.href.baseVal ? absoluteUrl(el.href.baseVal) : null, rect });
    else {
      const m = style.backgroundImage.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
      if (m) out.push({ kind: 'background', src: absoluteUrl(m[1]), rect });
    }
  }
  return out;
}

export function pageSize(): { width: number; height: number } {
  return { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight };
}
