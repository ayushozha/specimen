<p align="center">
  <img src="docs/assets/banner.webp" alt="Specimen — capture any website, exactly" width="100%">
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-0A0A0A">
  <img alt="Chrome, Brave, Edge, Arc" src="https://img.shields.io/badge/Chromium-Chrome%20·%20Brave%20·%20Edge%20·%20Arc-0A0A0A?logo=googlechrome&logoColor=white">
  <img alt="Firefox" src="https://img.shields.io/badge/Firefox-140%2B-0A0A0A?logo=firefoxbrowser&logoColor=white">
  <img alt="Safari" src="https://img.shields.io/badge/Safari-macOS-0A0A0A?logo=safari&logoColor=white">
  <img alt="Figma plugin" src="https://img.shields.io/badge/Figma-plugin-0A0A0A?logo=figma&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white">
  <img alt="Tests" src="https://img.shields.io/badge/tests-85%20passing-2ea44f">
  <img alt="License" src="https://img.shields.io/badge/license-none%20yet-lightgrey">
</p>

<h3 align="center">Capture any website section by section: screenshots at every breakpoint, standalone HTML, motion and hover effects, the exact colour palette and the tech stack. Rebuild it in Figma, Paper, Illustrator, Photoshop or After Effects, or as CSS, GSAP and Motion code.</h3>

---

## Contents

