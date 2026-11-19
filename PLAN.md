# Specimen — Plan

A **browser extension** for Chrome, Brave, Edge, Arc, Opera, Vivaldi, Firefox and Safari. It captures any website **section by section** or with **one click for everything**. It gets:

- static screenshots and a live copy of the page
- motion, video, and hover and other interaction effects
- the frameworks and animation libraries the site uses
- an exact colour palette

When it can't identify the library behind an effect, it **rebuilds the effect** as code. Everything exports **natively to Figma, Paper and Adobe apps** (Illustrator, Photoshop, After Effects).

---

## 1. What it captures

| Layer | Output |
|---|---|
| **Static** | Full-page and per-section PNGs at each breakpoint (mobile / tablet / desktop), light and dark mode |
| **Web (DOM)** | Offline single-file HTML of the page and each section, computed styles, fonts, images, SVGs, network log |
| **Interactions** | Every hover, focus, active, cursor-follow and magnetic effect: before/after styles, transition timing, a clip of each |
| **Motion** | Load/intro, scroll-triggered, scroll-linked, looping and JS-driven animations as video **and** as data (keyframes, duration, delay, easing, trigger) |
| **Tech stack** | Frameworks (React, Next.js, Vue, Nuxt, Svelte, Astro, Angular), builders (Webflow, Framer, Wix, Squarespace, Shopify), CSS systems (Tailwind, Bootstrap, CSS Modules), animation libraries (GSAP + ScrollTrigger, Framer Motion/Motion, Lenis, Locomotive Scroll, AOS, Swiper, Lottie, Rive, Three.js, Spline), with versions where readable |
| **Replication** | Code that reproduces each detected effect: in the original library when known, otherwise rebuilt as CSS / Web Animations / GSAP / Motion code, with a match score |
| **Colour palette** | Every colour used, exactly as written (hex, rgb, hsl, oklch, Display P3), CSS variable names, gradients, shadows, hover-state colours, colours sampled from images and video, usage counts, roles and contrast |
| **Video & media** | Original video files and streams, posters, Lottie JSON, Rive files, canvas/WebGL recordings, shader source |
| **Replay** | rrweb recording of the session you can scrub through |

---

## 2. Architecture

```
 Browser extension (WXT, Manifest V3, one codebase)
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ Side panel UI (React)                                                     │
 │   [ Capture everything ]  section list · element picker · eyedropper      │
 │   stack · palette · motion timeline · progress · Export ▾                 │
 ├───────────────────────────────────────────────────────────────────────────┤
 │ Background service worker — runs capture jobs, browser adapter            │
 │   Chromium: chrome.debugger (CDP), tabCapture + offscreen recorder        │
 │   Firefox:  tabs.captureTab(rect), getDisplayMedia                        │
 │   Safari:   captureVisibleTab + scroll-stitch, getDisplayMedia            │
 ├───────────────────────────────────────────────────────────────────────────┤
 │ Page scripts                                                              │
 │   hooks  (MAIN world, document_start): timers/clock, rAF, Intersection-   │
 │          Observer, addEventListener registry, WebGL shader, media hooks   │
 │   core   (in page): sections, style serializer, palette, motion tracer,   │
 │          interaction prober, stack fingerprints, library adapters         │
 └───────────────────────────────────────────────────────────────────────────┘
        │ bundle (.specimen zip: JSON + PNG + MP4 + assets)
        ▼
 Exporters ─► Figma plugin · Paper (paste HTML / Paper MCP) · SVG · layered PSD
              ASE swatches · After Effects script · Lottie · Tailwind / CSS / tokens
 Optional later: companion desktop app (native messaging: ffmpeg, HLS, big files) + CLI (Playwright, same core)
```

### Monorepo (pnpm workspaces)
```
packages/
  core/        in-page analysis, framework-free TypeScript; runs in the extension and in Playwright
  hooks/       document_start instrumentation
  bundle/      bundle format, manifest schema, zip (fflate)
  exporters/   figma-json, paper-html, svg, psd, ase, ae-jsx, lottie, tailwind, tokens
apps/
  extension/   WXT app: side panel, background, content scripts, per-browser adapters
  figma-plugin/
  companion/   (phase 6) native messaging host
  cli/         (phase 6) Playwright runner
```

