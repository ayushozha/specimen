# Trajectory | The platform for continual learning: design spec

Captured from https://www.trajectory.ai/ on 2026-11-25 by Specimen, at desktop 1440px, tablet 768px, mobile 390px.
Every value below was read from the live page; screenshots are the source of truth when a value and a screenshot disagree.

## Using this spec

- **Claude Code, Codex, Cursor and other repo agents:** keep this folder in the repo and refer to it, e.g. “Build the hero exactly as in `DESIGN.md`, section 2.” Screenshots and highlights sit next to it.
- **Chat agents (Claude, ChatGPT, Grok, Gemini):** paste this file and attach the section screenshots it names.
- Machine-readable tokens: `tokens.json`.

## Colours

| Role | Hex | Exact value | Variables | Uses |
| --- | --- | --- | --- | --- |
| background | `#ffffff` | `rgb(255, 255, 255)` | `--background` `--card` | 178 |
| surface | `#28292e` | `rgb(40, 41, 46)` | `--color-charcoal` `--color-surface-inverse-secondary` | 6 |
| text | `#3d3e43` | `color(srgb 0.241176 0.244706 0.262353)` | – | 206 |
| text-muted | `#6c6e7c` | `rgb(108, 110, 124)` | `--color-figure-muted` `--color-grey` | 18 |
| accent | `#aeb8f2` | `rgb(174, 184, 242)` | `--color-purple` `--color-stroke-interactive-primary` | 5 |
| border | `#3e3e431a` | `oklab(0.36619 0.000957593 -0.00770146 / 0.1)` | – | 35 |
| – | `#14151b` | `rgb(20, 21, 27)` | `--color-ink` `--color-surface-inverse` | 423 |
| – | `#3e3e4380` | `oklab(0.36619 0.000957593 -0.00770146 / 0.5)` | – | 54 |
| – | `#ffffff77` | `oklab(0.999994 0.0000455678 0.0000200868 / 0.468)` | – | 28 |
| – | `#40424e26` | `oklab(0.38188 0.00284347 -0.0203371 / 0.15)` | – | 24 |
| – | `#3e3e43b3` | `oklab(0.36619 0.000957593 -0.00770146 / 0.7)` | – | 20 |
| – | `#f6f6fa` | `rgb(246, 246, 250)` | `--color-mist` | 18 |
| – | `#ffffff4d` | `oklab(0.999994 0.0000455678 0.0000200868 / 0.3)` | – | 16 |
| – | `#3e3e4340` | `oklab(0.36619 0.000957593 -0.00770146 / 0.25)` | – | 10 |
| – | `#ffffffc7` | `color(srgb 1 1 1 / 0.78)` | – | 10 |
| – | `#ffffff33` | `color(srgb 1 1 1 / 0.2)` | – | 9 |
| – | `#3e3e4373` | `oklab(0.36619 0.000957593 -0.00770146 / 0.45)` | – | 8 |
| – | `#14151b0d` | `color(srgb 0.0784314 0.0823529 0.105882 / 0.05)` | – | 7 |

Gradients:
- `radial-gradient(960px 576px at max(0px, 50% - 640px) 100%, oklab(0.6302 -0.00423637 -0.192624 / 0.85), oklab(0.6302 -0.00423637 -0.192624 / 0.45) 45%, rgba(0, 0, 0, 0))`
- `linear-gradient(in oklab, rgb(220, 224, 251) 0%, rgb(246, 246, 250) 50%, rgb(255, 255, 255) 100%)`
- `radial-gradient(closest-side, rgba(255, 255, 255, 0.6), rgba(0, 0, 0, 0))`
- `linear-gradient(rgb(230, 232, 252), rgb(250, 250, 255) 55%, rgb(236, 236, 252))`

Contrast: 10 text/background pairs are below WCAG AA (#ffffff on #ffffff 1.00:1; #ffffff on #ffffff 1.00:1; #76777a on #fafafc 4.30:1).

## Typography

Fonts: `beltram`, `inter`.

| Font | Size / line height | Weight | Letter spacing | Uses |
| --- | --- | --- | --- | --- |
| beltram | 42px / 56px | 400 | -1.05px | 5 |
| beltram | 36px / 40px | 400 | -0.9px | 8 |
| beltram | 18px / 24px | 400 | 0 | 25 |
| beltram | 17px / 26px | 400 | 0 | 37 |
| beltram | 16px / 24px | 400 | 0 | 13 |
| beltram | 14px / 20px | 400 | 0 | 58 |
| beltram | 13px / 18px | 500 | 0 | 8 |
| beltram | 13px / 18px | 400 | 0 | 8 |
| inter | 11.26px / 15.77px | 500 | 0 | 7 |
| inter | 11.26px / 15.77px | 400 | 0 | 19 |

## Shape and spacing

- Corner radius: `16777200px` (30×), `24px` (26×), `5.36px` (16×), `6px` (8×), `12px` (7×), `8.58px` (5×)
- Shadows: `0px 0px 0px 0px #000000`; `0px 1px 2px 0px #00000008`; `0px 4px 12px -4px #14151b1a`; `0px 32px 64px -16px #14151b52`
- Spacing in use (gaps and padding): 4px, 5px, 7px, 8px, 12px, 13px, 16px, 20px, 32px, 56px

## Built with

React, Next.js 16.2.10, Tailwind CSS, Lenis

## Sections

### 1. Header

1425×68 at desktop. Background `#ffffff`.

![Header](screenshots/01-header.png)

Responsive: [tablet](screenshots/01-header-tablet.png) · [mobile](screenshots/01-header-mobile.png)

Numbered highlights: ![Header, highlighted](highlights/01-header.png)

1. **Button “Log in”** at 1135,14
   - size: 70×40
   - radius: 16777200px
   - border: 1px #3e3e4340
   - layout: row, gap 4px, padding 0px 16px 0px 16px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #3d3e43
2. **Button “Book a demo”** at 1214,14
   - size: 111×40
   - background: #14151b
   - radius: 16777200px
   - layout: row, gap 4px, padding 0px 16px 0px 16px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #ffffff

Motion and interaction:

- reveal: `body > div:nth-of-type(2) > header > div`: background-color rgba(0, 0, 0, 0) → rgb(255, 255, 255), plays once as it scrolls into view
- hover: `Log in`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- focus: `Log in`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- hover: `Book a demo`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- focus: `Book a demo`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- hover: `Platform`: opacity 1 → 0.7 (opacity 200ms cubic-bezier(0.333, 0.667, 0.667, 1))
- focus: `Platform`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- hover: `Docs`: opacity 1 → 0.7; translate none → 150% -150%; translate -150% 150% → 0px (opacity 200ms cubic-bezier(0.333, 0.667, 0.667, 1), translate 200ms cubic-bezier(0.333, 0.667, 0.667, 1))
- focus: `Docs`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- hover: `Field Notes`: background-color rgba(0, 0, 0, 0) → oklab(0.97427 0.00153187 -0.00506717 / 0.5) (background-color 151ms cubic-bezier(0.405, 0.007, 0.188, 0.984))
- focus: `Field Notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)

### 2. Own your own value function

1425×900 at desktop. Background `#ffffff`.

![Own your own value function](screenshots/02-own-your-own-value-function.png)

Responsive: [tablet](screenshots/02-own-your-own-value-function-tablet.png) · [mobile](screenshots/02-own-your-own-value-function-mobile.png)

Numbered highlights: ![Own your own value function, highlighted](highlights/02-own-your-own-value-function.png)

1. **Image 1425×900** at 0,0
   - size: 1425×900
   - fit: cover
2. **Body text “The platform for continual learning”** at 101,477
   - font: beltram 400, 14px/20px
   - colour: #ffffff, capitalize
3. **Heading “Own”** at 101,504
   - font: beltram 400, 42px/56px, letter-spacing -1.05px
   - colour: #ffffff
4. **Heading “your”** at 194,504
   - font: beltram 400, 42px/56px, letter-spacing -1.05px
   - colour: #ffffff
5. **Button “Sign up”** at 101,671
   - size: 141×40
   - background: #14151b
   - radius: 16777200px
   - layout: row, gap 4px, padding 0px 20px 0px 20px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #ffffff
6. **Button “See how it works”** at 253,671
   - size: 141×40
   - background: #ffffff66
   - radius: 16777200px
   - layout: row, gap 4px, padding 0px 20px 0px 20px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #3d3e43

Motion and interaction:

- scroll: `#hero > div:nth-of-type(2)`: transform none → matrix(1, 0, 0, 1, 0, -140), follows the scroll position
- scroll: `#hero > div:nth-of-type(2)`: opacity 1 → 0, follows the scroll position
- scroll: `#hero > div:nth-of-type(3)`: opacity 0 → 0.35, follows the scroll position
- scroll: `body > div:nth-of-type(2) > nav > ul:nth-of-type(2)`: top 65px → 65px, follows the scroll position
- reveal: `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(1) > a`: color color(srgb 0.241176 0.244706 0.262353) → rgb(108, 110, 124), plays once as it scrolls into view
- reveal: `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(2) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- reveal: `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(3) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- reveal: `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(4) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- reveal: `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(5) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- reveal: `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(6) > a`: color rgb(108, 110, 124) → color(srgb 0.241176 0.244706 0.262353), plays once as it scrolls into view
- pointer: `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 810×900 at 351,0 of the viewport; the trail fades about 902ms after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).
- focus: `Sign up`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- focus: `See how it works`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- focus: `Platform`: box-shadow rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, color(srgb 0.0784314 0.0823529 0.105882 / 0.05) 0px 0px 0px 1px, color(srgb 0.0784314 0.0823529 0.105882 / 0.06) 0px 1px 2px 0px, color(srgb 0.0784314 0.0823529 0.105882 / 0.16) 0px 12px 32px -8px → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, color(srgb 0.0784314 0.0823529 0.105882 / 0.05) 0px 0px 0px 1px, color(srgb 0.0784314 0.0823529 0.105882 / 0.06) 0px 1px 2px 0px, color(srgb 0.0784314 0.0823529 0.105882 / 0.16) 0px 12px 32px -8px; opacity 0 → 0.935695; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px (instant)
- focus: `Vision`: border-bottom-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622); border-left-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622); border-right-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622); border-top-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622) (instant)
- focus: `Customers`: border-bottom-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342); border-left-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342); border-right-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342); border-top-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342) (instant)
- Recording: [motion/02-own-your-own-value-function.mp4](motion/02-own-your-own-value-function.mp4)
- Pointer stroke, frame by frame (cursor drawn in):

  ![Pointer stroke, frame by frame (cursor drawn in)](motion/02-own-your-own-value-function-pointer-strip.png)
- Pointer stroke clip: [motion/02-own-your-own-value-function-pointer.mp4](motion/02-own-your-own-value-function-pointer.mp4)

Shaders: the page's own code that draws this section's canvas. Rebuild the effect from it (same inputs, same output) rather than imitating the recording:

- [shaders/12-webgpu-wgsl.wgsl](shaders/12-webgpu-wgsl.wgsl): WebGPU WGSL, 49 lines
- [shaders/13-webgpu-wgsl.wgsl](shaders/13-webgpu-wgsl.wgsl): WebGPU WGSL, 44 lines
- [shaders/14-webgpu-wgsl.wgsl](shaders/14-webgpu-wgsl.wgsl): WebGPU WGSL, 48 lines
- [shaders/15-webgpu-wgsl.wgsl](shaders/15-webgpu-wgsl.wgsl): WebGPU WGSL, 66 lines
- [shaders/16-webgpu-wgsl.wgsl](shaders/16-webgpu-wgsl.wgsl): WebGPU WGSL, 50 lines
- [shaders/17-webgpu-wgsl.wgsl](shaders/17-webgpu-wgsl.wgsl): WebGPU WGSL, 50 lines
- [shaders/18-webgpu-wgsl.wgsl](shaders/18-webgpu-wgsl.wgsl): WebGPU WGSL, 53 lines
- [shaders/19-webgpu-wgsl.wgsl](shaders/19-webgpu-wgsl.wgsl): WebGPU WGSL, 59 lines
- [shaders/20-webgpu-wgsl.wgsl](shaders/20-webgpu-wgsl.wgsl): WebGPU WGSL, 59 lines
- [shaders/21-webgpu-wgsl.wgsl](shaders/21-webgpu-wgsl.wgsl): WebGPU WGSL, 135 lines

### 3. Section

1425×240 at desktop. Background `#ffffff`.

![Section](screenshots/03-section.png)

Responsive: [tablet](screenshots/03-section-tablet.png) · [mobile](screenshots/03-section-mobile.png)

Numbered highlights: ![Section, highlighted](highlights/03-section.png)

1. **Body text “Where leading AI keeps learning”** at 584,40
   - font: beltram 400, 18px/24px
   - colour: #3d3e43, align center

Motion and interaction:

- loop: `#content > div > section:nth-of-type(1) > div > div > div`: animation “marquee” of transform, 44000ms, linear, loops forever
- animation: `#content > div > section:nth-of-type(1) > div > div > div`: transform matrix(1, 0, 0, 1, -149.125, 0) → matrix(1, 0, 0, 1, -224.978, 0), changes over time
- focus: `Mercor (opens in a new tab)`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- focus: `Harvey (opens in a new tab)`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- Recording: [motion/03-section.mp4](motion/03-section.mp4)

### 4. The easiest way to train your models

1425×1140 at desktop. Background `#ffffff`.

![The easiest way to train your models](screenshots/04-the-easiest-way-to-train-your-mo.png)

Responsive: [tablet](screenshots/04-the-easiest-way-to-train-your-mo-tablet.png) · [mobile](screenshots/04-the-easiest-way-to-train-your-mo-mobile.png)

Numbered highlights: ![The easiest way to train your models, highlighted](highlights/04-the-easiest-way-to-train-your-mo.png)

1. **Heading “The easiest way to”** at 129,109
   - font: beltram 400, 36px/40px, letter-spacing -0.9px
   - colour: #3d3e43
2. **Body text “Shape, evaluate, and ship improvements,…”** at 745,143
   - font: beltram 400, 17px/26px
   - colour: #3d3e43
3. **Button “Watch it in action”** at 129,218
   - size: 124×40
   - background: #14151b
   - radius: 16777200px
   - layout: row, gap 4px, padding 0px 12px 0px 12px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #ffffff
4. **Button “Roll back”** at 1059,440
   - size: 69×24
   - radius: 5.36px
   - border: 1px #3e3e4326
   - font: inter 400, 11.26px/15.77px
   - colour: #3d3e43
5. **Button “v14 · 42%”** at 872,527
   - size: 315×26
   - background: #3e3e431a
   - radius: 5.36px
   - layout: row, gap 0px, padding 0px 8.58px 0px 8.58px, align center, justify flex-end
   - font: inter 400, 11.26px/15.77px
   - colour: #6c6e7c
6. **Card (×3, same size) “Latency p50”** at 415,583
   - size: 257×73
   - background: #ffffff
   - radius: 8.58px
   - border: 1px #3e3e431a
   - shadow: 0px 0px 0px 0px #000000
   - shadow: 0px 0px 0px 0px #000000
   - shadow: 0px 0px 0px 0px #000000
   - shadow: 0px 0px 0px 0px #000000
   - shadow: 0px 1px 2px 0px #00000008
   - layout: column, gap 5.36px, padding 12.87px 12.87px 12.87px 12.87px, align normal, justify normal
   - font: inter 400, 11.26px/15.77px
   - colour: #6c6e7c
7. **Card (×2, same size) “v14”** at 429,712
   - size: 763×34
   - border: 1px #3e3e4314
   - layout: row, gap 0px, padding 9.65px 0px 9.65px 0px, align center, justify space-between
   - font: inter 500, 11.26px/15.77px
   - colour: #3d3e43

Motion and interaction:

- loop: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(2) > span`: animation “pulse” of opacity, 2000ms, linear, loops forever
- scroll: `#_r_7_ > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 5.13281) → none, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 6.87) → none, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(3)`: transform matrix3d(0.88, 0, 0, 0, 0, 0.790939, 0.438371, -0.00024354, 0, -0.385767, 0.898794, -0.00049933, 0, 67.1594, 0, 1) → matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.000555556, 0, 0, 0, 1), follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)`: transform matrix(1.08, 0, 0, 1.08, 0, 54.3994) → matrix(0.96, 0, 0, 0.96, 0, 24.1775), follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)`: opacity 0.22 → 0.42, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, -482.108) → none, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2)`: opacity 0.55 → 0, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(4)`: transform matrix(1, 0, 0, 1, 0, 54.2506) → none, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(5)`: transform matrix(1, 0, 0, 1, 0, 90.9125) → none, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(6)`: transform matrix(1, 0, 0, 1, 0, 39.4552) → none, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(7)`: transform matrix3d(0.88, 0, 0, 0, 0, 0.790939, 0.438371, -0.00024354, 0, -0.385767, 0.898794, -0.00049933, 0, 68.0875, 80, 0.955556) → matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.000555556, 0, 0, 80, 0.955556), follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, -121.118) → none, follows the scroll position
- scroll: `#_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2)`: opacity 0.55 → 0, follows the scroll position
- reveal: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(2) > span:nth-of-type(1)`: transform none → none, plays once as it scrolls into view
- reveal: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(1)`: transform none → none, plays once as it scrolls into view
- reveal: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(2)`: transform none → none, plays once as it scrolls into view
- reveal: `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(3)`: transform none → none, plays once as it scrolls into view
- reveal: `#platform > div > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#platform > div > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#platform > div > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#platform > div > div:nth-of-type(2)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#platform > div > div:nth-of-type(3)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#platform > div > div:nth-of-type(3)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- pointer: `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 1269×836 at 0,0 of the viewport; the trail stays after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).
- hover: `Watch it in action`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- focus: `Watch it in action`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- Recording: [motion/04-the-easiest-way-to-train-your-mo.mp4](motion/04-the-easiest-way-to-train-your-mo.mp4)
- Pointer stroke, frame by frame (cursor drawn in):

  ![Pointer stroke, frame by frame (cursor drawn in)](motion/04-the-easiest-way-to-train-your-mo-pointer-strip.png)
- Pointer stroke clip: [motion/04-the-easiest-way-to-train-your-mo-pointer.mp4](motion/04-the-easiest-way-to-train-your-mo-pointer.mp4)

### 5. Building intelligence that never stops …

1425×765 at desktop. Background `#ffffff`.

![Building intelligence that never stops …](screenshots/05-building-intelligence-that-never.png)

Responsive: [tablet](screenshots/05-building-intelligence-that-never-tablet.png) · [mobile](screenshots/05-building-intelligence-that-never-mobile.png)

Numbered highlights: ![Building intelligence that never stops …, highlighted](highlights/05-building-intelligence-that-never.png)

1. **Heading “Building intelligence that never stops learning”** at 129,109
   - font: beltram 400, 36px/40px, letter-spacing -0.9px
   - colour: #3d3e43
2. **Body text “Shaping your models is just the beginni…”** at 745,143
   - font: beltram 400, 17px/26px
   - colour: #3d3e43
3. **Image 373×299** at 526,258
   - size: 373×299
   - fit: fill
4. **Image 373×299** at 923,258
   - size: 373×299
   - fit: fill
5. **Heading “One unified training platform”** at 133,576
   - font: beltram 400, 18px/24px
   - colour: #3d3e43

Motion and interaction:

- reveal: `#vision > div > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#vision > div > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#vision > div > ol > li:nth-of-type(1) > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#vision > div > ol > li:nth-of-type(1) > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#vision > div > ol > li:nth-of-type(2) > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#vision > div > ol > li:nth-of-type(2) > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#vision > div > ol > li:nth-of-type(3) > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#vision > div > ol > li:nth-of-type(3) > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- Recording: [motion/05-building-intelligence-that-never.mp4](motion/05-building-intelligence-that-never.mp4)

Shaders: the page's own code that draws this section's canvas. Rebuild the effect from it (same inputs, same output) rather than imitating the recording:

- [shaders/01-webgpu-wgsl.wgsl](shaders/01-webgpu-wgsl.wgsl): WebGPU WGSL, 73 lines
- [shaders/02-webgpu-wgsl.wgsl](shaders/02-webgpu-wgsl.wgsl): WebGPU WGSL, 253 lines
- [shaders/03-webgpu-wgsl.wgsl](shaders/03-webgpu-wgsl.wgsl): WebGPU WGSL, 46 lines
- [shaders/05-webgpu-wgsl.wgsl](shaders/05-webgpu-wgsl.wgsl): WebGPU WGSL, 79 lines
- [shaders/07-webgpu-wgsl.wgsl](shaders/07-webgpu-wgsl.wgsl): WebGPU WGSL, 38 lines
- [shaders/08-webgpu-wgsl.wgsl](shaders/08-webgpu-wgsl.wgsl): WebGPU WGSL, 53 lines
- [shaders/09-webgpu-wgsl.wgsl](shaders/09-webgpu-wgsl.wgsl): WebGPU WGSL, 51 lines
- [shaders/10-webgpu-wgsl.wgsl](shaders/10-webgpu-wgsl.wgsl): WebGPU WGSL, 126 lines
- [shaders/11-webgpu-wgsl.wgsl](shaders/11-webgpu-wgsl.wgsl): WebGPU WGSL, 223 lines

### 6. Already learning from real use

1425×1030 at desktop. Background `#ffffff`.

![Already learning from real use](screenshots/06-already-learning-from-real-use.png)

Responsive: [tablet](screenshots/06-already-learning-from-real-use-tablet.png) · [mobile](screenshots/06-already-learning-from-real-use-mobile.png)

Numbered highlights: ![Already learning from real use, highlighted](highlights/06-already-learning-from-real-use.png)

1. **Heading “Already learning from real use”** at 129,75
   - font: beltram 400, 36px/40px, letter-spacing -0.9px
   - colour: #3d3e43
2. **Image 681×406** at 615,168
   - size: 681×406
   - fit: cover
3. **Heading ““”** at 167,266
   - font: beltram 400, 24px/30px, letter-spacing -0.24px
   - colour: #3d3e43
4. **Body text “Here's Trajectory and Harvey using Nemo…”** at 177,266
   - font: beltram 400, 24px/30px, letter-spacing -0.24px
   - colour: #3d3e43
5. **Button “Watch now”** at 177,486
   - size: 108×40
   - background: #14151b
   - radius: 16777200px
   - layout: row, gap 4px, padding 0px 12px 0px 12px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #ffffff, align center
6. **Button “View on X”** at 297,486
   - size: 103×40
   - radius: 16777200px
   - border: 1px #3e3e4340
   - layout: row, gap 4px, padding 0px 12px 0px 12px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #3d3e43
7. **Card (×6, same size) ““”** at 526,622
   - size: 373×274
   - background: #ffffff
   - radius: 24px
   - border: 1px #40424e26
   - layout: column, gap 0px, padding 0px 0px 0px 0px, align normal, justify normal
   - font: beltram 400, 17px/26px
   - colour: #3d3e43

Motion and interaction:

- reveal: `#testimonials > div > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#testimonials > div > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#testimonials > div > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#testimonials > div > div:nth-of-type(2)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#testimonials > div > div:nth-of-type(3)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#testimonials > div > div:nth-of-type(3)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#content > div > div`: opacity 0 → 1, plays once as it scrolls into view
- hover: `Watch now`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- focus: `Watch now`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- hover: `View on X`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- focus: `View on X`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- focus: `Customer testimonials`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.4) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- Recording: [motion/06-already-learning-from-real-use.mp4](motion/06-already-learning-from-real-use.mp4)

