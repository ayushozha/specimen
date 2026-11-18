/**
 * Tech-stack detection. Rules are data; each match records its evidence.
 *
 * Detection runs in two parts because extensions read page globals from a different JS world:
 * `probeGlobals` runs in the page's MAIN world and must stay self-contained (it is serialised),
 * `detectStack` runs anywhere with DOM access and combines everything.
 */

export type StackCategory = 'framework' | 'builder' | 'css' | 'animation' | 'library';
export type Confidence = 'high' | 'medium' | 'low';

export interface StackRule {
  name: string;
  category: StackCategory;
  /** Global paths, e.g. `gsap` or `__NEXT_DATA__`. Strong evidence. */
  globals?: string[];
  /** Global path holding the version, e.g. `gsap.version`. */
  version?: string;
  /** Selectors whose presence is strong evidence. */
  selectors?: string[];
  /** Regex sources matched against script and stylesheet URLs. Medium evidence. */
  urls?: string[];
  /** Regex source matched against `<meta name="generator">`; group 1 is the version. Strong evidence. */
  generator?: string;
  /** Regex source matched against class names; needs `classMin` matches. Weak evidence. */
  classes?: string;
  classMin?: number;
  /** Custom-property name prefix, e.g. `--tw-`. Medium evidence. */
  cssVarPrefix?: string;
  /** Named special probes run by `probeGlobals`. Strong evidence. */
  probes?: string[];
}

export interface StackItem {
  name: string;
  category: StackCategory;
  version: string | null;
  confidence: Confidence;
  evidence: string[];
}