### Licences
SingleFile (`single-file-core`) is AGPL-3.0 and the WebAppAnalyzer fingerprints are GPL-3.0, so neither is bundled: the page snapshot uses Chromium's own MHTML (CDP `Page.captureSnapshot`) and the stack rules are our own (`packages/core/src/stack.ts`). Revisit only if the project's licence becomes compatible.

### Libraries (widely used, maintained)
WXT (cross-browser extension build, Safari wrapper), React, `@sinonjs/fake-timers` (clock control, the same one Playwright uses), rrweb, PostCSS (parsing stylesheets), `culori` (colour spaces, Delta E), Mediabunny + WebCodecs (encode MP4/WebM in the browser), `ffmpeg.wasm` (HLS/fallback), `ag-psd` (layered PSD), `dom-to-svg` (DOM → editable SVG), fflate (zip), our own stack fingerprint rules (see Licences).

### What each browser supports

| Feature | Chromium (Chrome, Brave, Edge, Arc, Opera, Vivaldi) | Firefox | Safari |
|---|---|---|---|
| Full-page screenshot | CDP, exact | `captureTab` with rect | scroll + stitch |
| Forced `:hover`/`:focus` | CDP `CSS.forcePseudoState` | real pointer events + CSSOM | real pointer events + CSSOM |
| Event listeners on elements | CDP `getEventListeners` | hooks registry | hooks registry |
| Tab video | `tabCapture` (no prompt) | `getDisplayMedia` (user picks tab) | `getDisplayMedia` |
| Frame-exact animation video | CDP screenshot per stepped frame | real-time recording | real-time recording |
| MHTML snapshot | yes | no (SingleFile HTML only) | no |

Every feature goes through a **browser adapter** interface from day one, so Firefox/Safari get the best available fallback rather than a separate code path. `debugger` and `tabCapture` are **optional permissions** asked for the first time they're needed, since Chrome shows a "debugging this browser" bar for `debugger`. Uncertain support (MAIN-world scripting in Safari, WebCodecs versions) gets checked in the phase-5 spike.

---

## 3. Capture pipeline

### 3.1 Page prep
1. **Deep mode** (default for Capture everything) reloads the tab with `hooks` injected at `document_start`, so the extension sees every listener, observer, timer and shader from the start. **Quick mode** works on the page as it is.
2. Wait for network idle and `document.fonts.ready`. Reject cookie banners (choose "necessary only") or keep them, per setting.
3. Scroll through the page to trigger lazy loading and scroll reveals. Record what changed (this is also the first motion pass).
4. Find fixed and sticky elements and the smooth-scroll library (Lenis/Locomotive), which changes how scrolling must be driven.

### 3.2 Section detection
Semantic tags (`header`, `nav`, `section`, `footer`, `[data-section]`, Webflow/Framer section attributes), then large full-width blocks, then visual breaks. You can rename, merge, split or click-to-add sections in the side panel, and the element picker captures any single element.

### 3.3 Static and DOM
PNG per breakpoint (resize via CDP device emulation, or a window resize fallback), a "clean" variant without sticky elements, standalone `section.html` with inlined styles/fonts/images, SingleFile page HTML, HAR-like network log.

---

## 4. Hover and interaction detection

Goal: find **every** interactive effect without you hovering anything by hand.

1. **Candidates** — links, buttons, inputs, `[role=button]`, `cursor: pointer` elements, and anything with a hover/pointer listener.
2. **Find what reacts**, from three sources:
   - **CSS:** walk every stylesheet (fetch cross-origin ones through the background worker and parse with PostCSS). Collect rules with `:hover`, `:focus`, `:focus-visible`, `:active`, `:focus-within`, and `group-hover` / `peer-hover` patterns, and match them to elements, including parent rules that change children.
   - **JS listeners:** `mouseenter`, `mouseover`, `pointermove`, `mousemove`, from CDP `getEventListeners` on Chromium or from the hooks registry everywhere.
   - **Global pointer effects:** `pointermove` / `mousemove` listeners on `window` or `document` mean cursor followers, magnetic buttons, parallax tilt or custom cursors.