### 7. Your data, trained and deployed on your…

1425×592 at desktop. Background `#ffffff`.

![Your data, trained and deployed on your…](screenshots/07-your-data-trained-and-deployed-o.png)

Responsive: [tablet](screenshots/07-your-data-trained-and-deployed-o-tablet.png) · [mobile](screenshots/07-your-data-trained-and-deployed-o-mobile.png)

Numbered highlights: ![Your data, trained and deployed on your…, highlighted](highlights/07-your-data-trained-and-deployed-o.png)

1. **Image 1360×520** at -7,-8
   - size: 1360×520
   - fit: fill
2. **Heading “Your data, trained and deployed on your terms”** at 101,75
   - font: beltram 400, 36px/40px, letter-spacing -0.9px
   - colour: #ffffffc7
3. **Button “SOC 2 Certified”** at 1186,86
   - size: 138×28
   - background: #dce0fb
   - radius: 16777200px
   - layout: row, gap 4px, padding 0px 12px 0px 12px, align center, justify normal
   - font: beltram 400, 14px/21px
   - colour: #3d3e43, capitalize
4. **Card (×3, same size) “Decide which data trains”** at 803,152
   - size: 549×120
   - background: #28292e
   - layout: row, gap 0px, padding 20px 24px 20px 24px, align normal, justify normal
   - font: beltram 400, 18px/24px
   - colour: #ffffff
5. **Body text “Our high data governance standards mean…”** at 863,205
   - font: beltram 400, 16px/24px
   - colour: #ffffffc7

Motion and interaction:

- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(2) > div > div`: transform matrix(1, 0, 0, 1, -370, 370) → matrix(1, 0, 0, 1, -370, 370), plays once as it scrolls into view
- scroll: `#security > div > div:nth-of-type(2) > div:nth-of-type(2) > div`: transform none → matrix(1, 0, 0, 1, 0, 36), follows the scroll position
- reveal: `#security > div > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#security > div > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#security > div > div:nth-of-type(1) > div > h2`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > span`: background-color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > span`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > div > h3`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > div > p`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > span`: background-color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > span`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > div > h3`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > div > p`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > span`: background-color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > span`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > div > h3`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > div > p`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1)`: background-color rgb(255, 255, 255) → rgb(40, 41, 46), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)`: background-color rgb(255, 255, 255) → rgb(40, 41, 46), plays once as it scrolls into view
- reveal: `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3)`: background-color rgb(255, 255, 255) → rgb(40, 41, 46), plays once as it scrolls into view
- Recording: [motion/07-your-data-trained-and-deployed-o.mp4](motion/07-your-data-trained-and-deployed-o.mp4)

Shaders: the page's own code that draws this section's canvas. Rebuild the effect from it (same inputs, same output) rather than imitating the recording:

- [shaders/22-webgpu-wgsl.wgsl](shaders/22-webgpu-wgsl.wgsl): WebGPU WGSL, 168 lines
- [shaders/23-webgpu-wgsl.wgsl](shaders/23-webgpu-wgsl.wgsl): WebGPU WGSL, 139 lines

### 8. Built by lifelong learners

1425×986 at desktop. Background `#ffffff`.

![Built by lifelong learners](screenshots/08-built-by-lifelong-learners.png)

Responsive: [tablet](screenshots/08-built-by-lifelong-learners-tablet.png) · [mobile](screenshots/08-built-by-lifelong-learners-mobile.png)

Numbered highlights: ![Built by lifelong learners, highlighted](highlights/08-built-by-lifelong-learners.png)

1. **Heading “Built by lifelong learners”** at 535,109
   - font: beltram 400, 36px/40px, letter-spacing -0.9px
   - colour: #ffffffc7, align center
2. **Body text “We're researchers who brought continual…”** at 406,179
   - font: beltram 400, 17px/26px
   - colour: #ffffff, align center
3. **Image 1265×416** at 80,490
   - size: 1265×416
   - fit: fill
4. **Button “$60M Series A + Seed”** at 356,546
   - size: 157×28
   - radius: 16777200px
   - border: 1px #ffffff4d
   - font: beltram 400, 13px/18px
   - colour: #ffffff, align center, capitalize
5. **Heading “Backed by the people pushing frontier intellige…”** at 206,593
   - font: beltram 400, 36px/40px, letter-spacing -0.9px
   - colour: #000000, align center

Motion and interaction:

- reveal: `#team > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#team > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(1) > p`: color rgb(108, 110, 124) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(1) > h2`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(2)`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(2) > p`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > p`: color rgb(108, 110, 124) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img`: filter none → invert(1), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img`: filter none → invert(1), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img`: filter none → invert(1), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img`: filter none → invert(1), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img`: filter none → invert(1), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img`: filter none → invert(1), plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- reveal: `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- pointer: `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 1179×364 at 162,536 of the viewport; the trail stays after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).
- Recording: [motion/08-built-by-lifelong-learners.mp4](motion/08-built-by-lifelong-learners.mp4)
- Pointer stroke, frame by frame (cursor drawn in):

  ![Pointer stroke, frame by frame (cursor drawn in)](motion/08-built-by-lifelong-learners-pointer-strip.png)
- Pointer stroke clip: [motion/08-built-by-lifelong-learners-pointer.mp4](motion/08-built-by-lifelong-learners-pointer.mp4)

Shaders: the page's own code that draws this section's canvas. Rebuild the effect from it (same inputs, same output) rather than imitating the recording:

- [shaders/24-webgpu-wgsl.wgsl](shaders/24-webgpu-wgsl.wgsl): WebGPU WGSL, 142 lines

### 9. Research, writing and thinking from the…

1425×950 at desktop. Background `#ffffff`.

![Research, writing and thinking from the…](screenshots/09-research-writing-and-thinking-fr.png)

Responsive: [tablet](screenshots/09-research-writing-and-thinking-fr-tablet.png) · [mobile](screenshots/09-research-writing-and-thinking-fr-mobile.png)

Numbered highlights: ![Research, writing and thinking from the…, highlighted](highlights/09-research-writing-and-thinking-fr.png)

1. **Heading “Research, writing and thinking from the team”** at 97,75
   - font: beltram 400, 36px/40px, letter-spacing -0.9px
   - colour: #ffffff
2. **Button “View all”** at 1234,120
   - size: 94×40
   - radius: 16777200px
   - border: 1px #ffffff4d
   - layout: row, gap 8px, padding 0px 12px 0px 12px, align center, justify center
   - font: beltram 500, 13px/18px
   - colour: #ffffff
3. **Image 451×470** at 70,208
   - size: 451×470
   - fit: cover
4. **Heading “Continual Grading”** at 101,698
   - font: beltram 400, 18px/24px
   - colour: #ffffff
5. **Body text “Own Your Value Function: Introducing th…”** at 501,698
   - font: beltram 400, 18px/24px
   - colour: #ffffff

Motion and interaction:

- hover: `View all`: scale none → 1.05; translate none → 2px (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1), translate 150ms cubic-bezier(0.4, 0, 0.2, 1))
- focus: `View all`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- hover: `Previous field notes`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- focus: `Previous field notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- hover: `Next field notes`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- focus: `Next field notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- focus: `All field notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.999994 0.0000455678 0.0000200868 / 0.4) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- Recording: [motion/09-research-writing-and-thinking-fr.mp4](motion/09-research-writing-and-thinking-fr.mp4)

### 10. Footer

1425×930 at desktop. Background `#ffffff`.

![Footer](screenshots/10-footer.png)

Responsive: [tablet](screenshots/10-footer-tablet.png) · [mobile](screenshots/10-footer-mobile.png)

Numbered highlights: ![Footer, highlighted](highlights/10-footer.png)

1. **Heading “Navigation”** at 129,46
   - font: beltram 400, 15px/22px
   - colour: #ffffffc7
2. **Image 1425×518** at 0,381
   - size: 1425×518
   - fit: fill
3. **Heading “Trajectory”** at 712,500
   - font: beltram 400, 16px/24px
   - colour: #14151b

Motion and interaction:

- pointer: `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 1377×900 at 0,0 of the viewport; the trail stays after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).
- focus: `Field Notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- Recording: [motion/10-footer.mp4](motion/10-footer.mp4)
- Pointer stroke, frame by frame (cursor drawn in):

  ![Pointer stroke, frame by frame (cursor drawn in)](motion/10-footer-pointer-strip.png)
- Pointer stroke clip: [motion/10-footer-pointer.mp4](motion/10-footer-pointer.mp4)

Shaders: the page's own code that draws this section's canvas. Rebuild the effect from it (same inputs, same output) rather than imitating the recording:

- [shaders/25-webgpu-wgsl.wgsl](shaders/25-webgpu-wgsl.wgsl): WebGPU WGSL, 115 lines
- [shaders/26-webgpu-wgsl.wgsl](shaders/26-webgpu-wgsl.wgsl): WebGPU WGSL, 180 lines
- [shaders/27-webgpu-wgsl.wgsl](shaders/27-webgpu-wgsl.wgsl): WebGPU WGSL, 87 lines

## Stack

- React (framework, high confidence)
- Next.js 16.2.10 (framework, high confidence)
- Tailwind CSS (css, medium confidence)
- Lenis (animation, high confidence)

## Motion

### Header

- **reveal** `body > div:nth-of-type(2) > header > div`: background-color rgba(0, 0, 0, 0) → rgb(255, 255, 255), plays once as it scrolls into view
- **hover** `Log in`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- **focus** `Log in`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **hover** `Book a demo`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- **focus** `Book a demo`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **hover** `Platform`: opacity 1 → 0.7 (opacity 200ms cubic-bezier(0.333, 0.667, 0.667, 1))
- **focus** `Platform`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **hover** `Docs`: opacity 1 → 0.7; translate none → 150% -150%; translate -150% 150% → 0px (opacity 200ms cubic-bezier(0.333, 0.667, 0.667, 1), translate 200ms cubic-bezier(0.333, 0.667, 0.667, 1))
- **focus** `Docs`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **hover** `Field Notes`: background-color rgba(0, 0, 0, 0) → oklab(0.97427 0.00153187 -0.00506717 / 0.5) (background-color 151ms cubic-bezier(0.405, 0.007, 0.188, 0.984))
- **focus** `Field Notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)

### Own your own value function

- **scroll** `#hero > div:nth-of-type(2)`: transform none → matrix(1, 0, 0, 1, 0, -140), follows the scroll position
- **scroll** `#hero > div:nth-of-type(2)`: opacity 1 → 0, follows the scroll position
- **scroll** `#hero > div:nth-of-type(3)`: opacity 0 → 0.35, follows the scroll position
- **scroll** `body > div:nth-of-type(2) > nav > ul:nth-of-type(2)`: top 65px → 65px, follows the scroll position
- **reveal** `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(1) > a`: color color(srgb 0.241176 0.244706 0.262353) → rgb(108, 110, 124), plays once as it scrolls into view
- **reveal** `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(2) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- **reveal** `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(3) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- **reveal** `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(4) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- **reveal** `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(5) > a`: color rgb(108, 110, 124) → rgb(108, 110, 124), plays once as it scrolls into view
- **reveal** `body > div:nth-of-type(2) > nav > ul:nth-of-type(2) > li:nth-of-type(6) > a`: color rgb(108, 110, 124) → color(srgb 0.241176 0.244706 0.262353), plays once as it scrolls into view
- **pointer** `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 810×900 at 351,0 of the viewport; the trail fades about 902ms after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).
- **focus** `Sign up`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **focus** `See how it works`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **focus** `Platform`: box-shadow rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, color(srgb 0.0784314 0.0823529 0.105882 / 0.05) 0px 0px 0px 1px, color(srgb 0.0784314 0.0823529 0.105882 / 0.06) 0px 1px 2px 0px, color(srgb 0.0784314 0.0823529 0.105882 / 0.16) 0px 12px 32px -8px → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, color(srgb 0.0784314 0.0823529 0.105882 / 0.05) 0px 0px 0px 1px, color(srgb 0.0784314 0.0823529 0.105882 / 0.06) 0px 1px 2px 0px, color(srgb 0.0784314 0.0823529 0.105882 / 0.16) 0px 12px 32px -8px; opacity 0 → 0.935695; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px (instant)
- **focus** `Vision`: border-bottom-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622); border-left-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622); border-right-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622); border-top-color rgb(108, 110, 124) → oklab(0.384962 0.00123146 -0.00918622) (instant)
- **focus** `Customers`: border-bottom-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342); border-left-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342); border-right-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342); border-top-color rgb(108, 110, 124) → oklab(0.395168 0.00138035 -0.00999342) (instant)

### Section

- **loop** `#content > div > section:nth-of-type(1) > div > div > div`: animation “marquee” of transform, 44000ms, linear, loops forever
- **animation** `#content > div > section:nth-of-type(1) > div > div > div`: transform matrix(1, 0, 0, 1, -149.125, 0) → matrix(1, 0, 0, 1, -224.978, 0), changes over time
- **focus** `Mercor (opens in a new tab)`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **focus** `Harvey (opens in a new tab)`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)

### The easiest way to train your models

- **loop** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(2) > span`: animation “pulse” of opacity, 2000ms, linear, loops forever
- **scroll** `#_r_7_ > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 5.13281) → none, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 6.87) → none, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(3)`: transform matrix3d(0.88, 0, 0, 0, 0, 0.790939, 0.438371, -0.00024354, 0, -0.385767, 0.898794, -0.00049933, 0, 67.1594, 0, 1) → matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.000555556, 0, 0, 0, 1), follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)`: transform matrix(1.08, 0, 0, 1.08, 0, 54.3994) → matrix(0.96, 0, 0, 0.96, 0, 24.1775), follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)`: opacity 0.22 → 0.42, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, -482.108) → none, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2)`: opacity 0.55 → 0, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(4)`: transform matrix(1, 0, 0, 1, 0, 54.2506) → none, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(5)`: transform matrix(1, 0, 0, 1, 0, 90.9125) → none, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(6)`: transform matrix(1, 0, 0, 1, 0, 39.4552) → none, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(7)`: transform matrix3d(0.88, 0, 0, 0, 0, 0.790939, 0.438371, -0.00024354, 0, -0.385767, 0.898794, -0.00049933, 0, 68.0875, 80, 0.955556) → matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.000555556, 0, 0, 80, 0.955556), follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, -121.118) → none, follows the scroll position
- **scroll** `#_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2)`: opacity 0.55 → 0, follows the scroll position
- **reveal** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(2) > span:nth-of-type(1)`: transform none → none, plays once as it scrolls into view
- **reveal** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(1)`: transform none → none, plays once as it scrolls into view
- **reveal** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(2)`: transform none → none, plays once as it scrolls into view
- **reveal** `#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(2) > span:nth-of-type(3)`: transform none → none, plays once as it scrolls into view
- **reveal** `#platform > div > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#platform > div > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#platform > div > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#platform > div > div:nth-of-type(2)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#platform > div > div:nth-of-type(3)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#platform > div > div:nth-of-type(3)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **pointer** `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 1269×836 at 0,0 of the viewport; the trail stays after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).
- **hover** `Watch it in action`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- **focus** `Watch it in action`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)

### Building intelligence that never stops …

- **reveal** `#vision > div > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#vision > div > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#vision > div > ol > li:nth-of-type(1) > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#vision > div > ol > li:nth-of-type(1) > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#vision > div > ol > li:nth-of-type(2) > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#vision > div > ol > li:nth-of-type(2) > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#vision > div > ol > li:nth-of-type(3) > div`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#vision > div > ol > li:nth-of-type(3) > div`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)

### Already learning from real use