export const STACK_RULES: StackRule[] = [
  // Frameworks
  { name: 'React', category: 'framework', globals: ['React'], version: 'React.version', selectors: ['[data-reactroot]'], probes: ['reactFiber'] },
  { name: 'Next.js', category: 'framework', globals: ['__NEXT_DATA__', 'next'], version: 'next.version', selectors: ['#__next', 'script#__NEXT_DATA__'], urls: ['/_next/static/'] },
  { name: 'Vue', category: 'framework', globals: ['__VUE__', 'Vue'], version: 'Vue.version', selectors: ['[data-v-app]'], probes: ['vueApp'] },
  { name: 'Nuxt', category: 'framework', globals: ['__NUXT__', '$nuxt'], selectors: ['#__nuxt'], urls: ['/_nuxt/'] },
  { name: 'Svelte', category: 'framework', classes: '^svelte-[a-z0-9]{4,}$', classMin: 3, urls: ['/_app/immutable/'] },
  { name: 'Astro', category: 'framework', selectors: ['astro-island', 'astro-slot'], generator: '^Astro v?([\\d.]+)?' },
  { name: 'Angular', category: 'framework', globals: ['ng'], selectors: ['[ng-version]'], probes: ['angularVersion'] },
  { name: 'Remix', category: 'framework', globals: ['__remixContext'] },
  { name: 'Gatsby', category: 'framework', selectors: ['#___gatsby'], generator: '^Gatsby ([\\d.]+)' },
  { name: 'SolidJS', category: 'framework', globals: ['_$HY'] },
  { name: 'Alpine.js', category: 'library', globals: ['Alpine'], version: 'Alpine.version', selectors: ['[x-data]'] },
  { name: 'htmx', category: 'library', globals: ['htmx'], version: 'htmx.version', selectors: ['[hx-get]', '[hx-post]'] },
  { name: 'jQuery', category: 'library', globals: ['jQuery'], version: 'jQuery.fn.jquery' },

  // Site builders
  { name: 'Webflow', category: 'builder', globals: ['Webflow'], selectors: ['html[data-wf-site]', 'html[data-wf-page]'], generator: '^Webflow' },
  { name: 'Framer', category: 'builder', selectors: ['[data-framer-name]', '#__framer-badge-container'], generator: '^Framer ?([\\w.]+)?' },
  { name: 'Wix', category: 'builder', globals: ['wixBiSession'], generator: '^Wix\\.com' },
  { name: 'Squarespace', category: 'builder', globals: ['Squarespace'], urls: ['squarespace(-cdn)?\\.com'] },
  { name: 'Shopify', category: 'builder', globals: ['Shopify'], urls: ['cdn\\.shopify\\.com'] },
  { name: 'WordPress', category: 'builder', urls: ['/wp-content/', '/wp-includes/'], generator: '^WordPress ?([\\d.]+)?' },
  { name: 'Ghost', category: 'builder', generator: '^Ghost ?([\\d.]+)?' },
  { name: 'Hugo', category: 'builder', generator: '^Hugo ([\\d.]+)' },

  // CSS
  { name: 'Tailwind CSS', category: 'css', cssVarPrefix: '--tw-', classes: '^(?:[a-z0-9-]+:)*(?:flex|grid|hidden|block|(?:p|px|py|pt|pb|m|mx|my|mt|mb|gap|w|h)-\\d+(?:\\.5)?|text-(?:xs|sm|base|lg|[2-9]?xl)|bg-[a-z]+-\\d{2,3}|rounded(?:-[a-z0-9]+)?|items-center|justify-between)$', classMin: 20 },
  { name: 'Bootstrap', category: 'css', globals: ['bootstrap'], version: 'bootstrap.Tooltip.VERSION', cssVarPrefix: '--bs-' },
  { name: 'styled-components', category: 'css', selectors: ['style[data-styled]'], classes: '^sc-[a-zA-Z]+$', classMin: 3 },
  { name: 'Emotion', category: 'css', selectors: ['style[data-emotion]'], classes: '^css-[a-z0-9]{5,}$', classMin: 3 },
  { name: 'CSS Modules', category: 'css', classes: '^[A-Za-z][\\w-]*_[\\w-]+__[A-Za-z0-9_-]{5}$', classMin: 5 },
  { name: 'MUI', category: 'css', classes: '^Mui[A-Z]', classMin: 3 },

  // Animation and interaction
  { name: 'GSAP', category: 'animation', globals: ['gsap', 'TweenMax'], version: 'gsap.version', urls: ['gsap(\\.min)?\\.js', '/gsap@'] },
  { name: 'GSAP ScrollTrigger', category: 'animation', globals: ['ScrollTrigger'], version: 'ScrollTrigger.version', urls: ['ScrollTrigger(\\.min)?\\.js'] },
  { name: 'Framer Motion', category: 'animation', urls: ['framer-motion', '/motion@'], selectors: ['[data-projection-id]'] },
  { name: 'Lenis', category: 'animation', globals: ['lenis', 'Lenis'], selectors: ['html.lenis'], urls: ['lenis'] },
  { name: 'Locomotive Scroll', category: 'animation', globals: ['LocomotiveScroll'], selectors: ['[data-scroll-container]', 'html.has-scroll-smooth'] },
  { name: 'AOS', category: 'animation', globals: ['AOS'], selectors: ['[data-aos]'] },
  { name: 'Anime.js', category: 'animation', globals: ['anime'], version: 'anime.version' },
  { name: 'Barba.js', category: 'animation', globals: ['barba'], version: 'barba.version', selectors: ['[data-barba="wrapper"]'] },
  { name: 'Swiper', category: 'animation', globals: ['Swiper'], selectors: ['.swiper-wrapper'] },
  { name: 'Splide', category: 'animation', globals: ['Splide'], selectors: ['.splide__track'] },
  { name: 'Lottie', category: 'animation', globals: ['lottie', 'bodymovin'], selectors: ['lottie-player', 'dotlottie-player', 'dotlottie-wc'] },
  { name: 'Rive', category: 'animation', globals: ['rive'], urls: ['@rive-app/'] },
  { name: 'Three.js', category: 'animation', globals: ['THREE', '__THREE__'], version: '__THREE__', urls: ['three(\\.module)?(\\.min)?\\.js'] },
  { name: 'Spline', category: 'animation', selectors: ['spline-viewer'], urls: ['splinetool', 'spline\\.design'] },
];

export type GlobalProbeResult = Record<string, string | true>;

/** All global paths and probes the rules need, for `probeGlobals`. */
export function globalPaths(rules: StackRule[] = STACK_RULES): { paths: string[]; probes: string[] } {
  const paths = new Set<string>();
  const probes = new Set<string>();
  for (const r of rules) {
    r.globals?.forEach((g) => paths.add(g));
    if (r.version) paths.add(r.version);
    r.probes?.forEach((p) => probes.add(p));
  }
  return { paths: [...paths], probes: [...probes] };
}

/**
 * Runs in the page's MAIN world. Self-contained: no imports or closures.
 * Returns present paths (`true`, or the value when it is a string/number) and probe results.
 */