3. **Probe** — for each candidate, record computed styles of it and its descendants, then move a real pointer onto it (or force the state through CDP). Record styles again over the transition and diff them. Output:
   - changed properties, from → to values
   - `transition-duration` and timing
   - delay and easing
   - a short clip
   - before and after PNGs
4. **Pointer sweeps** for global effects — drive the pointer along fixed paths (grid, circle, enter/leave each element) while tracing, to capture follower lag, magnet strength and tilt range.
5. **Other states** — focus rings, pressed states, open/close of menus, accordions, tabs, modals, carousels (click-through with a safe list; never submit forms or follow links off the page).

Output: `interactions.json`, grouped by section, with each effect's type (colour change, scale, underline draw, image zoom, reveal, magnetic, cursor follower …).

---

## 5. Motion detection

1. **Motion tracer** — during load, scroll and probes, sample every visible element each frame: `transform`, `opacity`, `clip-path`, `filter`, size and position, colour and background, SVG `stroke-dashoffset`/path `d`, and CSS variables that change. Elements that change become **tracks** (property curves over time).
2. **Attribute each track to its source:**
   - **CSS animation / transition / Web Animations** → `document.getAnimations()` gives exact keyframes, timing and easing.
   - **GSAP** → `gsap.globalTimeline.getChildren()` and `ScrollTrigger.getAll()` give targets, vars, ease, start/end, scrub, pin.
   - **Framer / Motion** → `data-framer-*` attributes, style changes plus spring detection from the curve shape.
   - **Lottie / Rive** → registered animations and the source file.
   - **AOS, Swiper, Splide, Locomotive, Lenis** → their attributes and config objects.
   - **Webflow Interactions** → the IX2 data embedded in the page.
   - **IntersectionObserver** (from hooks) → which elements reveal on scroll and at what threshold.
   - **Canvas / WebGL** → record as video, save shader source and loaded models/textures.
3. **Make it repeatable** — for capture, control time with fake timers and step it frame by frame. On Chromium, take one CDP screenshot per step for perfectly smooth video at any fps. Elsewhere, record in real time.
4. **Triggers** — tag each animation as load, scroll-into-view, scroll-linked (scrub), hover, click, loop or time-based.

Output: `motion.json` (tracks + source + trigger) and per-animation MP4s per section, shown in the side panel on a timeline.

---

## 6. Framework and library detection

- **Fingerprints** — our own rule table (data, not code), covering frameworks, builders, CSS systems and motion libraries. WebAppAnalyzer's definitions are GPL-3.0, so they are not bundled. Signals:
  - JS globals (`window.gsap`, `__NEXT_DATA__`, `__NUXT__`, `__vue_app__`, React fiber keys, `ng-version`)
  - script and CSS URLs
  - DOM attributes and class patterns (Tailwind utilities, `data-framer-*`, `w-` / `data-wf-*`, `data-aos`, `data-scroll`)
  - meta generator, response headers, cookies
- **Version and plugins** where exposed (`gsap.version`, registered GSAP plugins).
- **Confidence** — each detection lists its evidence, so nothing is a black-box guess.

Output: `stack.json` and a "Built with" card in the panel.

---

## 7. Effect replication

For every effect, produce code you can drop into a project:

1. **Library known** → the original config, cleaned up: the GSAP tween/ScrollTrigger vars, the Motion `animate`/`whileHover` props, the CSS keyframes, the Lottie file.
2. **Library unknown** → rebuild from the traced curves:
   - Fit each property curve to a **cubic-bezier** (least squares) or a **spring** (stiffness, damping, mass). Pick the better fit and report the error.
   - Merge tracks that start together into one timeline with staggers.
   - Generate the output in a target of your choice: CSS (`@keyframes`, `transition`, scroll-driven `animation-timeline: view()`), Web Animations, GSAP + ScrollTrigger, or Motion for React.