- **reveal** `#testimonials > div > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#testimonials > div > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#testimonials > div > div:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#testimonials > div > div:nth-of-type(2)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#testimonials > div > div:nth-of-type(3)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#testimonials > div > div:nth-of-type(3)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#content > div > div`: opacity 0 → 1, plays once as it scrolls into view
- **hover** `Watch now`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- **focus** `Watch now`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- **hover** `View on X`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- **focus** `View on X`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color color(srgb 0.241176 0.244706 0.262353) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **focus** `Customer testimonials`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.4) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-width 3px → 1px (instant)

### Your data, trained and deployed on your…

- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(2) > div > div`: transform matrix(1, 0, 0, 1, -370, 370) → matrix(1, 0, 0, 1, -370, 370), plays once as it scrolls into view
- **scroll** `#security > div > div:nth-of-type(2) > div:nth-of-type(2) > div`: transform none → matrix(1, 0, 0, 1, 0, 36), follows the scroll position
- **reveal** `#security > div > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#security > div > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#security > div > div:nth-of-type(1) > div > h2`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > span`: background-color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > span`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > div > h3`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div > div > p`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > span`: background-color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > span`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > div > h3`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > div > div > p`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > span`: background-color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > span`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > div > h3`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > div > p`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1)`: background-color rgb(255, 255, 255) → rgb(40, 41, 46), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)`: background-color rgb(255, 255, 255) → rgb(40, 41, 46), plays once as it scrolls into view
- **reveal** `#security > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3)`: background-color rgb(255, 255, 255) → rgb(40, 41, 46), plays once as it scrolls into view

### Built by lifelong learners

- **reveal** `#team > div:nth-of-type(1)`: transform matrix(1, 0, 0, 1, 0, 24) → none, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#team > div:nth-of-type(1)`: opacity 0 → 1, plays once as it scrolls into view (IntersectionObserver)
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(1) > p`: color rgb(108, 110, 124) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(1) > h2`: color color(srgb 0.241176 0.244706 0.262353) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(2)`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(2) > p`: color color(srgb 0.241176 0.244706 0.262353) → rgb(255, 255, 255), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > p`: color rgb(108, 110, 124) → color(srgb 1 1 1 / 0.78), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img`: filter none → invert(1), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img`: filter none → invert(1), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img`: filter none → invert(1), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img`: filter none → invert(1), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img`: filter none → invert(1), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img`: filter none → invert(1), plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- **reveal** `#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img`: opacity 0.6 → 0.7, plays once as it scrolls into view
- **pointer** `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 1179×364 at 162,536 of the viewport; the trail stays after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).

### Research, writing and thinking from the…

- **hover** `View all`: scale none → 1.05; translate none → 2px (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1), translate 150ms cubic-bezier(0.4, 0, 0.2, 1))
- **focus** `View all`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)
- **hover** `Previous field notes`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- **focus** `Previous field notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- **hover** `Next field notes`: scale none → 1.05 (scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1))
- **focus** `Next field notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-width 3px → 1px (instant)
- **focus** `All field notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.999994 0.0000455678 0.0000200868 / 0.4) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(20, 21, 27) → rgb(0, 95, 204); outline-width 3px → 1px (instant)

### Footer

- **pointer** `canvas`: moving the pointer paints into a <canvas> (WebGL or 2D), over 1377×900 at 0,0 of the viewport; the trail stays after the pointer stops. It listens to pointermove on the whole window, not on an element; see the filmstrip and clip (cursor drawn in).
- **focus** `Field Notes`: box-shadow none → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.36619 0.000957593 -0.00770146 / 0.5) 0px 0px 0px 2px, rgba(0, 0, 0, 0) 0px 0px 0px 0px; outline-color rgb(255, 255, 255) → rgb(0, 95, 204); outline-offset 0px → 1px; outline-width 3px → 1px (instant)

## Effect code

`01-header.css`

```css
/* Generated by Specimen. */

/* Log in: hover, with the page's computed values and transition */
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(1) {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(1):hover {
  scale: 1.05;
}

/* Book a demo: hover, with the page's computed values and transition */
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(2) {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(2):hover {
  scale: 1.05;
}

/* Platform: hover, with the page's computed values and transition */
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(1) > a {
  transition: opacity 200ms cubic-bezier(0.333, 0.667, 0.667, 1);
}
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(1) > a:hover {
  opacity: 0.7;
}

/* Docs: hover, with the page's computed values and transition */
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(3) > a {
  transition: opacity 200ms cubic-bezier(0.333, 0.667, 0.667, 1), translate 200ms cubic-bezier(0.333, 0.667, 0.667, 1), translate 200ms cubic-bezier(0.333, 0.667, 0.667, 1);
}
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(3) > a:hover {
  opacity: 0.7;
}
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(3) > a:hover > :nth-child(1) > :nth-child(1) {
  translate: 150% -150%;
}
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(3) > a:hover > :nth-child(1) > :nth-child(2) {
  translate: 0px;
}

/* Field Notes: hover, with the page's computed values and transition */
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(2) > a {
  transition: background-color 151ms cubic-bezier(0.405, 0.007, 0.188, 0.984);
}
body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(2) > a:hover {
  background-color: oklab(0.97427 0.00153187 -0.00506717 / 0.5);
}
```

`01-header.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// Log in hover
CustomEase.create("fx-01-header-1-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(1)").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-01-header-1-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-01-header-1-0_34-1_56-0_64-1" }));
});

// Book a demo hover
CustomEase.create("fx-01-header-2-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(2)").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-01-header-2-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-01-header-2-0_34-1_56-0_64-1" }));
});

// Platform hover
CustomEase.create("fx-01-header-3-0_333-0_667-0_667-1", "M0,0 C0.333,0.667 0.667,1 1,1");
document.querySelectorAll("body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(1) > a").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"opacity":0.7}, duration: 0.2, ease: "fx-01-header-3-0_333-0_667-0_667-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"opacity":1}, duration: 0.2, ease: "fx-01-header-3-0_333-0_667-0_667-1" }));
});

// Docs hover
CustomEase.create("fx-01-header-4-0_333-0_667-0_667-1", "M0,0 C0.333,0.667 0.667,1 1,1");
document.querySelectorAll("body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(3) > a").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"opacity":0.7}, duration: 0.2, ease: "fx-01-header-4-0_333-0_667-0_667-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"opacity":1}, duration: 0.2, ease: "fx-01-header-4-0_333-0_667-0_667-1" }));
});

// Field Notes hover
document.querySelectorAll("body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(2) > a").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"backgroundColor":"rgba(246, 246, 250, 0.5)"}, duration: 0.151, delay: 0, ease: CustomEase.create("Field-Notes-hover", "M0,0 C0.405,0.007 0.188,0.984 1,1") }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"backgroundColor":"rgba(246, 246, 250, 0)"}, duration: 0.151, delay: 0, ease: CustomEase.create("Field-Notes-hover", "M0,0 C0.405,0.007 0.188,0.984 1,1") }));
});
```

`01-header.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// Log in hover — body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(1)
export function LogInHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}

// Book a demo hover — body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > div:nth-of-type(2) > div > a:nth-of-type(2)
export function BookADemoHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}

// Platform hover — body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(1) > a
export function PlatformHover(props) {
  return <motion.div {...props} initial={{"opacity":1}} whileHover={{"opacity":0.7}} transition={{"duration":0.2,"delay":0,"ease":[0.333,0.667,0.667,1]}} />;
}

// Docs hover — body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(3) > a
export function DocsHover(props) {
  return <motion.div {...props} initial={{"opacity":1}} whileHover={{"opacity":0.7}} transition={{"duration":0.2,"delay":0,"ease":[0.333,0.667,0.667,1]}} />;
}

// Field Notes hover — body > div:nth-of-type(2) > header > div > div:nth-of-type(1) > nav > ul > li:nth-of-type(2) > a
export function FieldNotesHover(props) {
  return <motion.div {...props} initial={{"backgroundColor":"rgba(246, 246, 250, 0)"}} whileHover={{"backgroundColor":"rgba(246, 246, 250, 0.5)"}} transition={{"duration":0.151,"delay":0,"ease":[0.405,0.007,0.188,0.984]}} />;
}
```

`02-own-your-own-value-function.css`

```css
/* Generated by Specimen. */

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-02-own-your-own-value-function-1-transform {
  from { transform: none; animation-timing-function: linear; }
  to { transform: translate(0px, -140px); }
}
@keyframes fx-02-own-your-own-value-function-1-opacity {
  from { opacity: 1; animation-timing-function: linear; }
  to { opacity: 0; }
}
#hero > div:nth-of-type(2) {
  animation: fx-02-own-your-own-value-function-1-transform linear both, fx-02-own-your-own-value-function-1-opacity linear both;
  animation-timeline: scroll(root), scroll(root);
  animation-range: 0px 900px, 0px 315px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-02-own-your-own-value-function-2-opacity {
  from { opacity: 0; animation-timing-function: linear; }
  to { opacity: 0.35; }
}
#hero > div:nth-of-type(3) {
  animation: fx-02-own-your-own-value-function-2-opacity linear both;
  animation-timeline: scroll(root);
  animation-range: 0px 900px;
}
```

`02-own-your-own-value-function.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// Scroll-linked motion (match 100%)
gsap.fromTo("#hero > div:nth-of-type(2)", { y: 0 }, { y: -140, ease: "none", scrollTrigger: { start: 0, end: 900, scrub: true } });
gsap.fromTo("#hero > div:nth-of-type(2)", { opacity: 1 }, { opacity: 0, ease: "none", scrollTrigger: { start: 0, end: 315, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#hero > div:nth-of-type(3)", { opacity: 0 }, { opacity: 0.35, ease: "none", scrollTrigger: { start: 0, end: 900, scrub: true } });
```

`02-own-your-own-value-function.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// Scroll-linked motion — #hero > div:nth-of-type(2)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, -140]);
  const opacity = useTransform(scrollY, [0, 315], [1, 0]);
  return <motion.div {...props} style={{ ...props.style, y, opacity }} />;
}

// Scroll-linked motion — #hero > div:nth-of-type(3)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 900], [0, 0.35]);
  return <motion.div {...props} style={{ ...props.style, opacity }} />;
}
```

`03-section.css`

```css
/* Generated by Specimen. */

/* marquee: the page's own keyframes and timing */
@keyframes fx-03-section-1 {
  0% { transform: translate(0px); }
  100% { transform: translateX(-50%); }
}
#content > div > section:nth-of-type(1) > div > div > div {
  animation: fx-03-section-1 44000ms linear 0ms infinite normal none;
}
```

`03-section.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// marquee
gsap.set("#content > div > section:nth-of-type(1) > div > div > div", {"x":0});
gsap.timeline({ delay: 0, repeat: -1 })
  .to("#content > div > section:nth-of-type(1) > div > div > div", {"x":-50,"duration":44, "ease": "none" });
```

`03-section.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// marquee — #content > div > section:nth-of-type(1) > div > div > div
export function Marquee(props) {
  return <motion.div {...props} animate={{"x":[0,-50]}} transition={{"duration":44,"delay":0,"times":[0,1],"ease":[[0,0,1,1]],"repeat":Infinity}} />;
}
```

`04-the-easiest-way-to-train-your-mo.css`

```css
/* Generated by Specimen. */

/* pulse: the page's own keyframes and timing */
@keyframes fx-04-the-easiest-way-to-train-your-mo-1 {
  0% { opacity: 1; animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  50% { opacity: 0.5; animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  100% { opacity: 1; animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
}
#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(2) > span {
  animation: fx-04-the-easiest-way-to-train-your-mo-1 2000ms linear 0ms infinite normal none;
}

/* Watch it in action: hover, with the page's computed values and transition */
#platform > div > div:nth-of-type(1) > div:nth-of-type(2) > a {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
#platform > div > div:nth-of-type(1) > div:nth-of-type(2) > a:hover {
  scale: 1.05;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-3-transform {
  from { transform: translate(0px, 5.13px); animation-timing-function: linear; }
  to { transform: none; }
}
#_r_7_ > div:nth-of-type(1) {
  animation: fx-04-the-easiest-way-to-train-your-mo-3-transform linear both;
  animation-timeline: scroll(root);
  animation-range: 427px 1151px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-4-transform {
  from { transform: translate(0px, 6.87px); animation-timing-function: linear; }
  to { transform: none; }
}
#_r_7_ > div:nth-of-type(2) {
  animation: fx-04-the-easiest-way-to-train-your-mo-4-transform linear both;
  animation-timeline: scroll(root);
  animation-range: 427px 1151px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-5-translate {
  from { translate: 0px 67.16px; animation-timing-function: linear; }
  to { translate: 0px 0px; }
}
@keyframes fx-04-the-easiest-way-to-train-your-mo-5-scale {
  from { scale: 0.88; animation-timing-function: linear; }
  to { scale: 1; }
}
#_r_7_ > div:nth-of-type(3) {
  animation: fx-04-the-easiest-way-to-train-your-mo-5-translate linear both, fx-04-the-easiest-way-to-train-your-mo-5-scale linear both;
  animation-timeline: scroll(root), scroll(root);
  animation-range: 427px 1151px, 429px 1152px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-6-translate {
  from { translate: 0px 54.4px; animation-timing-function: linear; }
  to { translate: 0px 24.18px; }
}
@keyframes fx-04-the-easiest-way-to-train-your-mo-6-scale {
  from { scale: 1.08; animation-timing-function: linear; }
  to { scale: 0.96; }
}
@keyframes fx-04-the-easiest-way-to-train-your-mo-6-opacity {
  from { opacity: 0.22; animation-timing-function: linear; }
  to { opacity: 0.42; }
}
#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1) {
  animation: fx-04-the-easiest-way-to-train-your-mo-6-translate linear both, fx-04-the-easiest-way-to-train-your-mo-6-scale linear both, fx-04-the-easiest-way-to-train-your-mo-6-opacity linear both;
  animation-timeline: scroll(root), scroll(root), scroll(root);
  animation-range: 427px 1151px, 429px 1152px, 427px 1151px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-7-transform {
  from { transform: translate(0px, -482.11px); animation-timing-function: linear; }
  to { transform: none; }
}
@keyframes fx-04-the-easiest-way-to-train-your-mo-7-opacity {
  from { opacity: 0.55; animation-timing-function: linear; }
  to { opacity: 0; }
}
#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2) {
  animation: fx-04-the-easiest-way-to-train-your-mo-7-transform linear both, fx-04-the-easiest-way-to-train-your-mo-7-opacity linear both;
  animation-timeline: scroll(root), scroll(root);
  animation-range: 427px 1151px, 427px 1151px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-8-transform {
  from { transform: translate(0px, 54.25px); animation-timing-function: linear; }
  to { transform: none; }
}
#_r_7_ > div:nth-of-type(4) {
  animation: fx-04-the-easiest-way-to-train-your-mo-8-transform linear both;
  animation-timeline: scroll(root);
  animation-range: 427px 1151px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-9-transform {
  from { transform: translate(0px, 90.91px); animation-timing-function: linear; }
  to { transform: none; }
}
#_r_7_ > div:nth-of-type(5) {
  animation: fx-04-the-easiest-way-to-train-your-mo-9-transform linear both;
  animation-timeline: scroll(root);
  animation-range: 427px 1151px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-10-transform {
  from { transform: translate(0px, 39.46px); animation-timing-function: linear; }
  to { transform: none; }
}
#_r_7_ > div:nth-of-type(6) {
  animation: fx-04-the-easiest-way-to-train-your-mo-10-transform linear both;
  animation-timeline: scroll(root);
  animation-range: 427px 1151px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-11-translate {
  from { translate: 0px 68.09px; animation-timing-function: linear; }
  to { translate: 0px 0px; }
}
@keyframes fx-04-the-easiest-way-to-train-your-mo-11-scale {
  from { scale: 0.88; animation-timing-function: linear; }
  to { scale: 1; }
}
#_r_7_ > div:nth-of-type(7) {
  animation: fx-04-the-easiest-way-to-train-your-mo-11-translate linear both, fx-04-the-easiest-way-to-train-your-mo-11-scale linear both;
  animation-timeline: scroll(root), scroll(root);
  animation-range: 427px 1151px, 429px 1152px;
}

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-04-the-easiest-way-to-train-your-mo-12-transform {
  from { transform: translate(0px, -121.12px); animation-timing-function: linear; }
  to { transform: none; }
}
@keyframes fx-04-the-easiest-way-to-train-your-mo-12-opacity {
  from { opacity: 0.55; animation-timing-function: linear; }
  to { opacity: 0; }
}
#_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2) {
  animation: fx-04-the-easiest-way-to-train-your-mo-12-transform linear both, fx-04-the-easiest-way-to-train-your-mo-12-opacity linear both;
  animation-timeline: scroll(root), scroll(root);
  animation-range: 427px 1151px, 427px 1151px;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#platform > div > div:nth-of-type(1) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 608ms cubic-bezier(0.177, 0.911, 0.213, 1.015), transform 608ms cubic-bezier(0.177, 0.911, 0.213, 1.015);
}
#platform > div > div:nth-of-type(1).is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#platform > div > div:nth-of-type(2) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 621ms cubic-bezier(0.183, 0.875, 0.173, 1.022), transform 621ms cubic-bezier(0.183, 0.875, 0.173, 1.022);
}
#platform > div > div:nth-of-type(2).is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#platform > div > div:nth-of-type(3) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 609ms cubic-bezier(0.18, 0.819, 0.153, 1.03), transform 609ms cubic-bezier(0.18, 0.819, 0.153, 1.03);
}
#platform > div > div:nth-of-type(3).is-visible {
  opacity: 1;
  transform: none;
}
```

`04-the-easiest-way-to-train-your-mo.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// pulse
CustomEase.create("fx-04-the-easiest-way-to-train-your-mo-1-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
CustomEase.create("fx-04-the-easiest-way-to-train-your-mo-1-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
gsap.set("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(2) > span", {"opacity":1});
gsap.timeline({ delay: 0, repeat: -1 })
  .to("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(2) > span", {"opacity":0.5,"duration":1, "ease": "fx-04-the-easiest-way-to-train-your-mo-1-0_4-0-0_6-1" })
  .to("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(2) > span", {"opacity":1,"duration":1, "ease": "fx-04-the-easiest-way-to-train-your-mo-1-0_4-0-0_6-1" });

// Watch it in action hover
CustomEase.create("fx-04-the-easiest-way-to-train-your-mo-2-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("#platform > div > div:nth-of-type(1) > div:nth-of-type(2) > a").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-04-the-easiest-way-to-train-your-mo-2-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-04-the-easiest-way-to-train-your-mo-2-0_34-1_56-0_64-1" }));
});

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(1)", { y: 5.133 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(2)", { y: 6.87 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(3)", { y: 67.159 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });
gsap.fromTo("#_r_7_ > div:nth-of-type(3)", { scale: 0.88 }, { scale: 1, ease: "none", scrollTrigger: { start: 429, end: 1152, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)", { y: 54.399 }, { y: 24.178, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });
gsap.fromTo("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)", { scale: 1.08 }, { scale: 0.96, ease: "none", scrollTrigger: { start: 429, end: 1152, scrub: true } });
gsap.fromTo("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)", { opacity: 0.22 }, { opacity: 0.42, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2)", { y: -482.108 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });
gsap.fromTo("#_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2)", { opacity: 0.55 }, { opacity: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(4)", { y: 54.251 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(5)", { y: 90.913 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(6)", { y: 39.455 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(7)", { y: 68.088 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });
gsap.fromTo("#_r_7_ > div:nth-of-type(7)", { scale: 0.88 }, { scale: 1, ease: "none", scrollTrigger: { start: 429, end: 1152, scrub: true } });

// Scroll-linked motion (match 100%)
gsap.fromTo("#_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2)", { y: -121.118 }, { y: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });
gsap.fromTo("#_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2)", { opacity: 0.55 }, { opacity: 0, ease: "none", scrollTrigger: { start: 427, end: 1151, scrub: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-04-the-easiest-way-to-train-your-mo-13-0_177-0_911-0_213-1_015", "M0,0 C0.177,0.911 0.213,1.015 1,1");
gsap.fromTo("#platform > div > div:nth-of-type(1)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.608, ease: "fx-04-the-easiest-way-to-train-your-mo-13-0_177-0_911-0_213-1_015", scrollTrigger: { trigger: "#platform > div > div:nth-of-type(1)", start: "top 85%", once: true } });

// Scroll reveal (match 99%)
CustomEase.create("fx-04-the-easiest-way-to-train-your-mo-14-0_183-0_875-0_173-1_022", "M0,0 C0.183,0.875 0.173,1.022 1,1");
gsap.fromTo("#platform > div > div:nth-of-type(2)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.621, ease: "fx-04-the-easiest-way-to-train-your-mo-14-0_183-0_875-0_173-1_022", scrollTrigger: { trigger: "#platform > div > div:nth-of-type(2)", start: "top 85%", once: true } });

// Scroll reveal (match 99%)
CustomEase.create("fx-04-the-easiest-way-to-train-your-mo-15-0_18-0_819-0_153-1_03", "M0,0 C0.18,0.819 0.153,1.03 1,1");
gsap.fromTo("#platform > div > div:nth-of-type(3)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.609, ease: "fx-04-the-easiest-way-to-train-your-mo-15-0_18-0_819-0_153-1_03", scrollTrigger: { trigger: "#platform > div > div:nth-of-type(3)", start: "top 85%", once: true } });
```