export function probeGlobals(paths: string[], probes: string[]): GlobalProbeResult {
  const out: Record<string, string | true> = {};
  for (const path of paths) {
    try {
      let v: unknown = window;
      for (const key of path.split('.')) {
        if (v == null) break;
        v = (v as Record<string, unknown>)[key];
      }
      if (v === undefined || v === null) continue;
      out[path] = typeof v === 'string' || typeof v === 'number' ? String(v) : true;
    } catch {
      // Getter threw; treat as absent.
    }
  }
  const sample = Array.from(document.querySelectorAll('body *')).slice(0, 400);
  for (const probe of probes) {
    try {
      if (probe === 'reactFiber') {
        const hit = sample.some((el) => Object.keys(el).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$')));
        if (hit) out['probe:reactFiber'] = true;
      } else if (probe === 'vueApp') {
        const root = document.querySelector('[data-v-app]') as (Element & { __vue_app__?: { version?: string } }) | null;
        if (root?.__vue_app__) out['probe:vueApp'] = root.__vue_app__.version ?? true;
      } else if (probe === 'angularVersion') {
        const v = document.querySelector('[ng-version]')?.getAttribute('ng-version');
        if (v) out['probe:angularVersion'] = v;
      }
    } catch {
      // Ignore probe failures.
    }
  }
  return out;
}

/** Combines DOM evidence (read here) with the MAIN-world probe result. */
export function detectStack(globals: GlobalProbeResult, cssVarNames: string[] = [], rules: StackRule[] = STACK_RULES): StackItem[] {
  const urls = [
    ...Array.from(document.scripts, (s) => s.src),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"], link[rel~="modulepreload"], link[rel~="preload"]'), (l) => l.href),
    ...performance.getEntriesByType('resource').map((e) => e.name),
  ].filter(Boolean);
  const generator = document.querySelector('meta[name="generator" i]')?.getAttribute('content') ?? '';
  const classes = new Set<string>();
  for (const el of Array.from(document.querySelectorAll('[class]')).slice(0, 3000)) {
    for (const c of Array.from(el.classList)) classes.add(c);
  }

  const items: StackItem[] = [];
  for (const rule of rules) {
    const evidence: { text: string; weight: Confidence }[] = [];
    let version: string | null = null;

    for (const g of rule.globals ?? []) if (globals[g]) evidence.push({ text: `window.${g} exists`, weight: 'high' });
    if (rule.version && typeof globals[rule.version] === 'string') version = globals[rule.version] as string;
    for (const p of rule.probes ?? []) {
      const v = globals[`probe:${p}`];
      if (v) {
        evidence.push({ text: `${p} found`, weight: 'high' });
        if (typeof v === 'string') version ??= v;
      }
    }
    for (const s of rule.selectors ?? []) {
      try {
        if (document.querySelector(s)) evidence.push({ text: `element ${s}`, weight: 'high' });
      } catch {
        // Invalid selector in this browser.
      }
    }
    if (rule.generator) {
      const m = generator.match(new RegExp(rule.generator, 'i'));
      if (m) {
        evidence.push({ text: `meta generator "${generator}"`, weight: 'high' });
        version ??= m[1] ?? null;
      }
    }
    for (const u of rule.urls ?? []) {
      const re = new RegExp(u, 'i');
      const hit = urls.find((x) => re.test(x));
      if (hit) evidence.push({ text: `loads ${shortUrl(hit)}`, weight: 'medium' });
    }
    if (rule.cssVarPrefix && cssVarNames.some((n) => n.startsWith(rule.cssVarPrefix!))) {
      evidence.push({ text: `CSS variables ${rule.cssVarPrefix}*`, weight: 'medium' });
    }
    if (rule.classes) {
      const re = new RegExp(rule.classes);
      const matches = [...classes].filter((c) => re.test(c));
      if (matches.length >= (rule.classMin ?? 1)) {
        evidence.push({ text: `${matches.length} class names like "${matches[0]}"`, weight: 'low' });
      }
    }

    if (evidence.length === 0) continue;
    const confidence: Confidence = evidence.some((e) => e.weight === 'high')
      ? 'high'
      : evidence.some((e) => e.weight === 'medium') || evidence.length > 1
        ? 'medium'
        : 'low';
    items.push({ name: rule.name, category: rule.category, version, confidence, evidence: evidence.map((e) => e.text) });
  }
  return items;
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 48 ? `…${u.pathname.slice(-47)}` : u.pathname;
    return `${u.host}${path}`;
  } catch {
    return url.slice(0, 64);
  }
}