3. **Verify** — play the replica in a hidden test page with the same element, record it, and compare frames against the original (SSIM). Show a **match score**. Below a threshold, label it "approximate" and keep the raw video as reference.
4. **Limits** — WebGL/shader effects get the shader source and a video, not a full rebuild. Video stays as video.

Output: `replicate/` per section with `effect.css`, `effect.gsap.js`, `effect.motion.tsx`, and a preview page.

---

## 8. Exact colour palette

1. **Accurate pixels** — screenshots are taken in sRGB without display-profile shifts (Chromium: CDP screenshot; colour values themselves always come from CSS, not pixels).
2. **Collect from CSS**, every element and state:
   - `color`, `background-color`, borders, outline, `fill`, `stroke`, caret, `::selection`, `::placeholder`, scrollbar, `accent-color`
   - gradient stops, `box-shadow`, `text-shadow`, `filter: drop-shadow`
   - SVG inline colours
   - all custom properties on `:root` and themes, which are usually the designer's real tokens: their **names are kept**
3. **Every state** — hover/focus colours from the interaction probe, dark mode (emulate `prefers-color-scheme`), every breakpoint.
4. **Keep the exact value** — the authored value and colour space (`#1a1a1a`, `oklch(…)`, `color(display-p3 …)`) **and** its sRGB hex. For transparent colours, keep the rgba and the **composited** colour on its real background.
5. **Images and video** — sample key colours with median-cut in OKLab per image/poster/frame, marked as "from media", separate from UI colours.
6. **Organise:**
   - group near-duplicates (Delta E 2000 below a setting, default 1), but never lose the exact originals
   - count usage and record **where used** (click to highlight the elements)
   - assign roles: background, surface, text primary/secondary, accent, border, state colours
   - build tonal ramps when the site uses a scale
   - WCAG/APCA contrast for every text/background pair that actually occurs
7. **Eyedropper** in the side panel: click any pixel or element to see its exact value, source rule and variable name.
8. **Export** — CSS variables, Tailwind theme, W3C Design Tokens JSON, Figma Variables, Paper tokens, Adobe ASE swatches.

Output: `palette.json` + a palette page in the report.

---

## 9. Exports