`04-the-easiest-way-to-train-your-mo.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// pulse — #_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > span:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(2) > span
export function Pulse(props) {
  return <motion.div {...props} animate={{"opacity":[1,0.5,1]}} transition={{"duration":2,"delay":0,"times":[0,0.5,1],"ease":[[0.4,0,0.6,1],[0.4,0,0.6,1]],"repeat":Infinity}} />;
}

// Watch it in action hover — #platform > div > div:nth-of-type(1) > div:nth-of-type(2) > a
export function WatchItInActionHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(1)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [5.133, 0]);
  return <motion.div {...props} style={{ ...props.style, y }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(2)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [6.87, 0]);
  return <motion.div {...props} style={{ ...props.style, y }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(3)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [67.159, 0]);
  const scale = useTransform(scrollY, [429, 1152], [0.88, 1]);
  return <motion.div {...props} style={{ ...props.style, y, scale }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(3) > div:nth-of-type(1)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [54.399, 24.178]);
  const scale = useTransform(scrollY, [429, 1152], [1.08, 0.96]);
  const opacity = useTransform(scrollY, [427, 1151], [0.22, 0.42]);
  return <motion.div {...props} style={{ ...props.style, y, scale, opacity }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [-482.108, 0]);
  const opacity = useTransform(scrollY, [427, 1151], [0.55, 0]);
  return <motion.div {...props} style={{ ...props.style, y, opacity }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(4)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [54.251, 0]);
  return <motion.div {...props} style={{ ...props.style, y }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(5)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [90.913, 0]);
  return <motion.div {...props} style={{ ...props.style, y }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(6)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [39.455, 0]);
  return <motion.div {...props} style={{ ...props.style, y }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(7)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [68.088, 0]);
  const scale = useTransform(scrollY, [429, 1152], [0.88, 1]);
  return <motion.div {...props} style={{ ...props.style, y, scale }} />;
}

// Scroll-linked motion — #_r_7_ > div:nth-of-type(7) > div > div:nth-of-type(2)
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [427, 1151], [-121.118, 0]);
  const opacity = useTransform(scrollY, [427, 1151], [0.55, 0]);
  return <motion.div {...props} style={{ ...props.style, y, opacity }} />;
}

// Scroll reveal — #platform > div > div:nth-of-type(1)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.608,"delay":0,"ease":[0.177,0.911,0.213,1.015]}} />;
}

// Scroll reveal — #platform > div > div:nth-of-type(2)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.621,"delay":0,"ease":[0.183,0.875,0.173,1.022]}} />;
}

// Scroll reveal — #platform > div > div:nth-of-type(3)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.609,"delay":0,"ease":[0.18,0.819,0.153,1.03]}} />;
}
```

`05-building-intelligence-that-never.css`

```css
/* Generated by Specimen. */

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#vision > div > div {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 607ms cubic-bezier(0.182, 0.863, 0.179, 1.022), transform 607ms cubic-bezier(0.182, 0.863, 0.179, 1.022);
}
#vision > div > div.is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#vision > div > ol > li:nth-of-type(1) > div {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 607ms cubic-bezier(0.182, 0.863, 0.179, 1.022), transform 607ms cubic-bezier(0.182, 0.863, 0.179, 1.022);
}
#vision > div > ol > li:nth-of-type(1) > div.is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#vision > div > ol > li:nth-of-type(2) > div {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 608ms cubic-bezier(0.169, 0.923, 0.225, 1.013), transform 608ms cubic-bezier(0.169, 0.923, 0.225, 1.013);
}
#vision > div > ol > li:nth-of-type(2) > div.is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#vision > div > ol > li:nth-of-type(3) > div {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 610ms cubic-bezier(0.185, 0.729, 0.1, 1.042), transform 610ms cubic-bezier(0.185, 0.729, 0.1, 1.042);
}
#vision > div > ol > li:nth-of-type(3) > div.is-visible {
  opacity: 1;
  transform: none;
}
```

`05-building-intelligence-that-never.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// Scroll reveal (match 99%)
CustomEase.create("fx-05-building-intelligence-that-never-1-0_182-0_863-0_179-1_022", "M0,0 C0.182,0.863 0.179,1.022 1,1");
gsap.fromTo("#vision > div > div", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.607, ease: "fx-05-building-intelligence-that-never-1-0_182-0_863-0_179-1_022", scrollTrigger: { trigger: "#vision > div > div", start: "top 85%", once: true } });

// Scroll reveal (match 99%)
CustomEase.create("fx-05-building-intelligence-that-never-2-0_182-0_863-0_179-1_022", "M0,0 C0.182,0.863 0.179,1.022 1,1");
gsap.fromTo("#vision > div > ol > li:nth-of-type(1) > div", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.607, ease: "fx-05-building-intelligence-that-never-2-0_182-0_863-0_179-1_022", scrollTrigger: { trigger: "#vision > div > ol > li:nth-of-type(1) > div", start: "top 85%", once: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-05-building-intelligence-that-never-3-0_169-0_923-0_225-1_013", "M0,0 C0.169,0.923 0.225,1.013 1,1");
gsap.fromTo("#vision > div > ol > li:nth-of-type(2) > div", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.608, ease: "fx-05-building-intelligence-that-never-3-0_169-0_923-0_225-1_013", scrollTrigger: { trigger: "#vision > div > ol > li:nth-of-type(2) > div", start: "top 85%", once: true } });

// Scroll reveal (match 99%)
CustomEase.create("fx-05-building-intelligence-that-never-4-0_185-0_729-0_1-1_042", "M0,0 C0.185,0.729 0.1,1.042 1,1");
gsap.fromTo("#vision > div > ol > li:nth-of-type(3) > div", {"opacity":0,"y":24}, { ...{"opacity":1,"y":0}, duration: 0.61, ease: "fx-05-building-intelligence-that-never-4-0_185-0_729-0_1-1_042", scrollTrigger: { trigger: "#vision > div > ol > li:nth-of-type(3) > div", start: "top 85%", once: true } });
```

`05-building-intelligence-that-never.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// Scroll reveal — #vision > div > div
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.607,"delay":0,"ease":[0.182,0.863,0.179,1.022]}} />;
}

// Scroll reveal — #vision > div > ol > li:nth-of-type(1) > div
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.607,"delay":0,"ease":[0.182,0.863,0.179,1.022]}} />;
}

// Scroll reveal — #vision > div > ol > li:nth-of-type(2) > div
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.608,"delay":0,"ease":[0.169,0.923,0.225,1.013]}} />;
}

// Scroll reveal — #vision > div > ol > li:nth-of-type(3) > div
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0,"y":24}} whileInView={{"opacity":1,"y":0}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.61,"delay":0,"ease":[0.185,0.729,0.1,1.042]}} />;
}
```

`06-already-learning-from-real-use.css`

```css
/* Generated by Specimen. */

/* Watch now: hover, with the page's computed values and transition */
#testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > button {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
#testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > button:hover {
  scale: 1.05;
}

/* View on X: hover, with the page's computed values and transition */
#testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > a {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
#testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > a:hover {
  scale: 1.05;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#testimonials > div > div:nth-of-type(1) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 608ms cubic-bezier(0.178, 0.887, 0.196, 1.019), transform 608ms cubic-bezier(0.178, 0.887, 0.196, 1.019);
}
#testimonials > div > div:nth-of-type(1).is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#testimonials > div > div:nth-of-type(2) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 609ms cubic-bezier(0.178, 0.876, 0.187, 1.021), transform 609ms cubic-bezier(0.178, 0.876, 0.187, 1.021);
}
#testimonials > div > div:nth-of-type(2).is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#testimonials > div > div:nth-of-type(3) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 609ms cubic-bezier(0.176, 0.865, 0.179, 1.022), transform 609ms cubic-bezier(0.176, 0.865, 0.179, 1.022);
}
#testimonials > div > div:nth-of-type(3).is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#content > div > div {
  opacity: 0;
  transition: opacity 904ms cubic-bezier(0.648, 0, 0.348, 1.006);
}
#content > div > div.is-visible {
  opacity: 1;
}
```

`06-already-learning-from-real-use.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// Watch now hover
CustomEase.create("fx-06-already-learning-from-real-use-1-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("#testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > button").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-06-already-learning-from-real-use-1-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-06-already-learning-from-real-use-1-0_34-1_56-0_64-1" }));
});

// View on X hover
CustomEase.create("fx-06-already-learning-from-real-use-2-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("#testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > a").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-06-already-learning-from-real-use-2-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-06-already-learning-from-real-use-2-0_34-1_56-0_64-1" }));
});

// Scroll reveal (match 99%)
CustomEase.create("fx-06-already-learning-from-real-use-3-0_178-0_887-0_196-1_019", "M0,0 C0.178,0.887 0.196,1.019 1,1");
gsap.fromTo("#testimonials > div > div:nth-of-type(1)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.608, ease: "fx-06-already-learning-from-real-use-3-0_178-0_887-0_196-1_019", scrollTrigger: { trigger: "#testimonials > div > div:nth-of-type(1)", start: "top 85%", once: true } });

// Scroll reveal (match 99%)
CustomEase.create("fx-06-already-learning-from-real-use-4-0_178-0_876-0_187-1_021", "M0,0 C0.178,0.876 0.187,1.021 1,1");
gsap.fromTo("#testimonials > div > div:nth-of-type(2)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.609, ease: "fx-06-already-learning-from-real-use-4-0_178-0_876-0_187-1_021", scrollTrigger: { trigger: "#testimonials > div > div:nth-of-type(2)", start: "top 85%", once: true } });

// Scroll reveal (match 99%)
CustomEase.create("fx-06-already-learning-from-real-use-5-0_176-0_865-0_179-1_022", "M0,0 C0.176,0.865 0.179,1.022 1,1");
gsap.fromTo("#testimonials > div > div:nth-of-type(3)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.609, ease: "fx-06-already-learning-from-real-use-5-0_176-0_865-0_179-1_022", scrollTrigger: { trigger: "#testimonials > div > div:nth-of-type(3)", start: "top 85%", once: true } });

// Scroll reveal (match 99%)
CustomEase.create("fx-06-already-learning-from-real-use-6-0_648-0-0_348-1_006", "M0,0 C0.648,0 0.348,1.006 1,1");
gsap.fromTo("#content > div > div", {"opacity":0}, { ...{"opacity":1}, duration: 0.904, ease: "fx-06-already-learning-from-real-use-6-0_648-0-0_348-1_006", scrollTrigger: { trigger: "#content > div > div", start: "top 85%", once: true } });
```

`06-already-learning-from-real-use.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// Watch now hover — #testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > button
export function WatchNowHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}

// View on X hover — #testimonials > div > div:nth-of-type(2) > article > div:nth-of-type(1) > div:nth-of-type(2) > a
export function ViewOnXHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}

// Scroll reveal — #testimonials > div > div:nth-of-type(1)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.608,"delay":0,"ease":[0.178,0.887,0.196,1.019]}} />;
}

// Scroll reveal — #testimonials > div > div:nth-of-type(2)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.609,"delay":0,"ease":[0.178,0.876,0.187,1.021]}} />;
}

// Scroll reveal — #testimonials > div > div:nth-of-type(3)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.609,"delay":0,"ease":[0.176,0.865,0.179,1.022]}} />;
}

// Scroll reveal — #content > div > div
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0}} whileInView={{"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.904,"delay":0,"ease":[0.648,0,0.348,1.006]}} />;
}
```

`07-your-data-trained-and-deployed-o.css`

```css
/* Generated by Specimen. */

/* Scroll-linked motion: tied to scroll position (match 100%) */
@keyframes fx-07-your-data-trained-and-deployed-o-1-transform {
  from { transform: none; animation-timing-function: linear; }
  to { transform: translate(0px, 36px); }
}
#security > div > div:nth-of-type(2) > div:nth-of-type(2) > div {
  animation: fx-07-your-data-trained-and-deployed-o-1-transform linear both;
  animation-timeline: scroll(root);
  animation-range: 3398px 4413px;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#security > div > div:nth-of-type(1) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 608ms cubic-bezier(0.176, 0.902, 0.206, 1.016), transform 608ms cubic-bezier(0.176, 0.902, 0.206, 1.016);
}
#security > div > div:nth-of-type(1).is-visible {
  opacity: 1;
  transform: none;
}
```

`07-your-data-trained-and-deployed-o.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// Scroll-linked motion (match 100%)
gsap.fromTo("#security > div > div:nth-of-type(2) > div:nth-of-type(2) > div", { y: 0 }, { y: 36, ease: "none", scrollTrigger: { start: 3398, end: 4413, scrub: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-07-your-data-trained-and-deployed-o-2-0_176-0_902-0_206-1_016", "M0,0 C0.176,0.902 0.206,1.016 1,1");
gsap.fromTo("#security > div > div:nth-of-type(1)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.608, ease: "fx-07-your-data-trained-and-deployed-o-2-0_176-0_902-0_206-1_016", scrollTrigger: { trigger: "#security > div > div:nth-of-type(1)", start: "top 85%", once: true } });
```

`07-your-data-trained-and-deployed-o.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// Scroll-linked motion — #security > div > div:nth-of-type(2) > div:nth-of-type(2) > div
export function ScrollLinkedMotion(props) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [3398, 4413], [0, 36]);
  return <motion.div {...props} style={{ ...props.style, y }} />;
}

// Scroll reveal — #security > div > div:nth-of-type(1)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.608,"delay":0,"ease":[0.176,0.902,0.206,1.016]}} />;
}
```

`08-built-by-lifelong-learners.css`

```css
/* Generated by Specimen. */

/* Scroll reveal: fitted to the recorded motion (match 99%). Add .is-visible when it enters the viewport. */
#team > div:nth-of-type(1) {
  opacity: 0;
  transform: translate(0px, 24px);
  transition: opacity 604ms cubic-bezier(0.176, 0.925, 0.227, 1.012), transform 604ms cubic-bezier(0.176, 0.925, 0.227, 1.012);
}
#team > div:nth-of-type(1).is-visible {
  opacity: 1;
  transform: none;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img {
  opacity: 0.6;
  transition: opacity 904ms cubic-bezier(0.399, -0.001, 0.196, 1.003);
}
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img.is-visible {
  opacity: 0.7;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img {
  opacity: 0.6;
  transition: opacity 904ms cubic-bezier(0.399, -0.001, 0.196, 1.003);
}
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img.is-visible {
  opacity: 0.7;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img {
  opacity: 0.6;
  transition: opacity 904ms cubic-bezier(0.399, -0.001, 0.196, 1.003);
}
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img.is-visible {
  opacity: 0.7;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img {
  opacity: 0.6;
  transition: opacity 904ms cubic-bezier(0.399, -0.001, 0.196, 1.003);
}
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img.is-visible {
  opacity: 0.7;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img {
  opacity: 0.6;
  transition: opacity 904ms cubic-bezier(0.399, -0.001, 0.196, 1.003);
}
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img.is-visible {
  opacity: 0.7;
}

/* Scroll reveal: fitted to the recorded motion (match 100%). Add .is-visible when it enters the viewport. */
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img {
  opacity: 0.6;
  transition: opacity 904ms cubic-bezier(0.399, -0.001, 0.196, 1.003);
}
#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img.is-visible {
  opacity: 0.7;
}
```

`08-built-by-lifelong-learners.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// Scroll reveal (match 99%)
CustomEase.create("fx-08-built-by-lifelong-learners-1-0_176-0_925-0_227-1_012", "M0,0 C0.176,0.925 0.227,1.012 1,1");
gsap.fromTo("#team > div:nth-of-type(1)", {"y":24,"opacity":0}, { ...{"y":0,"opacity":1}, duration: 0.604, ease: "fx-08-built-by-lifelong-learners-1-0_176-0_925-0_227-1_012", scrollTrigger: { trigger: "#team > div:nth-of-type(1)", start: "top 85%", once: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-08-built-by-lifelong-learners-2-0_399--0_001-0_196-1_003", "M0,0 C0.399,-0.001 0.196,1.003 1,1");
gsap.fromTo("#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img", {"opacity":0.6}, { ...{"opacity":0.7}, duration: 0.904, ease: "fx-08-built-by-lifelong-learners-2-0_399--0_001-0_196-1_003", scrollTrigger: { trigger: "#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img", start: "top 85%", once: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-08-built-by-lifelong-learners-3-0_399--0_001-0_196-1_003", "M0,0 C0.399,-0.001 0.196,1.003 1,1");
gsap.fromTo("#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img", {"opacity":0.6}, { ...{"opacity":0.7}, duration: 0.904, ease: "fx-08-built-by-lifelong-learners-3-0_399--0_001-0_196-1_003", scrollTrigger: { trigger: "#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img", start: "top 85%", once: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-08-built-by-lifelong-learners-4-0_399--0_001-0_196-1_003", "M0,0 C0.399,-0.001 0.196,1.003 1,1");
gsap.fromTo("#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img", {"opacity":0.6}, { ...{"opacity":0.7}, duration: 0.904, ease: "fx-08-built-by-lifelong-learners-4-0_399--0_001-0_196-1_003", scrollTrigger: { trigger: "#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img", start: "top 85%", once: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-08-built-by-lifelong-learners-5-0_399--0_001-0_196-1_003", "M0,0 C0.399,-0.001 0.196,1.003 1,1");
gsap.fromTo("#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img", {"opacity":0.6}, { ...{"opacity":0.7}, duration: 0.904, ease: "fx-08-built-by-lifelong-learners-5-0_399--0_001-0_196-1_003", scrollTrigger: { trigger: "#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img", start: "top 85%", once: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-08-built-by-lifelong-learners-6-0_399--0_001-0_196-1_003", "M0,0 C0.399,-0.001 0.196,1.003 1,1");
gsap.fromTo("#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img", {"opacity":0.6}, { ...{"opacity":0.7}, duration: 0.904, ease: "fx-08-built-by-lifelong-learners-6-0_399--0_001-0_196-1_003", scrollTrigger: { trigger: "#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img", start: "top 85%", once: true } });

// Scroll reveal (match 100%)
CustomEase.create("fx-08-built-by-lifelong-learners-7-0_399--0_001-0_196-1_003", "M0,0 C0.399,-0.001 0.196,1.003 1,1");
gsap.fromTo("#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img", {"opacity":0.6}, { ...{"opacity":0.7}, duration: 0.904, ease: "fx-08-built-by-lifelong-learners-7-0_399--0_001-0_196-1_003", scrollTrigger: { trigger: "#team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img", start: "top 85%", once: true } });
```