- [What it does](#what-it-does)
- [Screenshots](#screenshots)
- [Quick start](#quick-start)
- [What's in a bundle](#whats-in-a-bundle)
- [Outputs](#outputs)
- [Command line](#command-line)
- [How it works](#how-it-works)
- [Browser support](#browser-support)
- [Configuration](#configuration)
- [Repository map](#repository-map)
- [Testing](#testing)
- [Real-site results](#real-site-results)
- [Limits](#limits)
- [Privacy and security](#privacy-and-security)
- [License](#license)

## What it does

Specimen opens in the browser's side panel and reads a page the way the browser renders it. Nothing runs until you ask. One button, **Capture everything**, scans the page and captures it, and the panel shows the result as one page of blocks: **Screenshots and exports** (a preview and its outputs: a copy that pastes into Figma, Paper, Sketch, Penpot, Framer or Illustrator, design files, and a `DESIGN.md` folder for coding agents), **Palette**, **Motion** (pointer-effect filmstrips and the page-load and scroll recordings), **Stack** and **Sections**. **Record motion** is on by default: it reloads the page, sweeps the pointer over every section to find trails, followers and canvas effects, hovers and opens menus. If the page reacts to the mouse in a way the sweep misses, **Record interaction** under Motion records you moving it, with the cursor drawn in. **Scan page** first if you want to choose sections; **Capture** on one section recaptures just that one, and **Cancel** stops a capture and puts the page back. Earlier captures stay under **Earlier captures**.

What moves on the page travels as far as each tool allows:
- **Coding agents** get the motion as text (timing, easing, from → to), filmstrips, the rebuilt effect code, and, for canvas effects, **the page's own WebGL and WebGPU shader code** with the uniform values it set, listed per section in `DESIGN.md` and included in **Copy everything**.
- **Figma**: the plugin places each section's clips as **video layers that play** (on Figma plans that allow video; otherwise the filmstrip), and adds the section's motion cues as a **Dev Mode annotation**.
- **Framer**: **Copy component** gives a code component that renders the section exactly and, where the page drew it with a WebGL shader, runs that shader live under the pointer; **Overrides** gives code overrides that add the captured hover, reveal and scroll motion to your own layers.
- Effects built only in a site's JavaScript or WebGPU pipelines can't run inside a design tool; they come as clips, filmstrips and shader code.

| | |
|---|---|
| **Sections** | Finds the page's sections by their HTML tags, then by layout. Untick, remove or capture one, or **Pick element** to add any element: hover to see its box model, ↑ ↓ for parent or child, ↵ or click to add it. |
| **Screenshots** | Full page and every section at desktop (1440px), tablet (768px) and mobile (390px). Sticky headers are hidden in other sections' shots. |
| **HTML** | Each section as a standalone `.html` file with its images and fonts, plus an MHTML snapshot of the page. |
| **Exact colours** | Every colour as the site wrote it (`oklch(…)`, `color(display-p3 …)`, hex), its CSS variable, where it's used, roles, gradients, shadows, WCAG contrast for every text and background pair, colours from images and video, and an eyedropper. |
| **Motion** | Page-load and scroll recordings, every CSS animation captured frame by frame, scroll reveals and parallax traced and classified, GSAP timelines, ScrollTrigger, Lottie and AOS settings read from the page. |
| **Hover and interaction** | Every hover and focus effect, from CSS rules and JavaScript listeners: before and after styles, transition timing, a frame-exact clip and screenshots. Menus and accordions too. |
| **Pointer effects** | A stroke drawn over each section with a canvas (and the hero when the page tracks the pointer) finds effects drawn into pixels, like ink, fluid and WebGL trails, and elements that follow the cursor. Each gets a clip and a filmstrip **with the cursor drawn in**, where the changes were and how long the trail takes to fade. |
| **Record interaction** | You move the mouse over the page and Specimen records it, cursor drawn in, with the pointer path and an `INTERACTION.md` for agents. For effects a person drives best: ink, drag, scrubbing. Chrome and Edge. |
| **Effect replication** | Every effect as CSS, GSAP and Motion (React) code. Effects read from the page are exact; effects with no readable source are fitted to the recorded motion (cubic-bezier or spring) with a match score, and a preview page replays them. |
| **Tech stack** | 41 frameworks, site builders, CSS systems and animation libraries, with versions and evidence. |
| **Outputs** | Copy and paste into Figma, Paper, Sketch, Penpot, Framer, Illustrator, Canva, Keynote; the Figma plugin; layered PSD; After Effects and Lottie; a `DESIGN.md` spec for Claude Code, Codex, Cursor and chat agents; the full `.specimen.zip`. See [Outputs](#outputs). |

## Screenshots

<table>
  <tr>
    <td width="33%"><img src="docs/assets/panel-one-capture.png" alt="One capture shown as blocks: screenshots and exports, palette, motion, stack and sections"></td>
    <td width="33%"><img src="docs/assets/panel-palette.png" alt="Palette block showing roles, swatches and a Display P3 colour with its CSS variable"></td>
    <td width="33%"><img src="docs/assets/panel-pointer-effect.png" alt="Motion block with a canvas pointer effect, its filmstrip with the cursor drawn in, and the page recordings"></td>
  </tr>
  <tr>
    <td align="center"><sub>One capture, every part as a block</sub></td>
    <td align="center"><sub>Palette</sub></td>
    <td align="center"><sub>Motion: pointer sweep and recordings</sub></td>
  </tr>
</table>

<p align="center">
  <img src="docs/assets/report.png" alt="The browsable report inside a capture bundle" width="820">
  <br><sub>The report page inside every bundle</sub>
</p>

<p align="center">
  <img src="docs/assets/effects-preview.png" alt="Effects preview replaying a pulse animation and a button hover from generated CSS" width="820">
  <br><sub>Rebuilt effects replayed from the generated CSS</sub>
</p>

## Quick start

Needs Node.js 23+ and pnpm.

```bash
git clone https://github.com/ayushozha/specimen.git
cd specimen
pnpm install
pnpm build:all
```

**Chrome, Brave, Edge, Arc, Opera, Vivaldi:** open `chrome://extensions`, turn on **Developer mode**, **Load unpacked** and choose `apps/extension/.output/chrome-mv3`. Click the Specimen button: the side panel opens; click **Capture everything** to start. While it's connected, the browser shows a "started debugging this browser" bar (see [Privacy and security](#privacy-and-security)).

**Firefox 140+:** open `about:debugging#/runtime/this-firefox`, **Load Temporary Add-on** and pick `apps/extension/.output/firefox-mv3/manifest.json`. The button opens the sidebar.

**Safari (macOS):** `pnpm safari:project`, open `apps/safari/Specimen/Specimen.xcodeproj` in Xcode and run it, then turn on Specimen in Safari → Settings → Extensions (enable **Allow unsigned extensions** in the Develop menu for local builds). The button opens the panel in a window docked beside the page. Keep the selected tab active while capturing. If you switch tabs or navigate during capture, return to the page and select **Scan page** again.

**Figma plugin (optional):** in Figma desktop, **Plugins → Development → Import plugin from manifest** and pick `apps/figma-plugin/manifest.json`. In Specimen, use **Figma → Plugin file**, run the plugin and drop the file on it. Paste (**Figma → Copy**, then ⌘V) needs no plugin.

## What's in a bundle

```
example.com-pricing_2026-11-18T14-02-11.specimen.zip
  index.html               browsable report
  manifest.json            page, breakpoints (and widths actually captured), sections, motion and export summary, errors
  palette.json  stack.json
  page/
    full-desktop.png  full-tablet.png  full-mobile.png  page.mhtml
    intro.mp4  scroll-desktop.mp4  pointer.mp4      load, scroll and pointer recordings
    motion.json  pointer.json                       hooks, libraries (GSAP, ScrollTrigger, Lottie), totals
  sections/02-hero/
    desktop.png  tablet.png  mobile.png  02-hero.html  scroll.mp4
    motion.json            CSS animations (keyframes, timing) and traced, classified motion
    motion/pulse-a1.mp4    animations captured frame by frame
    interactions.json      hover and focus: changed styles, transitions
    states/*--default.png *--hover.png *--hover.mp4 *--focus.png *--open.png
  design/  palette.css  media-colors.json
  exports/                 see below
  assets/                  images and fonts used by the section HTML
```

## Outputs

Every capture under **Screenshots and exports** has these, for all its sections or the one you select:

| Where | How | What you get |
|---|---|---|
| **Figma** | **Copy**, then ⌘V in Figma | The section as editable layers: frames, text, images, gradients, borders and shadows. Several sections paste as frames stacked with a gap. |
| **Figma (plugin)** | **Plugin file**, dropped on the Specimen plugin | Everything in the Figma row below: auto layout, colour variables, hover variants. |
| **Paper** | **Copy**, then ⌘V in Paper | The section as HTML with its images inline; Paper turns it into layers. |
| **Sketch, Penpot, Framer, Illustrator** | **Copy SVG**, or **.svg** | One self-contained SVG: images, the background and fonts are inside the file. |
| **Photoshop** | **.psd** | The layered PSD below. |
| **Canva, Keynote, Slides, Notion** | **Copy image** | The section's screenshot. |
| **After Effects, Lottie** | **.jsx**, **Lottie** (when motion was recorded) | The animation exports below. |
| **Claude Code, Codex, Cursor** | **Save to folder** (Chrome, Edge; a zip elsewhere) | `design-spec/`: `DESIGN.md` with exact colours, type scale, radii, shadows, spacing and stack; per section a screenshot at each width, a highlight image with numbered callouts (headings, buttons, cards, images) and their exact styles, and motion and hover cues with timings; `tokens.json`; recordings. |
| **Claude, ChatGPT, Grok, Gemini** | **Copy prompt**, **Copy screenshot** | The same `DESIGN.md` text to paste into a chat, with the screenshot to attach. |
| **Everything** | **Download everything (.zip)** | The full bundle described above. |

### Inside the bundle

| Target | File | What you get |
|---|---|---|
| **Figma** | `exports/figma.json` + the plugin | One frame per section with real frames, text, images and vectors; auto layout where it reproduces the page exactly; colour **variables** and styles; hover states as **component variants** wired with Smart Animate using the captured duration and easing; the screenshot as a hidden reference layer. |
| **SVG** | `exports/svg/<section>.svg` | Self-contained, editable SVG: boxes, gradients, borders, shadows, images and live text placed line by line, with images and fonts inline. Matches the screenshot on more than 97% of pixels in the tests. |
| **Photoshop** | `exports/psd/<section>.psd` | A group per box, backgrounds as layers, images as exact crops, editable text layers, the screenshot as a hidden reference. |
| **After Effects** | `exports/after-effects/specimen.jsx` | Run it (File → Scripts → Run Script File): a comp per section with each animated element as a layer and keyframes with easing; endless animations loop. |
| **Lottie** | `exports/lottie/*.json` | Each animation and hover effect, playable in lottie-web, After Effects (LottieFiles), Figma and Rive. |
| **Code** | `exports/code/<section>.css`, `.gsap.js`, `.motion.tsx`, `.preview.html`, `replication.json` | Every effect as CSS, GSAP (with ScrollTrigger and CustomEase) and Motion for React, a preview page and match scores. |
| **Palette** | `exports/palette.ase`, `tokens.json`, `tailwind.theme.js` | Adobe swatches, W3C design tokens, a Tailwind theme. |

## Command line

Batch captures with the real extension, capture diffs and full video downloads.

```bash
node apps/cli/src/cli.ts capture https://example.com https://example.com/pricing --out captures --concurrency 2
```

```bash
node apps/cli/src/cli.ts diff before.specimen.zip after.specimen.zip --out diff
```

```bash
node apps/cli/src/cli.ts check captures/*.specimen.zip
```

```bash
node apps/cli/src/cli.ts media captures/example.com_2026-11-18T14-02-11.specimen.zip --out media
```

- `capture` takes URLs or `--urls file.txt`, runs **Scan page** and **Capture everything** for each (with motion unless `--no-motion`) and never overwrites a file.
- `diff` reports added and removed sections, a pixel diff of every section with highlighted images, colour and CSS variable changes, tech-stack changes and motion totals (`diff/index.html`, `diff/diff.json`).
- `check` reports a bundle's errors, stack and motion, and how closely each SVG export matches its screenshot. Bundles from others are opened with scripts off and no network.
- `media` downloads the original videos a capture references; HLS and DASH streams go through `ffmpeg`.

Run `npx playwright install chromium` once before the first capture.

## How it works

```
 Panel (React)               Adapter                                  The page
 ─────────────               ───────                                  ────────
 Capture everything  ──►  Chromium: DevTools Protocol            ──►  isolated world: @specimen/core
                          Firefox, Safari: scripting, tabs,           sections · palette · stack · HTML
                          windows (no DevTools)                       layout tree · motion tracer · hover
                                                                 ──►  page world: library probes, deep-mode
                                                                      hooks (listeners, IntersectionObserver)
          ◄── @specimen/exporters: Figma · SVG · PSD · AE · Lottie · ASE · tokens · CSS/GSAP/Motion code
          ◄── zip (fflate) with a report
```

- **Deep mode.** With **Record motion** on, capture reloads the page with small hooks installed before the site's own scripts, to record which elements react to the pointer and which are watched for scrolling into view. The reload is recorded as the page-load video.
- **Frame-exact motion.** CSS animations and hover transitions are paused and stepped frame by frame through the Web Animations API, with one screenshot per frame, so clips are smooth at any frame rate.
- **Exact colours.** Colours come from computed CSS, not pixels. Pixels are sampled only for images and video.
- **Replication.** Effects read from the page (CSS keyframes, transitions, GSAP settings) are copied exactly. Motion with no readable source is fitted to a named easing, a cubic-bezier or a spring, scored against the recording, and replayed in a browser by the tests.

## Browser support

| | Chromium (Chrome, Brave, Edge, Arc, Opera, Vivaldi) | Firefox 140+ | Safari (macOS) |
|---|---|---|---|
| Panel | Side panel | Sidebar | Small window |
| Screenshots | DevTools, exact | `tabs.captureTab`, exact | Scroll and stitch |
| Breakpoints | Device emulation (touch, mobile) | Window resize, within screen limits | Window resize, within screen limits |
| Hover | Real pointer | Simulated from the page's `:hover` rules and events | Same as Firefox |
| Videos | Load, scroll, pointer, frame-stepped clips | Frame-stepped clips | Screenshots only |
| MHTML | Yes | No | No |
| Site access | None needed (DevTools) | Asked once, when a capture starts | Asked once, when a capture starts |

Every bundle's `manifest.json` records the width each breakpoint was actually captured at, and anything a browser couldn't do appears under **Steps that failed** in the report.

## Configuration

Defaults are in one file: [`apps/extension/lib/config.ts`](apps/extension/lib/config.ts): breakpoints, screenshot scale, cookie-banner handling, palette grouping, motion limits (animations, frames, hover probes, toggles), frame rate, recording lengths and safety limits on page height, sections and asset size.

## Repository map

```
packages/core/          runs in the page: sections, palette, stack, HTML, layout tree, motion, hover, hooks
packages/exporters/     pure TypeScript: SVG, Lottie, After Effects, ASE, tokens, Figma document, easing fits, code
apps/extension/         WXT + React panel, DevTools and extension-API adapters, capture pipeline, PSD, video encoding
apps/figma-plugin/      Figma plugin that imports a .specimen.zip
apps/safari/            Xcode project made by `pnpm safari:project`
apps/cli/               batch capture, diff, media download
tests/                  fixture pages (including a hostile one) and Playwright tests
PLAN.md                 product plan, decisions and what changed from it
```

## Testing

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
```

- **Unit tests (44):** colour maths, median cut, motion maths, easing fits (named, bezier, spring), every exporter including the agent DESIGN.md (callouts, tokens), generated-code safety, and the Figma importer against a recording stand-in for Figma's API.
- **Browser tests (41):** the core in a real page, including the picker's box model and keys and scrolling against a smooth-scroll library; a canvas ink effect found, timed and recorded with the cursor; Record interaction; Cancel putting the page back; the full extension capturing the fixture; nothing running before Scan page; a one-section capture and every output (SVG, HTML and image copies read back from the clipboard, the plugin file, the agent spec); every export opened the way its tool would (SVG pixel-compared to the screenshot, PSD parsed, Lottie played in lottie-web, the After Effects script parsed); generated CSS replayed and compared to the original curve; the Firefox/Safari code path run inside Chromium; the CLI's batch capture, diff and HLS download; and a hostile page that tries to inject scripts, steal typed values, get user activation and escape file paths.

Run `npx playwright install chromium` once. The Firefox build is checked with `npx web-ext lint --source-dir apps/extension/.output/firefox-mv3` (0 errors) and the Safari app with `xcodebuild`.

## Real-site results

Captured with the real extension through the CLI (`specimen capture`, headless Chromium, 1440px desktop) and scored with `specimen check` on 2026-11-20. "SVG match" is the share of pixels in each section's SVG export, opened from the bundle, that match the section's real screenshot.

| Site | Time | Sections | Stack detected | Hover effects | SVG match (per section) |
|---|---|---|---|---|---|
| linear.app | 166s | 9 | React, Next.js, styled-components | 25 | 94–99% |
| tailwindcss.com | 85s | 7 | React, Next.js 16.2, Tailwind | 12 | 93–99% |
| vercel.com | 80s | 6 | React, Next.js 16.5 canary, Tailwind | 20 | 86–99% |
| framer.com | 116s | 4 | React, Framer | 12 | 84–99% |
| gsap.com | 87s | 8 | GSAP 3.15 + ScrollTrigger | 15 | 80–97% |
| stripe.com | 196s | 12 | React, Next.js 14.2.32, Three.js 178 | 13 | 85–98%; header 54% |

Each section is scrolled through so its reveals play, one-off animations finish, and the page is frozen (CSS animations and the page's own timers) while its screenshot, HTML and layout are read. Stripe's header is transparent and its animated hero shows through it, which the header's own layers can't reproduce.

Testing on real sites found and fixed: colour values that crashed the parser (apple.com); scroll-driven animations that crashed frame stepping, lazy content moving sections, pinned sections, a dialog left open over later screenshots, uncached fonts, and page-styled inline SVGs turning black (stripe.com); hundreds of unused fonts in exports (framer.com); section names losing spaces (linear.app); oversized wrapper blocks, doubled text over pixel layers and shadows repainting translucent backgrounds (tailwindcss.com); and poorly fitted effects written as code.

## Limits

- Firefox and Safari can't emulate mobile devices; breakpoints there are window widths, limited by the screen and the browser's minimum window size.
- JavaScript animation loops (requestAnimationFrame) are recorded as video and traced, not rebuilt as code; WebGL and canvas effects are recorded only.
- Content inside cross-origin iframes isn't captured. DRM video can't be captured, and Specimen doesn't get past CAPTCHAs or logins.
- Section HTML and design exports reproduce the widest breakpoint's layout exactly; they aren't responsive.
- Transparent elements show whatever is behind them in the screenshot (another section's animation, say); their own layers can't reproduce that.
- Figma, Photoshop and After Effects imports are tested against their file formats and APIs, not inside those apps.

## Privacy and security

- The extension processes captures locally, without an account, analytics, or a Specimen server. Read the [privacy policy](https://specimen.ayushojha.com/privacy.html).
- **Chromium** uses the `debugger` permission (the DevTools Protocol) on the tab you capture, only while the panel is open on it. No host permissions.
- **Firefox and Safari** ask for access to sites when you start a capture, to read cross-origin stylesheets and assets the page already uses.
- Generated files are treated as untrusted page content:
  - Generated section HTML has a Content Security Policy that blocks scripts in that document. Embedded frames can still load their own content.
  - Scripts, event handlers and `javascript:` links (including ones split by tabs or newlines) are removed.
  - Page text in generated code stays inside comments and strings.
  - The section HTML serializer does not read live input values directly. Markup, screenshots, recordings, and browser-generated MHTML may still contain sensitive page content.
- Page code never gets user activation from Specimen, and code run in the page's own world has a time limit.
- The CLI only downloads http(s) media, limits ffmpeg to network protocols, and never writes outside its output folder, even for bundles from someone else.
- Use it on your own sites or sites you have permission to copy. Captured content belongs to its owners.

## License

No license has been chosen yet, so all rights are reserved for now.