| Target | How | What arrives |
|---|---|---|
| **Figma** | Our Figma plugin imports a `.specimen.zip` bundle | Frames per section and breakpoint; auto layout where the site uses flex/grid; real text with fonts; image fills; **Variables** from the palette; text and effect styles; hover states as **component variants** with Smart Animate prototypes using the captured duration and easing. Quick path without the plugin: copy section as SVG and paste |
| **Paper** | Copy section as HTML with inlined styles and paste (Paper's canvas is HTML/CSS). Tokens through Paper's MCP server | Editable sections and the palette as Paper tokens |
| **Illustrator** | Editable SVG (`dom-to-svg`: live text, vectors) + ASE swatches | Vector artboards per section |
| **Photoshop** | Layered PSD (`ag-psd`): one layer/group per element, text as text layers | Editable layered comps per section and breakpoint |
| **After Effects** | Generated `.jsx` script that rebuilds each animation as a comp with layers, keyframes and the fitted easing; MP4 reference clips alongside | Editable motion |
| **Lottie** | From replicated motion of vector elements | Use in AE (via LottieFiles), Figma, Rive, web/apps |
| **Code** | CSS / Tailwind / React + Motion / GSAP snippets per section | Working components and effects |
| **Bundle** | `.zip` with everything + `index.html` report | Archive and sharing |

Adobe XD is discontinued and not supported. UXP plugins for Photoshop/Illustrator (direct import without files) are a later option.

---

## 10. One-click "Capture everything"

Toolbar button, keyboard shortcut (`commands` API) or the big button in the side panel. It runs deep-mode prep, then:
- section detection
- static + DOM at every breakpoint
- interaction probe
- motion trace and recordings
- stack detection
- replication
- palette
- media

Progress streams to the panel. A failed step is logged in `manifest.json` and doesn't stop the rest. The bundle is kept in the extension's storage (OPFS) and can be downloaded as a zip or sent straight to an export target.

## 11. Bundle layout
```
example.com_2026-11-18T14-02.specimen/
  manifest.json   index.html   stack.json   palette.json
  page/       full-*.png  page.html  page.mhtml  network.json  intro.mp4  scroll.mp4  replay/
  sections/01-hero/
              desktop.png  mobile.png  hero.html  hero.svg  hero.psd
              interactions.json  states/*.png  clips/*.mp4
              motion.json  motion/*.mp4
              replicate/  effect.css  effect.gsap.js  effect.motion.tsx  preview.html
  design/     tokens.json  tailwind.config.ts  palette.ase  fonts/  icons/
  media/      videos/  lottie/  rive/  canvas/  shaders/
  exports/    figma.json  after-effects.jsx  lottie/
```

---

## 12. Settings
Breakpoints, fps, video format, max recording length, deep vs quick mode, which steps run, cookie-banner behaviour, colour-grouping threshold, replication target (CSS / GSAP / Motion), contrast standard. One typed config with defaults, synced via `storage.sync`.

## 13. Hard parts

| Problem | Approach |
|---|---|
| Cross-origin stylesheets can't be read in the page | Fetch through the background worker with host permission, parse with PostCSS |
| Effects only visible on real hover | Real pointer probing + forced states on Chromium |
| Timing differs run to run | Fake timers, frame stepping |
| Content Security Policy blocks injected scripts | MAIN-world content scripts (not `<script>` tags) |
| Shadow DOM, iframes | Walk open shadow roots; inject into same-origin and (with permission) cross-origin frames |
| Smooth-scroll libraries ignore `window.scrollTo` | Drive them through their own API (Lenis/Locomotive) or wheel events |
| Firefox/Safari lack CDP | Adapter fallbacks (section 2 table); slightly lower fidelity is shown in the UI |
| Safari distribution | Ships inside a small macOS app via Xcode (WXT generates the project); needs an Apple developer account |
| DRM video, CAPTCHAs | Not captured / not bypassed; logged as skipped |
| Store review for `debugger` permission | Optional permission, clear purpose text |

**Use:** for reference and design study of your own sites or sites you have permission to copy. Captured assets keep their owners' rights.

---

## 14. Phases

| Phase | Scope | Done when |
|---|---|---|
| **1. Core + Chromium extension** ✅ built 2026-11-18 | WXT setup, side panel, adapter interface, section detection, static + DOM, stack detection, palette + eyedropper, bundle zip | One click on a 10-section landing page gives correct screenshots, HTML, `stack.json` and a palette whose values match the CSS exactly |
| **2. Interactions & motion** ✅ | Hooks, hover/interaction prober, motion tracer, library adapters (CSS/WAAPI, GSAP, Motion, Lottie, Webflow, AOS), frame-exact video | Fixture pages: every hover effect and animation found, with correct timing and easing |
| **3. Exports** ✅ | Figma plugin (frames, variables, styles, variants), Paper paste + MCP tokens, SVG, PSD, ASE, After Effects script, Lottie | A captured section opens editable in Figma, Paper, Illustrator, Photoshop and AE |
| **4. Replication** ✅ | Curve fitting (bezier/spring), code generation for each target, SSIM verification | Replicas of fixture effects score ≥ 0.95 SSIM |
| **5. Firefox + Safari** ✅ builds (stores not submitted) | Adapter fallbacks, Safari macOS app, store submissions (Chrome Web Store → also Brave/Arc/Opera/Vivaldi, Edge Add-ons, Firefox AMO, Mac App Store) | Same fixtures pass on all three engines at their supported tier |
| **6. Companion & CLI** ✅ CLI | Native helper for ffmpeg/HLS/ProRes and very large pages; Playwright CLI for batch captures; capture diff | — |

**Tests:** local fixture sites (CSS hover, GSAP + ScrollTrigger, Motion springs, Lenis, Webflow export, Lottie, canvas/WebGL, shadow DOM, sticky header, oklch/P3 colours). Chromium E2E with Playwright loading the unpacked extension; Firefox via `web-ext`; Safari checked manually each release.

---

### What changed from the plan (2026-11-18)

All six phases are built and tested. Where the build differs from the plan above:

- **Phase 2 — clock control.** JS-driven animations are recorded in real time (screencast) and traced, not stepped with fake timers; CSS animations and transitions are stepped frame by frame through the Web Animations API instead, which is exact without patching the page's clock. Webflow IX2 and Framer Motion are detected, not read in detail.
- **Phase 3 — Paper** uses HTML paste (Copy → HTML); tokens go through the files, not Paper's MCP server. **Adobe** apps get files (SVG, PSD, ASE, .jsx), not UXP plugins. Figma, Photoshop and After Effects output is tested against their formats and APIs, not inside the apps.
- **Phase 4 — verification** compares numbers, not SSIM: fitted curves are scored against the recorded samples, and the tests replay the generated CSS in a browser and compare it with the original curve. JS animation loops aren't rebuilt as code.
- **Phase 5 — Firefox and Safari** share one adapter built on standard extension APIs: `tabs.captureTab` (Firefox) or scroll-and-stitch (Safari), window-width breakpoints, hover simulated from the page's `:hover` rules, deep mode through a MAIN-world content script. No store submissions yet (they need developer accounts).
- **Phase 6 — no native desktop helper.** The CLI covers batch capture, diff and HLS/DASH via ffmpeg; ProRes export isn't included.
- **Security.** Two reviews with a hostile test page found and fixed script injection into saved HTML, user activation leaking to page code, typed values in exports, code injection through generated-code comments, tab-split `javascript:` URLs, and a path traversal in the CLI diff. All are regression tests.

## 15. Extension UI colours — Pure mono

The extension UI uses **no hue**: black, white and greys only. The only colour on screen is the site's captured palette, so the UI never tints how you judge it. The single exception is red, used only for the recording state and errors.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#0A0A0A` | Panel background |
| `--surface` | `#F7F7F7` | `#141414` | Cards, rows, segmented control track |
| `--surface-hover` | `#F0F0F0` | `#1C1C1C` | Row and button hover |
| `--border` | `#EAEAEA` | `#262626` | Hairlines (0.5–1px) |
| `--border-strong` | `#D4D4D4` | `#3A3A3A` | Inputs, focused rows |
| `--text` | `#0A0A0A` | `#EDEDED` | Primary text |
| `--text-muted` | `#737373` | `#8F8F8F` | Secondary text, labels (both pass WCAG AA) |
| `--accent` | `#0A0A0A` | `#EDEDED` | Primary button ("Capture everything") |
| `--on-accent` | `#FFFFFF` | `#0A0A0A` | Text on the primary button |
| `--focus` | `#0A0A0A` | `#EDEDED` | 2px focus ring with 2px offset |
| `--rec` | `#DC2626` | `#FF6166` | Recording dot and label, errors — nothing else |

Rules:
- One filled primary button per view; everything else is outlined or ghost.
- Captured swatches always sit on `--bg` or `--surface` with a `--border` hairline, never on the accent.
- Success and progress are shown with text and icons in `--text`, not green.
- Follows the browser's light/dark setting, with a manual override in settings.
- Tokens live in one `tokens.css` in `apps/extension`; the Figma plugin UI uses the same file.

---

## 16. Open questions
1. **Figma plan** — is the Figma plugin for your own use, or published to the Figma Community?
2. **Adobe** — which matters most: Photoshop, Illustrator or After Effects? It decides export order in phase 3.
3. **Replication target** — default output code: CSS, GSAP, or React + Motion?
4. **Accounts / cloud** — local-only, or sync captures to a cloud library to share with a team?
5. **Safari on iPhone/iPad** — needed, or macOS Safari only?