`08-built-by-lifelong-learners.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// Scroll reveal — #team > div:nth-of-type(1)
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"y":24,"opacity":0}} whileInView={{"y":0,"opacity":1}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.604,"delay":0,"ease":[0.176,0.925,0.227,1.012]}} />;
}

// Scroll reveal — #team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(1) > img
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0.6}} whileInView={{"opacity":0.7}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.904,"delay":0,"ease":[0.399,-0.001,0.196,1.003]}} />;
}

// Scroll reveal — #team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(2) > img
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0.6}} whileInView={{"opacity":0.7}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.904,"delay":0,"ease":[0.399,-0.001,0.196,1.003]}} />;
}

// Scroll reveal — #team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(3) > img
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0.6}} whileInView={{"opacity":0.7}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.904,"delay":0,"ease":[0.399,-0.001,0.196,1.003]}} />;
}

// Scroll reveal — #team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(4) > img
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0.6}} whileInView={{"opacity":0.7}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.904,"delay":0,"ease":[0.399,-0.001,0.196,1.003]}} />;
}

// Scroll reveal — #team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(5) > img
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0.6}} whileInView={{"opacity":0.7}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.904,"delay":0,"ease":[0.399,-0.001,0.196,1.003]}} />;
}

// Scroll reveal — #team > div:nth-of-type(1) > div > div:nth-of-type(3) > ul > li:nth-of-type(6) > img
export function ScrollReveal(props) {
  return <motion.div {...props} initial={{"opacity":0.6}} whileInView={{"opacity":0.7}} viewport={{ once: true, margin: "0px 0px -15% 0px" }} transition={{"duration":0.904,"delay":0,"ease":[0.399,-0.001,0.196,1.003]}} />;
}
```

`09-research-writing-and-thinking-fr.css`

```css
/* Generated by Specimen. */

/* View all: hover, with the page's computed values and transition */
#field-notes > div > div > div:nth-of-type(1) > a {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1), translate 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
#field-notes > div > div > div:nth-of-type(1) > a:hover {
  scale: 1.05;
}
#field-notes > div > div > div:nth-of-type(1) > a:hover > :nth-child(1) {
  translate: 2px;
}

/* Previous field notes: hover, with the page's computed values and transition */
#field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1) {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
#field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1):hover {
  scale: 1.05;
}

/* Next field notes: hover, with the page's computed values and transition */
#field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(2) {
  transition: scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
#field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(2):hover {
  scale: 1.05;
}
```

`09-research-writing-and-thinking-fr.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// View all hover
CustomEase.create("fx-09-research-writing-and-thinking-fr-1-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("#field-notes > div > div > div:nth-of-type(1) > a").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-09-research-writing-and-thinking-fr-1-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-09-research-writing-and-thinking-fr-1-0_34-1_56-0_64-1" }));
});

// Previous field notes hover
CustomEase.create("fx-09-research-writing-and-thinking-fr-2-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("#field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1)").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-09-research-writing-and-thinking-fr-2-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-09-research-writing-and-thinking-fr-2-0_34-1_56-0_64-1" }));
});

// Next field notes hover
CustomEase.create("fx-09-research-writing-and-thinking-fr-3-0_34-1_56-0_64-1", "M0,0 C0.34,1.56 0.64,1 1,1");
document.querySelectorAll("#field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(2)").forEach((el) => {
  el.addEventListener("mouseenter", () => gsap.to(el, { ...{"scale":1.05}, duration: 0.3, ease: "fx-09-research-writing-and-thinking-fr-3-0_34-1_56-0_64-1" }));
  el.addEventListener("mouseleave", () => gsap.to(el, { ...{"scale":1}, duration: 0.3, ease: "fx-09-research-writing-and-thinking-fr-3-0_34-1_56-0_64-1" }));
});
```

`09-research-writing-and-thinking-fr.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { cubicBezier, motion, useScroll, useTransform } from "motion/react";

// View all hover — #field-notes > div > div > div:nth-of-type(1) > a
export function ViewAllHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}

// Previous field notes hover — #field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1)
export function PreviousFieldNotesHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}

// Next field notes hover — #field-notes > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(2)
export function NextFieldNotesHover(props) {
  return <motion.div {...props} initial={{"scale":1}} whileHover={{"scale":1.05}} transition={{"duration":0.3,"delay":0,"ease":[0.34,1.56,0.64,1]}} />;
}
```

## Shader code

`shaders/12-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uDelta: f32,
    uDissipation: f32,
    uTexel: vec2f,
    uVelocityTexel: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tSource: texture_2d<f32>;
  @group(0) @binding(3) var tVelocity: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let coordinate = input.vUv - uniforms.uDelta * lookup(tVelocity, input.vUv).xy * uniforms.uVelocityTexel;

    return lookup(tSource, coordinate) / (1.0 + uniforms.uDissipation * uniforms.uDelta);
  }
```

`shaders/13-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uTexel: vec2f,
    uValue: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tSource: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    return uniforms.uValue * lookup(tSource, input.vUv);
  }
```

`shaders/14-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uTexel: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tVelocity: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let left = lookup(tVelocity, input.vL).y;
    let right = lookup(tVelocity, input.vR).y;
    let top = lookup(tVelocity, input.vT).x;
    let bottom = lookup(tVelocity, input.vB).x;

    return vec4f(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
  }
```

`shaders/15-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uTexel: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tVelocity: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    var left = lookup(tVelocity, input.vL).x;
    var right = lookup(tVelocity, input.vR).x;
    var top = lookup(tVelocity, input.vT).y;
    var bottom = lookup(tVelocity, input.vB).y;
    let centre = lookup(tVelocity, input.vUv).xy;

    // Walls at the edges: the flow turns back instead of leaving.
    if (input.vL.x < 0.0) {
      left = -centre.x;
    }

    if (input.vR.x > 1.0) {
      right = -centre.x;
    }

    if (input.vT.y > 1.0) {
      top = -centre.y;
    }

    if (input.vB.y < 0.0) {
      bottom = -centre.y;
    }

    return vec4f(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
  }
```

`shaders/16-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uTexel: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tPressure: texture_2d<f32>;
  @group(0) @binding(3) var tVelocity: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let left = lookup(tPressure, input.vL).x;
    let right = lookup(tPressure, input.vR).x;
    let top = lookup(tPressure, input.vT).x;
    let bottom = lookup(tPressure, input.vB).x;
    let velocity = lookup(tVelocity, input.vUv).xy - vec2f(right - left, top - bottom);

    return vec4f(velocity, 0.0, 1.0);
  }
```

`shaders/17-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uTexel: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tDivergence: texture_2d<f32>;
  @group(0) @binding(3) var tPressure: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let left = lookup(tPressure, input.vL).x;
    let right = lookup(tPressure, input.vR).x;
    let top = lookup(tPressure, input.vT).x;
    let bottom = lookup(tPressure, input.vB).x;
    let divergence = lookup(tDivergence, input.vUv).x;

    return vec4f((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
  }
```

`shaders/18-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uAspect: f32,
    uColor: vec3f,
    uPoint: vec2f,
    uRadius: f32,
    uTexel: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tTarget: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    var offset = input.vUv - uniforms.uPoint;

    offset.x *= uniforms.uAspect;

    let splat = exp(-dot(offset, offset) / uniforms.uRadius) * uniforms.uColor;

    return vec4f(lookup(tTarget, input.vUv).xyz + splat, 1.0);
  }
```

`shaders/19-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uCurl: f32,
    uDelta: f32,
    uTexel: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tCurl: texture_2d<f32>;
  @group(0) @binding(3) var tVelocity: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vL: vec2f,
    @location(2) vR: vec2f,
    @location(3) vT: vec2f,
    @location(4) vB: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.x, -position.y, 0.0, 1.0);
    output.vUv = uv;
    output.vL = uv - vec2f(uniforms.uTexel.x, 0.0);
    output.vR = uv + vec2f(uniforms.uTexel.x, 0.0);
    output.vT = uv + vec2f(0.0, uniforms.uTexel.y);
    output.vB = uv - vec2f(0.0, uniforms.uTexel.y);

    return output;
  }

  fn lookup(grid: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSampleLevel(grid, linearSampler, uv, 0.0);
  }


  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let left = lookup(tCurl, input.vL).x;
    let right = lookup(tCurl, input.vR).x;
    let top = lookup(tCurl, input.vT).x;
    let bottom = lookup(tCurl, input.vB).x;
    let centre = lookup(tCurl, input.vUv).x;
    var force = 0.5 * vec2f(abs(top) - abs(bottom), abs(right) - abs(left));

    force /= length(force) + 0.0001;
    force *= uniforms.uCurl * centre;
    force.y *= -1.0;

    let velocity = lookup(tVelocity, input.vUv).xy + force * uniforms.uDelta;

    return vec4f(clamp(velocity, vec2f(-1000.0), vec2f(1000.0)), 0.0, 1.0);
  }
```

`shaders/20-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uCrop: vec4f,
    uPathRect: vec4f,
    uPenAlpha: f32,
    uPenOffset: vec2f,
    uPenRect: vec4f,
    uProgress: f32,
    uPush: vec2f,
    uSoftness: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tOrder: texture_2d<f32>;
  @group(0) @binding(3) var tPath: texture_2d<f32>;
  @group(0) @binding(4) var tPen: texture_2d<f32>;
  @group(0) @binding(5) var tPlate: texture_2d<f32>;
  @group(0) @binding(6) var tVelocity: texture_2d<f32>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.xy, 0.0, 1.0);
    output.vUv = uv;

    return output;
  }

  fn local(uv: vec2f, rect: vec4f) -> vec2f {
    return (uv - rect.xy) / rect.zw;
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let flow = textureSample(tVelocity, linearSampler, input.vUv).xy * uniforms.uPush;
    let screen = vec2f(input.vUv.x, 1.0 - input.vUv.y) + vec2f(-flow.x, flow.y);
    let uv = uniforms.uCrop.xy + screen * uniforms.uCrop.zw;
    var color = textureSample(tPlate, linearSampler, uv).rgb;

    let pathUv = local(uv, uniforms.uPathRect);
    let path = textureSample(tPath, linearSampler, pathUv);
    let drawn = 1.0 - smoothstep(uniforms.uProgress - uniforms.uSoftness, uniforms.uProgress, textureSample(tOrder, linearSampler, pathUv).r);

    color = mix(color, path.rgb, path.a * drawn);

    let pen = textureSample(tPen, linearSampler, local(uv - uniforms.uPenOffset, uniforms.uPenRect));

    color = mix(color, pen.rgb, pen.a * uniforms.uPenAlpha);

    return vec4f(color, 1.0);
  }
```

`shaders/21-webgpu-wgsl.wgsl` (Own your own value function, WGSL)

```wgsl
struct Uniforms {
    uAspect: f32,
    uColorCream: vec3f,
    uColorRose: vec3f,
    uColorShade: vec3f,
    uDotSize: f32,
    uHorizon: f32,
    uLight: vec2f,
    uShadowOffset: vec2f,
    uTime: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tDye: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.xy, 0.0, 1.0);
    output.vUv = uv;

    return output;
  }

  
  fn mod289(value: vec3f) -> vec3f {
    return value - floor(value / 289.0) * 289.0;
  }

  fn permute(value: vec3f) -> vec3f {
    return mod289(((value * 34.0) + 1.0) * value);
  }

  fn simplex(point: vec2f) -> f32 {
    let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var cell = floor(point + dot(point, C.yy));
    let x0 = point - cell + dot(cell, C.xx);
    let corner = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
    let x12 = x0.xyxy + C.xxzz - vec4f(corner, 0.0, 0.0);

    cell = cell - floor(cell / 289.0) * 289.0;

    let permuted = permute(permute(cell.y + vec3f(0.0, corner.y, 1.0)) + cell.x + vec3f(0.0, corner.x, 1.0));
    var falloff = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));

    falloff = falloff * falloff;
    falloff = falloff * falloff;

    let x = 2.0 * fract(permuted * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let a0 = x - floor(x + 0.5);

    falloff *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    let gradient = vec3f(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);

    return 130.0 * dot(falloff, gradient);
  }

  // Four octaves, remapped to 0..1.
  fn fbm(start: vec2f) -> f32 {
    var point = start;
    var sum = 0.0;
    var amplitude = 0.5;

    for (var octave = 0; octave < 4; octave++) {
      sum += amplitude * simplex(point);
      point *= 2.03;
      amplitude *= 0.5;
    }

    return sum * 0.5 + 0.5;
  }

  
  fn hash(point: vec2f) -> f32 {
    return fract(sin(dot(point, vec2f(127.1, 311.7))) * 43758.5453);
  }


  fn dye(uv: vec2f) -> f32 {
    return textureSampleLevel(tDye, linearSampler, uv, 0.0).r;
  }

  // Billowed density: big puffs, then a finer boil only where there is cloud.
  fn shape(uv: vec2f) -> f32 {
    // Capped, so lingering over one spot builds a thick cloud rather than a solid blot.
    let density = min(dye(uv), 1.4);
    let point = uv * vec2f(uniforms.uAspect, 1.0);
    let billow = fbm(point * 4.5 + vec2f(uniforms.uTime * 0.03, -uniforms.uTime * 0.02));
    let detail = fbm(point * 12.0 - uniforms.uTime * 0.06);

    return density * (0.4 + billow * 0.95) + (detail - 0.5) * 0.14 * min(density * 4.0, 1.0);
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let shadowUv = input.vUv + uniforms.uShadowOffset;

    // Most of the screen holds no cloud and no shadow: skip the noise there.
    if (dye(input.vUv) < 0.04 && dye(shadowUv) < 0.04) {
      discard;
    }

    let grain = hash(floor(input.position.xy / uniforms.uDotSize));
    let centre = shape(input.vUv);
    let body = smoothstep(0.3, 0.5, centre);

    // Lit where density falls away towards the sun.
    let reach = uniforms.uLight * vec2f(1.0 / uniforms.uAspect, 1.0) * 0.014;
    let light = clamp(0.62 + (shape(input.vUv - reach) - shape(input.vUv + reach)) * 2.6, 0.0, 1.0);
    var color = mix(uniforms.uColorRose, uniforms.uColorCream, smoothstep(0.45, 0.85, light));
    let shade = (1.0 - light) * 0.5 + smoothstep(0.6, 1.5, centre) * 0.12;

    color = mix(color, uniforms.uColorShade, step(hash(floor(input.position.xy / uniforms.uDotSize) + 31.0), shade * 0.55));

    // The edge breaks into dots instead of fading.
    let cloud = step(grain, body);

    // Shadows fall on the map only, never on the sky.
    let shadow = smoothstep(0.3, 0.6, shape(shadowUv)) * (1.0 - smoothstep(uniforms.uHorizon - 0.04, uniforms.uHorizon, input.vUv.y)) * 0.2;
    let alpha = max(cloud, shadow);

    return vec4f(mix(uniforms.uColorShade * 0.8, color, cloud), alpha);
  }
```

`shaders/01-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Scene {
    accent: vec3f,
    corner: f32,
    direction: vec3f,
    height: f32,
    glass: vec3f,
    half: vec2f,
    rim: vec3f,
    underglow: vec3f,
    body: vec3f,
    highlight: vec3f,
    ink: vec3f,
    plate: vec3f,
    secondary: vec3f,
    shade: vec3f,
    tertiary: vec3f,
    cool: vec3f,
    warm: vec3f,
    occluderCount: f32,
    occluders: array<vec4f, 32>,
  }

  @group(0) @binding(1) var<uniform> scene: Scene;

  
  struct Vertex {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  }


  // How dark the shadow is, for the glass pool's strength of light.
  const SHADOW = 2.4;

  struct Uniforms {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    modelMatrix: mat4x4f,
    extent: vec2f,
    inner: vec2f,
    falloff: f32,
    strength: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;

    output.position = uniforms.projectionMatrix * uniforms.viewMatrix * uniforms.modelMatrix * vec4f(input.position, 1.0);
    output.uv = input.uv;

    return output;
  }

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let point = (input.uv - 0.5) * uniforms.extent;
    let corner = abs(point) - uniforms.inner;
    let outside = length(max(corner, vec2f(0.0))) + min(max(corner.x, corner.y), 0.0);

    return vec4f(scene.ink, exp(-max(outside, 0.0) / uniforms.falloff) * uniforms.strength * SHADOW);
  }
```

`shaders/02-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Scene {
    accent: vec3f,
    corner: f32,
    direction: vec3f,
    height: f32,
    glass: vec3f,
    half: vec2f,
    rim: vec3f,
    underglow: vec3f,
    body: vec3f,
    highlight: vec3f,
    ink: vec3f,
    plate: vec3f,
    secondary: vec3f,
    shade: vec3f,
    tertiary: vec3f,
    cool: vec3f,
    warm: vec3f,
    occluderCount: f32,
    occluders: array<vec4f, 32>,
  }

  @group(0) @binding(1) var<uniform> scene: Scene;

  
  struct Vertex {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  }

  
  struct Uniforms {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    modelMatrix: mat4x4f,
    resolution: vec2f,
    body: f32,
    facing: f32,
    glow: f32,
    inset: f32,
    lit: f32,
    opacity: f32,
    rim: f32,
    round: f32,
    size: vec3f,
    tint: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  
  // The sun sits up to the right, as in the hero and its painted clouds:
  // tops and right-hand faces in the light, left-hand faces in shade.
  const LIGHT = vec3f(0.42, 0.86, -0.3);

  // Painted, not rendered: lights lean warm toward peach-cream and shade
  // leans cool toward periwinkle, as the illustrations' do.
  const WARM_LIGHT = 0.16;
  const WARM_TOPS = 0.2;
  const COOL_SHADE = 0.34;

  // Gouache mottling across every surface, as world-space noise at two
  // scales: how much it moves the tone and the warmth, and its sizes in
  // drawing units.
  const MOTTLE_TONE = 0.07;
  const MOTTLE_WARMTH = 0.1;
  const MOTTLE_SIZES = vec2f(26.0, 9.0);

  // How far the light wraps around a body: 0 is a hard terminator, 1 lights
  // the side facing away at half.
  const WRAP = 0.25;

  // Walls darken toward their feet, as light bounces less near the ground.
  const GROUNDING = 0.22;

  // A soft sheen where a rounded edge faces between the light and the eye, and
  // a faint rim where a surface turns away.
  const SHEEN = 0.16;
  const SHEEN_POWER = 18.0;
  const RIM = 0.24;

  // Cast shadows on upward faces: how dark, and how soft at their base and per
  // unit of height the casting box rises above the receiver. They fall from a
  // steeper light than the shading's, so tall boxes don't throw long slabs of
  // shadow across the plate.
  const SHADOW = 0.4;
  const SHADOW_LIGHT = vec3f(0.3, 1.0, -0.22);
  const SHADOW_SOFTNESS = 3.0;
  const SHADOW_SPREAD = 0.35;
  const SHADOW_TAIL = 0.0;

  // Occlusion near other boxes: how dark, and how far it reaches.
  const OCCLUSION = 0.7;
  const OCCLUSION_REACH = 22.0;

  fn hash3(point: vec3f) -> f32 {
    var value = fract(point * 0.1031);

    value += dot(value, value.zyx + 31.32);

    return fract((value.x + value.y) * value.z);
  }

  // Value noise, 0 to 1, smooth across cells.
  fn noise(point: vec3f) -> f32 {
    let cell = floor(point);
    let local = fract(point);
    let blend = local * local * (3.0 - 2.0 * local);
    let corner = vec2f(1.0, 0.0);

    return mix(
      mix(mix(hash3(cell), hash3(cell + corner.xyy), blend.x), mix(hash3(cell + corner.yxy), hash3(cell + corner.xxy), blend.x), blend.y),
      mix(mix(hash3(cell + corner.yyx), hash3(cell + corner.xyx), blend.x), mix(hash3(cell + corner.yxx), hash3(cell + corner.xxx), blend.x), blend.y),
      blend.z,
    );
  }

  // A surface's color in the light, painted: wrapped light from the sun,
  // warm where it falls and cool where it doesn't, mottled like gouache.
  fn soft(albedo: vec3f, normal: vec3f, point: vec3f) -> vec3f {
    let light = normalize(LIGHT);
    let eye = -scene.direction;
    let wrapped = clamp((dot(normal, light) + WRAP) / (1.0 + WRAP), 0.0, 1.0);
    let mottle = noise(point / MOTTLE_SIZES.x) * 0.65 + noise(point / MOTTLE_SIZES.y + 7.0) * 0.35 - 0.5;
    let shaded = mix(albedo * scene.shade, scene.cool, COOL_SHADE);
    let lit = mix(albedo, scene.warm, WARM_LIGHT + max(normal.y, 0.0) * (WARM_TOPS - WARM_LIGHT));
    var color = mix(shaded, lit, smoothstep(0.0, 1.0, wrapped));

    color = mix(color, select(scene.cool, scene.warm, mottle > 0.0), abs(mottle) * MOTTLE_WARMTH * 2.0);
    color *= 1.0 + mottle * MOTTLE_TONE * 2.0;

    let sheen = pow(max(dot(normal, normalize(light + eye)), 0.0), SHEEN_POWER) * SHEEN;
    // The rim is gold and only on the sunlit side, like the gilded edges of
    // the hero's clouds and coastlines.
    let rim = pow(1.0 - max(dot(normal, eye), 0.0), 3.0) * RIM * smoothstep(-0.2, 0.4, dot(normal, light));

    return color + scene.highlight * sheen + mix(scene.highlight, scene.accent, 0.7) * rim;
  }

  fn occluder(index: u32) -> array<vec3f, 2> {
    return array<vec3f, 2>(scene.occluders[index * 2u].xyz, scene.occluders[index * 2u + 1u].xyz);
  }

  // 1 where an upward face is in full light, less under a box above it. Each
  // box casts its footprint swept along the light from its foot to its top,
  // as a rounded rectangle softening with the height it falls from.
  fn shadow(point: vec3f, normal: vec3f) -> f32 {
    let light = normalize(SHADOW_LIGHT);
    let slope = -light.xz / light.y;
    var lit = 1.0;

    for (var index = 0u; index < u32(scene.occluderCount); index++) {
      let box = occluder(index);
      let low = box[0].y - box[1].y - point.y;
      let high = box[0].y + box[1].y - point.y;

      if (low < -0.5) {
        continue;
      }

      let center = box[0].xz + slope * (low + high) * 0.5;
      let half = box[1].xz + abs(slope) * (high - low) * 0.5;
      let softness = SHADOW_SOFTNESS + max(low, 0.0) * SHADOW_SPREAD;
      let corner = abs(point.xz - center) - half + softness;
      let distance = length(max(corner, vec2f(0.0))) + min(max(corner.x, corner.y), 0.0) - softness;
      // Darkest at the foot, fading toward the far end of the sweep.
      let sweep = slope * (high - max(low, 0.0));
      let along = clamp(dot(point.xz - box[0].xz - slope * max(low, 0.0), sweep) / max(dot(sweep, sweep), 0.001), 0.0, 1.0);

      lit *= 1.0 - SHADOW * (1.0 - smoothstep(-softness, softness, distance)) * mix(1.0, SHADOW_TAIL, along);
    }

    return mix(1.0, lit, smoothstep(0.3, 0.8, normal.y));
  }

  // 1 in the open, less close to another box, most where the box is in front
  // of the surface. A point on or inside a box's own surface skips it.
  fn occlusion(point: vec3f, normal: vec3f) -> f32 {
    var open = 1.0;

    for (var index = 0u; index < u32(scene.occluderCount); index++) {
      let box = occluder(index);
      let local = point - box[0];
      let outside = abs(local) - box[1];
      let distance = length(max(outside, vec3f(0.0))) + min(max(outside.x, max(outside.y, outside.z)), 0.0);

      if (distance < 0.3) {
        continue;
      }

      let toward = normalize(clamp(local, -box[1], box[1]) - local);
      let near = 1.0 - clamp(distance / OCCLUSION_REACH, 0.0, 1.0);

      open *= 1.0 - OCCLUSION * near * near * (dot(normal, toward) * 0.5 + 0.5);
    }

    return open;
  }


  // How bright lit parts glow at their edge and their centre, past 1 so the
  // bloom catches them.
  const EMISSION = vec2f(1.05, 1.5);

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) local: vec3f,
    @location(1) normal: vec3f,
    @location(2) world: vec3f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;
    let world = uniforms.modelMatrix * vec4f(input.position, 1.0);

    output.position = uniforms.projectionMatrix * uniforms.viewMatrix * world;
    output.local = input.position;
    output.normal = (uniforms.modelMatrix * vec4f(input.normal, 0.0)).xyz;
    output.world = world.xyz;

    return output;
  }

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let normal = normalize(input.normal);
    let isPlate = uniforms.round > 0.0;
    let isLamp = uniforms.lit > 0.0;
    // Bodies take one of three colors; the plate is pale lilac, the slab
    // under it deeper; windows and lamps rest in plum sockets until they glow.
    let tint = select(select(scene.body, scene.secondary, uniforms.tint > 0.5), scene.tertiary, uniforms.tint > 1.5);
    let plate = select(mix(scene.plate, scene.secondary, 0.5), scene.plate, uniforms.rim >= 1.0);
    let socket = mix(scene.ink, scene.secondary, 0.35);
    let albedo = select(select(tint, socket, isLamp), plate, isPlate);
    let height = input.local.y / uniforms.size.y + 0.5;
    let wall = 1.0 - smoothstep(0.3, 0.8, abs(normal.y));
    let grounding = 1.0 - GROUNDING * wall * (1.0 - height) * select(1.0, 0.0, isPlate);
    let light = shadow(input.world, normal) * occlusion(input.world, normal) * grounding;
    // Cast shadows and occlusion darken toward the same cool shade.
    let rest = soft(albedo, normal, input.world) * mix(mix(scene.shade, scene.cool, COOL_SHADE), vec3f(1.0), light);
    // A lit window is hottest in its middle: how far in from its edges a point
    // is, across the box's two widest sides.
    let inward = clamp(1.0 - abs(input.local) / (uniforms.size * 0.5), vec3f(0.0), vec3f(1.0));
    let middle = max(min(inward.x, inward.y), max(min(inward.x, inward.z), min(inward.y, inward.z)));
    let glow = scene.accent * mix(EMISSION.x, EMISSION.y, smoothstep(0.0, 0.7, middle));

    return vec4f(mix(rest, glow, uniforms.glow), 1.0);
  }
```

`shaders/03-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Vertex {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  }


  // How opaque a halo is at its peak, for the glass halo's brightness.
  const OPACITY = 1.5;

  struct Uniforms {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    modelMatrix: mat4x4f,
    color: vec3f,
    intensity: f32,
    peak: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;

    output.position = uniforms.projectionMatrix * uniforms.viewMatrix * uniforms.modelMatrix * vec4f(input.position, 1.0);
    output.uv = input.uv;

    return output;
  }

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let distance = length(input.uv - 0.5) * 2.0;
    let disc = 1.0 - smoothstep(0.3, 1.0, distance);

    return vec4f(uniforms.color, disc * uniforms.intensity * uniforms.peak * OPACITY);
  }
```

`shaders/05-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Scene {
    accent: vec3f,
    corner: f32,
    direction: vec3f,
    height: f32,
    glass: vec3f,
    half: vec2f,
    rim: vec3f,
    underglow: vec3f,
    body: vec3f,
    highlight: vec3f,
    ink: vec3f,
    plate: vec3f,
    secondary: vec3f,
    shade: vec3f,
    tertiary: vec3f,
    cool: vec3f,
    warm: vec3f,
    occluderCount: f32,
    occluders: array<vec4f, 32>,
  }

  @group(0) @binding(1) var<uniform> scene: Scene;

  
  struct Vertex {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  }


  struct Uniforms {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    modelMatrix: mat4x4f,
    strength: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(2) var mapSampler: sampler;
  @group(0) @binding(3) var tMap: texture_2d<f32>;

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) world: vec3f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;
    let world = uniforms.modelMatrix * vec4f(input.position, 1.0);

    output.position = uniforms.projectionMatrix * uniforms.viewMatrix * world;
    output.uv = vec2f(input.uv.x, 1.0 - input.uv.y);
    output.world = world.xyz;

    return output;
  }


  // Near-black violet, which the labels' plum darkens toward.
  const LABEL_INK = vec3f(0.012, 0.006, 0.03);

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let alpha = textureSample(tMap, mapSampler, input.uv).a * uniforms.strength;

    if (alpha < 0.02) {
      discard;
    }

    return vec4f(mix(scene.ink, LABEL_INK, 0.55), alpha);
  }
```

`shaders/07-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Vertex {
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
  }

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;

    output.position = vec4f(input.position, 1.0);
    output.uv = vec2f(input.uv.x, 1.0 - input.uv.y);

    return output;
  }

  @group(0) @binding(1) var linearSampler: sampler;


  const BLOOM_THRESHOLD = 1.05;
  const BLOOM_SMOOTHING = 0.3;

  @group(0) @binding(2) var tScene: texture_2d<f32>;

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let color = textureSampleLevel(tScene, linearSampler, input.uv, 0.0);
    let peak = max(color.r, max(color.g, color.b));

    return vec4f(color.rgb * smoothstep(BLOOM_THRESHOLD, BLOOM_THRESHOLD + BLOOM_SMOOTHING, peak), 1.0);
  }
```

`shaders/08-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Vertex {
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
  }

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;

    output.position = vec4f(input.position, 1.0);
    output.uv = vec2f(input.uv.x, 1.0 - input.uv.y);

    return output;
  }

  @group(0) @binding(1) var linearSampler: sampler;


  struct Uniforms {
    direction: vec2f,
    texel: vec2f,
    center: f32,
    count: u32,
    offsets: array<vec4f, 3>,
    weights: array<vec4f, 3>,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(2) var tSource: texture_2d<f32>;

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    var sum = textureSampleLevel(tSource, linearSampler, input.uv, 0.0).rgb * uniforms.center;

    for (var index = 0u; index < uniforms.count; index++) {
      let weight = uniforms.weights[index / 4u][index % 4u];
      let offset = uniforms.direction * uniforms.texel * uniforms.offsets[index / 4u][index % 4u];
      let ahead = textureSampleLevel(tSource, linearSampler, input.uv + offset, 0.0).rgb;
      let behind = textureSampleLevel(tSource, linearSampler, input.uv - offset, 0.0).rgb;

      sum += (ahead + behind) * weight;
    }

    return vec4f(sum, 1.0);
  }
```

`shaders/09-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Vertex {
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
  }

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;

    output.position = vec4f(input.position, 1.0);
    output.uv = vec2f(input.uv.x, 1.0 - input.uv.y);

    return output;
  }

  @group(0) @binding(1) var linearSampler: sampler;


  // How strong the bloom is, and how wide (0–1): wider moves weight from the
  // small mips to the large ones.
  const BLOOM_STRENGTH = 0.55;
  const BLOOM_RADIUS = 0.35;

  @group(0) @binding(2) var tBlur0: texture_2d<f32>;
  @group(0) @binding(3) var tBlur1: texture_2d<f32>;
  @group(0) @binding(4) var tBlur2: texture_2d<f32>;
  @group(0) @binding(5) var tBlur3: texture_2d<f32>;
  @group(0) @binding(6) var tBlur4: texture_2d<f32>;

  fn factor(base: f32) -> f32 {
    return mix(base, 1.2 - base, BLOOM_RADIUS);
  }

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let sum = factor(1.0) * textureSampleLevel(tBlur0, linearSampler, input.uv, 0.0)
      + factor(0.8) * textureSampleLevel(tBlur1, linearSampler, input.uv, 0.0)
      + factor(0.6) * textureSampleLevel(tBlur2, linearSampler, input.uv, 0.0)
      + factor(0.4) * textureSampleLevel(tBlur3, linearSampler, input.uv, 0.0)
      + factor(0.2) * textureSampleLevel(tBlur4, linearSampler, input.uv, 0.0);

    return sum * BLOOM_STRENGTH;
  }
```

`shaders/10-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Vertex {
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
  }

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vs(input: Vertex) -> Varyings {
    var output: Varyings;

    output.position = vec4f(input.position, 1.0);
    output.uv = vec2f(input.uv.x, 1.0 - input.uv.y);

    return output;
  }

  @group(0) @binding(1) var linearSampler: sampler;


  // How far the pool of light behind the figure lifts the sky toward the
  // highlight, where it sits (uv, y down) and its radius on each axis.
  const POOL_LIFT = 0.55;
  const POOL_CENTER = vec2f(0.5, 0.56);
  const POOL_RADIUS = vec2f(0.45, 0.42);

  // How strong the paper grain is, in display values.
  const GRAIN = 0.03;

  // How strongly the stipple's dots take their ink on the figure and on the
  // sky, and how many dot cells fit the panel's height, for its two sizes.
  const STIPPLE = 0.26;
  const STIPPLE_SKY = 0.1;
  const STIPPLE_CELLS = vec2f(190.0, 120.0);

  // How strong the glow around lit parts is.
  const GLOW = 0.7;

  // Where highlights start to roll off, and the most white they take on.
  const SHOULDER = 0.8;
  const HIGHLIGHT_WHITE = 0.15;

  struct Uniforms {
    bottom: vec3f,
    cool: vec3f,
    highlight: vec3f,
    middle: vec3f,
    top: vec3f,
    warm: vec3f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(2) var tScene: texture_2d<f32>;
  @group(0) @binding(3) var tBloom: texture_2d<f32>;

  // Dave Hoskins's Hash without Sine.
  fn hash(point: vec2f) -> f32 {
    var value = fract(vec3f(point.xyx) * 0.1031);

    value += dot(value, value.yzx + 33.33);

    return fract((value.x + value.y) * value.z);
  }

  fn encode(color: vec3f) -> vec3f {
    let curve = 1.055 * pow(color, vec3f(1.0 / 2.4)) - 0.055;

    return select(curve, color * 12.92, color <= vec3f(0.0031308));
  }

  // One layer of stipple over a display color: a dot of random size
  // anywhere in each cell, inked warm or cool at random, warm more often where
  // the color is light. Each pixel looks at the dots of its cell and the
  // eight around it, so dots can sit anywhere and no grid shows.
  fn stipple(color: vec3f, position: vec2f, cell: f32, seed: f32, amount: f32) -> vec3f {
    let base = floor(position / cell);
    let warmth = smoothstep(0.45, 0.95, dot(color, vec3f(0.299, 0.587, 0.114)));
    let edge = 0.75 / cell;
    var painted = color;

    for (var y = -1; y <= 1; y++) {
      for (var x = -1; x <= 1; x++) {
        let index = base + vec2f(f32(x), f32(y)) + seed;
        let center = vec2f(f32(x), f32(y)) + vec2f(hash(index), hash(index + 17.0));
        let radius = mix(0.14, 0.36, hash(index + 31.0));
        let spot = 1.0 - smoothstep(radius - edge, radius + edge, length(position / cell - base - center));
        let ink = select(encode(uniforms.cool), encode(uniforms.warm), hash(index + 53.0) < warmth);

        painted = mix(painted, ink, spot * amount);
      }
    }

    return painted;
  }

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let figure = textureSampleLevel(tScene, linearSampler, input.uv, 0.0);
    let pool = (input.uv - POOL_CENTER) / POOL_RADIUS;
    var sky = mix(uniforms.top, uniforms.middle, smoothstep(0.0, 0.55, input.uv.y));

    sky = mix(sky, uniforms.bottom, smoothstep(0.5, 1.0, input.uv.y));
    sky = mix(sky, uniforms.highlight, exp(-dot(pool, pool) * 2.0) * POOL_LIFT);

    let light = figure.rgb + sky * (1.0 - figure.a) + textureSampleLevel(tBloom, linearSampler, input.uv, 0.0).rgb * GLOW;
    let peak = max(max(light.r, max(light.g, light.b)), 0.0001);
    let rolled = select(peak, SHOULDER + (1.0 - SHOULDER) * (1.0 - exp(-(peak - SHOULDER) / (1.0 - SHOULDER))), peak > SHOULDER);
    let color = mix(light * rolled / peak, vec3f(1.0), clamp((peak - 1.0) * 0.35, 0.0, HIGHLIGHT_WHITE));
    // Dot cells and grain follow the panel's size, so the texture reads the
    // same at any width and pixel ratio.
    let height = f32(textureDimensions(tScene).y);
    let amount = mix(STIPPLE_SKY, STIPPLE, figure.a);
    var painted = stipple(encode(color), input.position.xy, height / STIPPLE_CELLS.x, 0.0, amount);

    painted = stipple(painted, input.position.xy, height / STIPPLE_CELLS.y, 91.0, amount);

    let grain = (hash(floor(input.position.xy / max(height / 400.0, 1.0))) - 0.5) * GRAIN;

    return vec4f(painted + grain, 1.0);
  }
```

`shaders/11-webgpu-wgsl.wgsl` (Building intelligence that never stops …, WGSL)

```wgsl
struct Scene {
    accent: vec3f,
    corner: f32,
    direction: vec3f,
    height: f32,
    glass: vec3f,
    half: vec2f,
    rim: vec3f,
    underglow: vec3f,
    body: vec3f,
    highlight: vec3f,
    ink: vec3f,
    plate: vec3f,
    secondary: vec3f,
    shade: vec3f,
    tertiary: vec3f,
    cool: vec3f,
    warm: vec3f,
    occluderCount: f32,
    occluders: array<vec4f, 32>,
  }

  @group(0) @binding(1) var<uniform> scene: Scene;

  
  struct Vertex {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  }

  
  // The sun sits up to the right, as in the hero and its painted clouds:
  // tops and right-hand faces in the light, left-hand faces in shade.
  const LIGHT = vec3f(0.42, 0.86, -0.3);

  // Painted, not rendered: lights lean warm toward peach-cream and shade
  // leans cool toward periwinkle, as the illustrations' do.
  const WARM_LIGHT = 0.16;
  const WARM_TOPS = 0.2;
  const COOL_SHADE = 0.34;

  // Gouache mottling across every surface, as world-space noise at two
  // scales: how much it moves the tone and the warmth, and its sizes in
  // drawing units.
  const MOTTLE_TONE = 0.07;
  const MOTTLE_WARMTH = 0.1;
  const MOTTLE_SIZES = vec2f(26.0, 9.0);

  // How far the light wraps around a body: 0 is a hard terminator, 1 lights
  // the side facing away at half.
  const WRAP = 0.25;

  // Walls darken toward their feet, as light bounces less near the ground.
  const GROUNDING = 0.22;

  // A soft sheen where a rounded edge faces between the light and the eye, and
  // a faint rim where a surface turns away.
  const SHEEN = 0.16;
  const SHEEN_POWER = 18.0;
  const RIM = 0.24;

  // Cast shadows on upward faces: how dark, and how soft at their base and per
  // unit of height the casting box rises above the receiver. They fall from a
  // steeper light than the shading's, so tall boxes don't throw long slabs of
  // shadow across the plate.
  const SHADOW = 0.4;
  const SHADOW_LIGHT = vec3f(0.3, 1.0, -0.22);
  const SHADOW_SOFTNESS = 3.0;
  const SHADOW_SPREAD = 0.35;
  const SHADOW_TAIL = 0.0;

  // Occlusion near other boxes: how dark, and how far it reaches.
  const OCCLUSION = 0.7;
  const OCCLUSION_REACH = 22.0;

  fn hash3(point: vec3f) -> f32 {
    var value = fract(point * 0.1031);

    value += dot(value, value.zyx + 31.32);

    return fract((value.x + value.y) * value.z);
  }

  // Value noise, 0 to 1, smooth across cells.
  fn noise(point: vec3f) -> f32 {
    let cell = floor(point);
    let local = fract(point);
    let blend = local * local * (3.0 - 2.0 * local);
    let corner = vec2f(1.0, 0.0);

    return mix(
      mix(mix(hash3(cell), hash3(cell + corner.xyy), blend.x), mix(hash3(cell + corner.yxy), hash3(cell + corner.xxy), blend.x), blend.y),
      mix(mix(hash3(cell + corner.yyx), hash3(cell + corner.xyx), blend.x), mix(hash3(cell + corner.yxx), hash3(cell + corner.xxx), blend.x), blend.y),
      blend.z,
    );
  }

  // A surface's color in the light, painted: wrapped light from the sun,
  // warm where it falls and cool where it doesn't, mottled like gouache.
  fn soft(albedo: vec3f, normal: vec3f, point: vec3f) -> vec3f {
    let light = normalize(LIGHT);
    let eye = -scene.direction;
    let wrapped = clamp((dot(normal, light) + WRAP) / (1.0 + WRAP), 0.0, 1.0);
    let mottle = noise(point / MOTTLE_SIZES.x) * 0.65 + noise(point / MOTTLE_SIZES.y + 7.0) * 0.35 - 0.5;
    let shaded = mix(albedo * scene.shade, scene.cool, COOL_SHADE);
    let lit = mix(albedo, scene.warm, WARM_LIGHT + max(normal.y, 0.0) * (WARM_TOPS - WARM_LIGHT));
    var color = mix(shaded, lit, smoothstep(0.0, 1.0, wrapped));

    color = mix(color, select(scene.cool, scene.warm, mottle > 0.0), abs(mottle) * MOTTLE_WARMTH * 2.0);
    color *= 1.0 + mottle * MOTTLE_TONE * 2.0;

    let sheen = pow(max(dot(normal, normalize(light + eye)), 0.0), SHEEN_POWER) * SHEEN;
    // The rim is gold and only on the sunlit side, like the gilded edges of
    // the hero's clouds and coastlines.
    let rim = pow(1.0 - max(dot(normal, eye), 0.0), 3.0) * RIM * smoothstep(-0.2, 0.4, dot(normal, light));

    return color + scene.highlight * sheen + mix(scene.highlight, scene.accent, 0.7) * rim;
  }

  fn occluder(index: u32) -> array<vec3f, 2> {
    return array<vec3f, 2>(scene.occluders[index * 2u].xyz, scene.occluders[index * 2u + 1u].xyz);
  }

  // 1 where an upward face is in full light, less under a box above it. Each
  // box casts its footprint swept along the light from its foot to its top,
  // as a rounded rectangle softening with the height it falls from.
  fn shadow(point: vec3f, normal: vec3f) -> f32 {
    let light = normalize(SHADOW_LIGHT);
    let slope = -light.xz / light.y;
    var lit = 1.0;

    for (var index = 0u; index < u32(scene.occluderCount); index++) {
      let box = occluder(index);
      let low = box[0].y - box[1].y - point.y;
      let high = box[0].y + box[1].y - point.y;

      if (low < -0.5) {
        continue;
      }

      let center = box[0].xz + slope * (low + high) * 0.5;
      let half = box[1].xz + abs(slope) * (high - low) * 0.5;
      let softness = SHADOW_SOFTNESS + max(low, 0.0) * SHADOW_SPREAD;
      let corner = abs(point.xz - center) - half + softness;
      let distance = length(max(corner, vec2f(0.0))) + min(max(corner.x, corner.y), 0.0) - softness;
      // Darkest at the foot, fading toward the far end of the sweep.
      let sweep = slope * (high - max(low, 0.0));
      let along = clamp(dot(point.xz - box[0].xz - slope * max(low, 0.0), sweep) / max(dot(sweep, sweep), 0.001), 0.0, 1.0);

      lit *= 1.0 - SHADOW * (1.0 - smoothstep(-softness, softness, distance)) * mix(1.0, SHADOW_TAIL, along);
    }

    return mix(1.0, lit, smoothstep(0.3, 0.8, normal.y));
  }

  // 1 in the open, less close to another box, most where the box is in front
  // of the surface. A point on or inside a box's own surface skips it.
  fn occlusion(point: vec3f, normal: vec3f) -> f32 {
    var open = 1.0;

    for (var index = 0u; index < u32(scene.occluderCount); index++) {
      let box = occluder(index);
      let local = point - box[0];
      let outside = abs(local) - box[1];
      let distance = length(max(outside, vec3f(0.0))) + min(max(outside.x, max(outside.y, outside.z)), 0.0);

      if (distance < 0.3) {
        continue;
      }

      let toward = normalize(clamp(local, -box[1], box[1]) - local);
      let near = 1.0 - clamp(distance / OCCLUSION_REACH, 0.0, 1.0);

      open *= 1.0 - OCCLUSION * near * near * (dot(normal, toward) * 0.5 + 0.5);
    }

    return open;
  }


  struct Uniforms {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    modelMatrix: mat4x4f,
    count: f32,
    hot: f32,
    progress: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct Varyings {
    @builtin(position) position: vec4f,
    @location(0) @interpolate(flat) along: f32,
    @location(1) normal: vec3f,
    @location(2) world: vec3f,
  }

  @vertex
  fn vs(input: Vertex, @location(3) offset: vec3f, @builtin(instance_index) instance: u32) -> Varyings {
    var output: Varyings;
    let world = uniforms.modelMatrix * vec4f(input.position + offset, 1.0);

    output.position = uniforms.projectionMatrix * uniforms.viewMatrix * world;
    output.along = f32(instance) / max(uniforms.count - 1.0, 1.0);
    output.normal = (uniforms.modelMatrix * vec4f(input.normal, 0.0)).xyz;
    output.world = world.xyz;

    return output;
  }

  @fragment
  fn fs(input: Varyings) -> @location(0) vec4f {
    let distance = (input.along - uniforms.progress) / 0.09;
    let pulse = exp(-distance * distance);
    let rest = soft(scene.secondary, normalize(input.normal), input.world);

    return vec4f(mix(rest, scene.accent * (1.2 + pulse * 0.8), max(uniforms.hot, pulse)), 1.0);
  }
```

`shaders/22-webgpu-wgsl.wgsl` (Your data, trained and deployed on your…, WGSL)

```wgsl
fn mod289(value: vec3f) -> vec3f {
    return value - floor(value / 289.0) * 289.0;
  }

  fn permute(value: vec3f) -> vec3f {
    return mod289(((value * 34.0) + 1.0) * value);
  }

  fn simplex(point: vec2f) -> f32 {
    const C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var cell = floor(point + dot(point, C.yy));
    let x0 = point - cell + dot(cell, C.xx);
    let corner = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
    var x12 = x0.xyxy + C.xxzz;

    x12 = vec4f(x12.xy - corner, x12.zw);
    cell = cell - floor(cell / 289.0) * 289.0;

    let hashed = permute(permute(cell.y + vec3f(0.0, corner.y, 1.0)) + cell.x + vec3f(0.0, corner.x, 1.0));
    var falloff = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));

    falloff = falloff * falloff;
    falloff = falloff * falloff;

    let x = 2.0 * fract(hashed * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let a0 = x - floor(x + 0.5);

    falloff *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    let gradient = vec3f(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);

    return 130.0 * dot(falloff, gradient);
  }

  // Three octaves, remapped to 0..1.
  fn fbm(start: vec2f) -> f32 {
    var point = start;
    var sum = 0.0;
    var amplitude = 0.5;

    for (var octave = 0; octave < 3; octave++) {
      sum += amplitude * simplex(point);
      point *= 2.03;
      amplitude *= 0.5;
    }

    return sum * 0.5 + 0.5;
  }


  struct Uniforms {
    resolution: vec2f,
    uBillow: vec2f,
    uClip: vec4f,
    uCrop: vec4f,
    uDepth: f32,
    uDrift: f32,
    uFlame: f32,
    uFlameColor: vec3f,
    uFlameDensity: f32,
    uFlameFlow: vec2f,
    uFlameGlow: f32,
    uFlameTint: f32,
    uFlameWarp: f32,
    uFlameX: vec2f,
    uFlameY: vec4f,
    uLight: vec2f,
    uPush: vec2f,
    uRect: vec4f,
    uRelief: f32,
    uReliefTexel: vec2f,
    uSeed: f32,
    uShine: f32,
    uSway: vec2f,
    uTime: f32,
    uViewport: vec2f,
  }

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) imageUv: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var tSampler: sampler;
  @group(0) @binding(2) var tImage: texture_2d<f32>;
  @group(0) @binding(3) var tRelief: texture_2d<f32>;
  @group(0) @binding(4) var tVelocity: texture_2d<f32>;

  // The grid's UVs are top-down, as the box is.
  @vertex
  fn vs(@location(0) uv: vec2f) -> VertexOutput {
    let imageUv = uniforms.uCrop.xy + uv * uniforms.uCrop.zw;
    let relief = textureSampleLevel(tRelief, tSampler, imageUv, 0.0).r;
    let depth = uniforms.uDepth + (relief - 0.5) * uniforms.uRelief;
    var point = uniforms.uRect.xy + uv * uniforms.uRect.zw - uniforms.uSway * depth;

    // Each layer hangs on its own slow phase.
    point += vec2f(sin(uniforms.uTime * 0.21 + uniforms.uSeed * 6.2831), sin(uniforms.uTime * 0.37 + uniforms.uSeed * 11.0)) * uniforms.uDrift;

    let clip = point / uniforms.uViewport * 2.0 - 1.0;
    var output: VertexOutput;

    output.imageUv = imageUv;
    output.position = vec4f(clip.x, -clip.y, 0.0, 1.0);

    return output;
  }

  fn relief(uv: vec2f) -> f32 {
    return textureSampleLevel(tRelief, tSampler, uv, 0.0).r;
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    // GL's bottom-up fragment position, which the clip and the fluid's panel are in.
    let fragCoord = vec2f(input.position.x, uniforms.resolution.y - input.position.y);
    var uv = input.imageUv;

    // The fluid lives in the panel, bottom-up; images are top-down.
    let panelUv = (fragCoord - uniforms.uClip.xy) / (uniforms.uClip.zw - uniforms.uClip.xy);
    let velocity = textureSampleLevel(tVelocity, tSampler, clamp(panelUv, vec2f(0.0), vec2f(1.0)), 0.0).xy;

    uv -= velocity * uniforms.uPush * vec2f(1.0, -1.0);

    let point = uv * 6.0 + uniforms.uSeed * 19.0;

    uv += (vec2f(fbm(point + uniforms.uTime * 0.11), fbm(point + 37.0 - uniforms.uTime * 0.09)) - 0.5) * uniforms.uBillow;

    // The exhaust streams down and back from the boots, strongest at its tail.
    let flame = uniforms.uFlame * (1.0 - smoothstep(uniforms.uFlameX.x, uniforms.uFlameX.y, uv.x)) * smoothstep(uniforms.uFlameY.x, uniforms.uFlameY.y, uv.y) * (1.0 - smoothstep(uniforms.uFlameY.z, uniforms.uFlameY.w, uv.y));
    let across = vec2f(uniforms.uFlameFlow.y, -uniforms.uFlameFlow.x);
    let along = dot(uv, uniforms.uFlameFlow);
    let flow = fbm(vec2f(along * 9.0 - uniforms.uTime * 1.6, dot(uv, across) * 7.0));

    uv += across * (flow - 0.5) * uniforms.uFlameWarp * flame;

    let color = textureSample(tImage, tSampler, uv);
    let streak = smoothstep(0.45, 0.8, flow);

    // The exhaust thickens and takes its color, most in the streaks running down it.
    let alpha = min(color.a * (1.0 + uniforms.uFlameDensity * flame), 1.0);
    var rgb = color.rgb * (alpha / max(color.a, 1e-4));

    rgb = mix(rgb, uniforms.uFlameColor * alpha, flame * uniforms.uFlameTint * (0.4 + 0.6 * streak));
    rgb += uniforms.uFlameColor * alpha * streak * uniforms.uFlameGlow * flame;

    // Facets turned towards the pointer lift, those turned away settle.
    let left = relief(uv - vec2f(uniforms.uReliefTexel.x, 0.0));
    let right = relief(uv + vec2f(uniforms.uReliefTexel.x, 0.0));
    let up = relief(uv - vec2f(0.0, uniforms.uReliefTexel.y));
    let down = relief(uv + vec2f(0.0, uniforms.uReliefTexel.y));
    let slope = vec2f(left - right, up - down);

    rgb *= 1.0 + dot(slope, uniforms.uLight) * uniforms.uShine;

    // Clouds are clipped to the artwork panel; the figure's clip is unbounded.
    // Last, so the image's mip selection runs in uniform control flow.
    if (any(fragCoord < uniforms.uClip.xy) || any(fragCoord > uniforms.uClip.zw)) {
      discard;
    }

    return vec4f(min(rgb, vec3f(alpha)), alpha);
  }
```

`shaders/23-webgpu-wgsl.wgsl` (Your data, trained and deployed on your…, WGSL)

```wgsl
fn mod289(value: vec3f) -> vec3f {
    return value - floor(value / 289.0) * 289.0;
  }

  fn permute(value: vec3f) -> vec3f {
    return mod289(((value * 34.0) + 1.0) * value);
  }

  fn simplex(point: vec2f) -> f32 {
    const C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var cell = floor(point + dot(point, C.yy));
    let x0 = point - cell + dot(cell, C.xx);
    let corner = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
    var x12 = x0.xyxy + C.xxzz;

    x12 = vec4f(x12.xy - corner, x12.zw);
    cell = cell - floor(cell / 289.0) * 289.0;

    let hashed = permute(permute(cell.y + vec3f(0.0, corner.y, 1.0)) + cell.x + vec3f(0.0, corner.x, 1.0));
    var falloff = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));

    falloff = falloff * falloff;
    falloff = falloff * falloff;

    let x = 2.0 * fract(hashed * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let a0 = x - floor(x + 0.5);

    falloff *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    let gradient = vec3f(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);

    return 130.0 * dot(falloff, gradient);
  }

  // Three octaves, remapped to 0..1.
  fn fbm(start: vec2f) -> f32 {
    var point = start;
    var sum = 0.0;
    var amplitude = 0.5;

    for (var octave = 0; octave < 3; octave++) {
      sum += amplitude * simplex(point);
      point *= 2.03;
      amplitude *= 0.5;
    }

    return sum * 0.5 + 0.5;
  }

  
  fn hash(point: vec2f) -> f32 {
    return fract(sin(dot(point, vec2f(127.1, 311.7))) * 43758.5453);
  }


  struct Uniforms {
    uColorCream: vec3f,
    uColorRose: vec3f,
    uColorShade: vec3f,
    uDotSize: f32,
    uLight: vec2f,
    uSize: vec2f,
    uTime: f32,
  }

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tDye: texture_2d<f32>;

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.xy, 0.0, 1.0);
    output.vUv = uv;

    return output;
  }

  fn dye(uv: vec2f) -> f32 {
    return textureSampleLevel(tDye, linearSampler, uv, 0.0).r;
  }

  fn mass(uv: vec2f) -> f32 {
    return min(dye(uv), 1.0);
  }

  // Billowed density, its puffs sized in CSS pixels so they read the same on any panel.
  fn shape(uv: vec2f) -> f32 {
    let density = min(dye(uv) * 0.8, 1.1);
    let point = uv * uniforms.uSize;
    let billow = fbm(point / 170.0 + vec2f(uniforms.uTime * 0.03, -uniforms.uTime * 0.02));
    let detail = fbm(point / 60.0 - uniforms.uTime * 0.06);

    return density * (0.55 + billow * 0.7) + (detail - 0.5) * 0.18 * min(density * 3.0, 1.0);
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let density = dye(input.vUv);

    if (density < 0.05) {
      discard;
    }

    // One round dot per cell, jittered off the grid, as the artwork's stipple is.
    // Dots swell with density, so the body fills in and the edge thins out,
    // and thinning dye fades out rather than leaving strays.
    let cell = floor(input.position.xy / uniforms.uDotSize);
    let jitter = vec2f(hash(cell + 7.0), hash(cell + 13.0)) - 0.5;
    let local = fract(input.position.xy / uniforms.uDotSize) - 0.5 - jitter * 0.5;
    let centre = shape(input.vUv);
    let body = smoothstep(0.22, 0.6, centre) * smoothstep(0.05, 0.2, density);
    let speck = step(length(local), mix(0.26, 0.5, body)) * step(hash(cell), body);

    // Lit where the dye thins towards the sun, read over a wide reach so it
    // shades the cloud's mass rather than every curl the flow rolls into it,
    // and inked dot by dot: shade underneath, rose through the body, cream on
    // the crowns.
    let reach = uniforms.uLight * 16.0 / uniforms.uSize;
    let near = mass(input.vUv - reach) - mass(input.vUv + reach);
    let far = mass(input.vUv - reach * 2.0) - mass(input.vUv + reach * 2.0);
    let light = clamp(0.66 + (near + far * 0.5) * 0.7, 0.0, 1.0);
    let pick = hash(cell + 31.0);
    var color = select(uniforms.uColorShade, uniforms.uColorRose, pick < smoothstep(0.05, 0.4, light));

    color = select(color, uniforms.uColorCream, pick < smoothstep(0.45, 0.8, light));

    return vec4f(color, speck);
  }
```

`shaders/24-webgpu-wgsl.wgsl` (Built by lifelong learners, WGSL)

```wgsl
fn mod289(value: vec3f) -> vec3f {
    return value - floor(value / 289.0) * 289.0;
  }

  fn permute(value: vec3f) -> vec3f {
    return mod289(((value * 34.0) + 1.0) * value);
  }

  fn simplex(point: vec2f) -> f32 {
    let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var cell = floor(point + dot(point, C.yy));
    let x0 = point - cell + dot(cell, C.xx);
    let corner = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
    var x12 = x0.xyxy + C.xxzz;

    x12 = vec4f(x12.xy - corner, x12.zw);
    cell = cell - floor(cell / 289.0) * 289.0;

    let hashed = permute(permute(cell.y + vec3f(0.0, corner.y, 1.0)) + cell.x + vec3f(0.0, corner.x, 1.0));
    var falloff = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));

    falloff = falloff * falloff;
    falloff = falloff * falloff;

    let x = 2.0 * fract(hashed * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let a0 = x - floor(x + 0.5);

    falloff *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    let gradient = vec3f(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);

    return 130.0 * dot(falloff, gradient);
  }

  // Three octaves, remapped to 0..1.
  fn fbm(start: vec2f) -> f32 {
    var point = start;
    var sum = 0.0;
    var amplitude = 0.5;

    for (var octave = 0; octave < 3; octave++) {
      sum += amplitude * simplex(point);
      point *= 2.03;
      amplitude *= 0.5;
    }

    return sum * 0.5 + 0.5;
  }

  fn hash(point: vec2f) -> f32 {
    return fract(sin(dot(point, vec2f(127.1, 311.7))) * 43758.5453);
  }


  struct Uniforms {
    uBillow: vec2f,
    uDepth: f32,
    uDrift: f32,
    uFade: vec2f,
    uLight: vec2f,
    uOpacity: f32,
    uRect: vec4f,
    uRelief: f32,
    uReliefTexel: vec2f,
    uSeed: f32,
    uShine: f32,
    uSparkle: f32,
    uSparkleColor: vec3f,
    uStarGrid: vec2f,
    uSway: vec2f,
    uTime: f32,
    uViewport: vec2f,
  }

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) imageUv: vec2f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(1) @binding(0) var linearSampler: sampler;
  @group(1) @binding(1) var tImage: texture_2d<f32>;
  @group(1) @binding(2) var tRelief: texture_2d<f32>;

  // The grid's UVs are top-down, like the image's.
  @vertex
  fn vs(@location(0) uv: vec2f) -> VertexOutput {
    let relief = textureSampleLevel(tRelief, linearSampler, uv, 0.0).r;
    let depth = uniforms.uDepth + (relief - 0.5) * uniforms.uRelief;
    var point = uniforms.uRect.xy + uv * uniforms.uRect.zw - uniforms.uSway * depth;

    // Each layer hangs on its own slow phase.
    point += vec2f(sin(uniforms.uTime * 0.21 + uniforms.uSeed * 6.2831), sin(uniforms.uTime * 0.37 + uniforms.uSeed * 11.0)) * uniforms.uDrift;

    let clip = point / uniforms.uViewport * 2.0 - 1.0;
    var output: VertexOutput;

    output.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
    output.imageUv = uv;

    return output;
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.imageUv;
    let point = uv * 6.0 + uniforms.uSeed * 19.0;

    uv += (vec2f(fbm(point + uniforms.uTime * 0.11), fbm(point + 37.0 - uniforms.uTime * 0.09)) - 0.5) * uniforms.uBillow;

    var color = textureSample(tImage, linearSampler, uv);

    // Facets turned towards the pointer lift, those turned away settle.
    let left = textureSampleLevel(tRelief, linearSampler, uv - vec2f(uniforms.uReliefTexel.x, 0.0), 0.0).r;
    let right = textureSampleLevel(tRelief, linearSampler, uv + vec2f(uniforms.uReliefTexel.x, 0.0), 0.0).r;
    let up = textureSampleLevel(tRelief, linearSampler, uv - vec2f(0.0, uniforms.uReliefTexel.y), 0.0).r;
    let down = textureSampleLevel(tRelief, linearSampler, uv + vec2f(0.0, uniforms.uReliefTexel.y), 0.0).r;
    let slope = vec2f(left - right, up - down);

    color = vec4f(color.rgb * (1.0 + dot(slope, uniforms.uLight) * uniforms.uShine), color.a);

    // Stardust: a few cells of a grid pinned to the artwork light up in turn,
    // only where the glow is thin — the wake and the halo, never the body.
    let grid = uv * uniforms.uStarGrid;
    let cell = floor(grid);
    let star = hash(cell);
    let disc = 1.0 - smoothstep(0.22, 0.42, length(fract(grid) - 0.5));
    let pulse = pow(0.5 + 0.5 * sin(uniforms.uTime * (1.2 + star * 2.4) + star * 40.0), 8.0);
    let halo = smoothstep(0.04, 0.2, color.a) * (1.0 - smoothstep(0.45, 0.9, color.a));
    let glitter = smoothstep(0.9, 0.96, star) * disc * pulse * halo * uniforms.uSparkle;

    color += vec4f(uniforms.uSparkleColor, 1.0) * glitter;

    // The DOM image's edge mask, so the viaduct still recedes into the navy.
    color *= smoothstep(uniforms.uFade.x, uniforms.uFade.y, input.imageUv.x) * uniforms.uOpacity;

    return vec4f(min(color.rgb, vec3f(color.a)), min(color.a, 1.0));
  }
```

`shaders/25-webgpu-wgsl.wgsl` (Footer, WGSL)

```wgsl
struct Uniforms {
    uBackdropMap: vec4f,
    uCamera: vec3f,
    uGlow: vec3f,
    uNib: f32,
    uPathOpacity: f32,
    uPathProgress: f32,
    uPathRect: vec4f,
    uPen: vec2f,
    uRest: vec3f,
    uStars: array<vec4f, 16>,
    uSun: vec3f,
    uTime: f32,
    uTwinkle: f32,
    uWindow: vec4f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tBackdrop: texture_2d<f32>;
  @group(0) @binding(3) var tPath: texture_2d<f32>;
  @group(0) @binding(4) var tPathOrder: texture_2d<f32>;

  
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
  }

  @vertex
  fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;

    output.position = vec4f(position.xy, 0.0, 1.0);
    output.vUv = uv;

    return output;
  }

  
  // Where a world point lands in the illustration, top-down, as seen by the rest camera.
  fn restUv(point: vec3f) -> vec2f {
    let tangent = point.xy / -point.z;

    return vec2f(tangent.x / uniforms.uRest.x + 0.5, uniforms.uRest.z - tangent.y / uniforms.uRest.y);
  }

  // The world point on the rest camera's ray through an illustration pixel, at a depth.
  fn restPoint(uv: vec2f, depth: f32) -> vec3f {
    return vec3f((uv.x - 0.5) * uniforms.uRest.x, (uniforms.uRest.z - uv.y) * uniforms.uRest.y, -1.0) * depth;
  }

  // A point in view space to clip space, through the off-axis window.
  fn project(view: vec3f) -> vec4f {
    let w = -view.z;

    return vec4f(
      2.0 * (view.x - uniforms.uWindow.x * w) / (uniforms.uWindow.y - uniforms.uWindow.x) - w,
      2.0 * (view.y - uniforms.uWindow.z * w) / (uniforms.uWindow.w - uniforms.uWindow.z) - w,
      0.0,
      w
    );
  }


  // A four-point sparkle, like the illustration's, one star size across.
  fn sparkle(offset: vec2f) -> f32 {
    let spread = abs(offset);
    let arms = exp(-spread.x * 28.0) * max(0.0, 1.0 - spread.y) + exp(-spread.y * 28.0) * max(0.0, 1.0 - spread.x);

    return arms * 0.7 + exp(-length(offset) * 6.0) * 0.6;
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let direction = vec3f(mix(uniforms.uWindow.x, uniforms.uWindow.y, input.vUv.x), mix(uniforms.uWindow.z, uniforms.uWindow.w, input.vUv.y), -1.0);
    let ground = select(1e9, (-1.0 - uniforms.uCamera.y) / direction.y, direction.y < 0.0);
    let travel = select(600.0 + uniforms.uCamera.z, ground, ground - uniforms.uCamera.z < 600.0);
    let point = uniforms.uCamera + direction * travel;
    let uv = restUv(point);
    var color = textureSample(tBackdrop, linearSampler, uv * uniforms.uBackdropMap.xy + uniforms.uBackdropMap.zw).rgb;
    let aspect = uniforms.uRest.x / uniforms.uRest.y;
    let square = vec2f(aspect, 1.0);

    // Stars flare on their own slow beat. They live in illustration space, so
    // stars on the map move with the map.
    var light = 0.0;

    for (var index = 0; index < 16; index++) {
      let star = uniforms.uStars[index];
      let beat = pow(0.5 + 0.5 * sin(uniforms.uTime * (0.6 + star.w * 0.9) + star.w * 40.0), 6.0);

      light += sparkle((uv - star.xy) * square / max(star.z, 1e-4)) * beat;
    }

    // The sun breathes, and the nib glows where the route is being drawn.
    let sunDistance = length((uv - uniforms.uSun.xy) * square);
    let halo = exp(-max(sunDistance - uniforms.uSun.z, 0.0) / (uniforms.uSun.z * 1.4)) * (0.55 + 0.45 * sin(uniforms.uTime * 0.5));
    let nib = exp(-length((uv - uniforms.uPen) * square) * 90.0) * (0.65 + 0.35 * sin(uniforms.uTime * 2.6));

    let pathUv = (uv - uniforms.uPathRect.xy) / (uniforms.uPathRect.zw - uniforms.uPathRect.xy);
    let onPath = step(0.0, pathUv.x) * step(pathUv.x, 1.0) * step(0.0, pathUv.y) * step(pathUv.y, 1.0);
    let ink = textureSample(tPath, linearSampler, pathUv);
    let order = textureSample(tPathOrder, linearSampler, pathUv).r;
    let drawn = clamp((uniforms.uPathProgress * 1.08 - order) / 0.08, 0.0, 1.0);

    color = mix(color, ink.rgb, ink.a * drawn * onPath * uniforms.uPathOpacity);

    light = light * 0.55 * uniforms.uTwinkle + halo * 0.14 + nib * uniforms.uNib;
    color = mix(color, uniforms.uGlow, clamp(light, 0.0, 1.0));

    return vec4f(color, 1.0);
  }
```

`shaders/26-webgpu-wgsl.wgsl` (Footer, WGSL)

```wgsl
struct Uniforms {
    resolution: vec2f,
    uAspect: f32,
    uAtlasTexel: vec2f,
    uBillow: f32,
    uCamera: vec3f,
    uDisparityRange: f32,
    uDrift: f32,
    uFlutter: f32,
    uPush: vec2f,
    uRest: vec3f,
    uTime: f32,
    uWindow: vec4f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tShapes: texture_2d<f32>;
  @group(0) @binding(3) var tSprites: texture_2d<f32>;
  @group(0) @binding(4) var tVelocity: texture_2d<f32>;

  
  // Where a world point lands in the illustration, top-down, as seen by the rest camera.
  fn restUv(point: vec3f) -> vec2f {
    let tangent = point.xy / -point.z;

    return vec2f(tangent.x / uniforms.uRest.x + 0.5, uniforms.uRest.z - tangent.y / uniforms.uRest.y);
  }

  // The world point on the rest camera's ray through an illustration pixel, at a depth.
  fn restPoint(uv: vec2f, depth: f32) -> vec3f {
    return vec3f((uv.x - 0.5) * uniforms.uRest.x, (uniforms.uRest.z - uv.y) * uniforms.uRest.y, -1.0) * depth;
  }

  // A point in view space to clip space, through the off-axis window.
  fn project(view: vec3f) -> vec4f {
    let w = -view.z;

    return vec4f(
      2.0 * (view.x - uniforms.uWindow.x * w) / (uniforms.uWindow.y - uniforms.uWindow.x) - w,
      2.0 * (view.y - uniforms.uWindow.z * w) / (uniforms.uWindow.w - uniforms.uWindow.z) - w,
      0.0,
      w
    );
  }

  
  fn mod289(value: vec3f) -> vec3f {
    return value - floor(value / 289.0) * 289.0;
  }

  fn permute(value: vec3f) -> vec3f {
    return mod289(((value * 34.0) + 1.0) * value);
  }

  fn simplex(point: vec2f) -> f32 {
    let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var cell = floor(point + dot(point, C.yy));
    let x0 = point - cell + dot(cell, C.xx);
    let corner = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
    let x12 = x0.xyxy + C.xxzz - vec4f(corner, 0.0, 0.0);

    cell = cell - floor(cell / 289.0) * 289.0;

    let permuted = permute(permute(cell.y + vec3f(0.0, corner.y, 1.0)) + cell.x + vec3f(0.0, corner.x, 1.0));
    var falloff = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));

    falloff = falloff * falloff;
    falloff = falloff * falloff;

    let x = 2.0 * fract(permuted * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let a0 = x - floor(x + 0.5);

    falloff *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    let gradient = vec3f(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);

    return 130.0 * dot(falloff, gradient);
  }

  // Four octaves, remapped to 0..1.
  fn fbm(start: vec2f) -> f32 {
    var point = start;
    var sum = 0.0;
    var amplitude = 0.5;

    for (var octave = 0; octave < 4; octave++) {
      sum += amplitude * simplex(point);
      point *= 2.03;
      amplitude *= 0.5;
    }

    return sum * 0.5 + 0.5;
  }

  
  fn screenUv(position: vec4f) -> vec2f {
    return vec2f(position.x / uniforms.resolution.x, 1.0 - position.y / uniforms.resolution.y);
  }


  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vAtlasRect: vec4f,
    @location(1) vAtlasUv: vec2f,
    @location(2) vDistance: f32,
    @location(3) vIsAviator: f32,
    @location(4) vNearness: f32,
    @location(5) vRestUv: vec2f,
    @location(6) vSeed: f32,
  }

  @vertex
  fn vs(
    @location(0) atlasRect: vec4f,
    @location(1) atlasUv: vec2f,
    @location(2) imageUv: vec2f,
    @location(3) sprite: vec2f,
  ) -> VertexOutput {
    let disparity = max(textureSampleLevel(tShapes, linearSampler, atlasUv, 0.0).g * uniforms.uDisparityRange, 0.006);
    let depth = 1.0 / (uniforms.uRest.y * disparity);
    var point = restPoint(imageUv, depth);
    let seed = sprite.x;
    let isAviator = sprite.y;

    // Clouds drift on their own slow phases. The drift is scaled by depth, so
    // every cloud moves about as far on screen whatever its distance.
    let drift = (1.0 - isAviator) * uniforms.uDrift * depth;

    point.x += sin(uniforms.uTime * 0.06 + seed * 6.2831) * 0.006 * drift;
    point.y += sin(uniforms.uTime * 0.09 + seed * 11.0) * 0.002 * drift;

    let view = point - uniforms.uCamera;
    var output: VertexOutput;

    output.position = project(view);
    output.vAtlasRect = atlasRect;
    output.vAtlasUv = atlasUv;
    output.vDistance = -view.z;
    output.vIsAviator = isAviator;
    output.vNearness = clamp(disparity / uniforms.uDisparityRange, 0.0, 1.0);
    output.vRestUv = imageUv;
    output.vSeed = seed;

    return output;
  }

  fn clampToSprite(uv: vec2f, rect: vec4f) -> vec2f {
    return clamp(uv, rect.xy, rect.zw);
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let isCloud = 1.0 - input.vIsAviator;

    // Near clouds answer the fluid more than far ones. Screen space is
    // bottom-up and the atlas top-down, hence the flipped y.
    let velocity = textureSample(tVelocity, linearSampler, screenUv(input.position)).xy;
    let push = -velocity * uniforms.uPush * vec2f(1.0, -1.0) * isCloud * mix(0.35, 1.0, input.vNearness);

    // The scarf ripples, more towards its free end.
    let scarf = input.vIsAviator * (1.0 - smoothstep(0.05, 0.27, input.vRestUv.x)) * (1.0 - smoothstep(0.2, 0.26, input.vRestUv.y));
    let flutter = vec2f(0.0, sin(input.vRestUv.x * 48.0 - uniforms.uTime * 3.4) + 0.5 * sin(input.vRestUv.x * 97.0 - uniforms.uTime * 5.1)) * scarf * uniforms.uFlutter;

    let point = input.vRestUv * vec2f(uniforms.uAspect, 1.0) * 7.0 + input.vSeed * 19.0;
    let billow = (vec2f(fbm(point + uniforms.uTime * 0.11), fbm(point + 37.0 - uniforms.uTime * 0.09)) - 0.5) * uniforms.uBillow * isCloud;

    let colorUv = clampToSprite(input.vAtlasUv + (push + flutter) * uniforms.uAtlasTexel, input.vAtlasRect);
    let shapeUv = clampToSprite(input.vAtlasUv + (push + flutter + billow) * uniforms.uAtlasTexel, input.vAtlasRect);
    let color = textureSample(tSprites, linearSampler, colorUv).rgb;
    var alpha = textureSample(tShapes, linearSampler, shapeUv).r;

    // Clouds the camera flies into fade before they reach it.
    alpha *= smoothstep(0.3, 0.9, input.vDistance);

    return vec4f(color, alpha);
  }
```

`shaders/27-webgpu-wgsl.wgsl` (Footer, WGSL)

```wgsl
struct Uniforms {
    resolution: vec2f,
    uCamera: vec3f,
    uDisparity: f32,
    uHaze: vec3f,
    uHazeAmount: f32,
    uOffset: vec2f,
    uOpacity: f32,
    uPush: vec2f,
    uRect: vec4f,
    uRest: vec3f,
    uShadow: f32,
    uShadowColor: vec3f,
    uWindow: vec4f,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var linearSampler: sampler;
  @group(0) @binding(2) var tLogo: texture_2d<f32>;
  @group(0) @binding(3) var tVelocity: texture_2d<f32>;

  
  // Where a world point lands in the illustration, top-down, as seen by the rest camera.
  fn restUv(point: vec3f) -> vec2f {
    let tangent = point.xy / -point.z;

    return vec2f(tangent.x / uniforms.uRest.x + 0.5, uniforms.uRest.z - tangent.y / uniforms.uRest.y);
  }

  // The world point on the rest camera's ray through an illustration pixel, at a depth.
  fn restPoint(uv: vec2f, depth: f32) -> vec3f {
    return vec3f((uv.x - 0.5) * uniforms.uRest.x, (uniforms.uRest.z - uv.y) * uniforms.uRest.y, -1.0) * depth;
  }

  // A point in view space to clip space, through the off-axis window.
  fn project(view: vec3f) -> vec4f {
    let w = -view.z;

    return vec4f(
      2.0 * (view.x - uniforms.uWindow.x * w) / (uniforms.uWindow.y - uniforms.uWindow.x) - w,
      2.0 * (view.y - uniforms.uWindow.z * w) / (uniforms.uWindow.w - uniforms.uWindow.z) - w,
      0.0,
      w
    );
  }

  
  fn screenUv(position: vec4f) -> vec2f {
    return vec2f(position.x / uniforms.resolution.x, 1.0 - position.y / uniforms.resolution.y);
  }


  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) vUv: vec2f,
  }

  @vertex
  fn vs(@location(0) uv: vec2f) -> VertexOutput {
    let imageUv = mix(uniforms.uRect.xy, uniforms.uRect.zw, uv) + uniforms.uOffset;
    let point = restPoint(imageUv, 1.0 / (uniforms.uRest.y * uniforms.uDisparity));
    var output: VertexOutput;

    output.position = project(point - uniforms.uCamera);
    output.vUv = uv;

    return output;
  }

  // The pointer's flow pushes the lockup about like the clouds, a little less.
  // The shadow is the lockup's alpha from a blurry mip, in a deep shade ink.
  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let velocity = textureSample(tVelocity, linearSampler, screenUv(input.position)).xy;
    let uv = input.vUv - velocity * uniforms.uPush * vec2f(1.0, -1.0);

    if (uniforms.uShadow > 0.5) {
      return vec4f(uniforms.uShadowColor, textureSampleBias(tLogo, linearSampler, uv, 4.0).a * uniforms.uOpacity);
    }

    let logo = textureSample(tLogo, linearSampler, uv);

    // A touch of the shade's ink, so it sits in the air rather than on the glass.
    return vec4f(mix(logo.rgb, uniforms.uHaze, uniforms.uHazeAmount), logo.a * uniforms.uOpacity);
  }
```
