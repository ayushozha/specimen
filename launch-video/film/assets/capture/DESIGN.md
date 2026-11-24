# Apple: design spec

Captured from https://www.apple.com/ on 2026-11-24 by Specimen, at desktop 1440px, tablet 768px, mobile 390px.
Every value below was read from the live page; screenshots are the source of truth when a value and a screenshot disagree.

## Using this spec

- **Claude Code, Codex, Cursor and other repo agents:** keep this folder in the repo and refer to it, e.g. “Build the hero exactly as in `DESIGN.md`, section 2.” Screenshots and highlights sit next to it.
- **Chat agents (Claude, ChatGPT, Grok, Gemini):** paste this file and attach the section screenshots it names.
- Machine-readable tokens: `tokens.json`.

## Colours

| Role | Hex | Exact value | Variables | Uses |
| --- | --- | --- | --- | --- |
| background | `#ffffff` | `rgb(255, 255, 255)` | `--sk-body-background-color` `--sk-fill` | 29 |
| surface | `#f5f5f7` | `rgb(245, 245, 247)` | `--sk-fill-tertiary` | 71 |
| text | `#0066cc` | `rgb(0, 102, 204)` | `--sk-body-link-color` `--sk-glyph-blue` | 91 |
| text-muted | `#2997ff` | `rgb(41, 151, 255)` | – | 151 |
| accent | `#2997ff` | `rgb(41, 151, 255)` | – | 151 |
| border | `#0066cc` | `rgb(0, 102, 204)` | `--sk-body-link-color` `--sk-glyph-blue` | 91 |
| – | `#000000cc` | `rgba(0, 0, 0, 0.8)` | – | 174 |
| – | `#1d1d1f` | `rgb(29, 29, 31)` | `--sk-body-text-color` `--sk-fill-gray` | 167 |
| – | `#0000008f` | `rgba(0, 0, 0, 0.56)` | `--sk-glyph-gray-secondary-alpha` | 136 |
| – | `#000000b8` | `rgba(0, 0, 0, 0.72)` | `--sk-glyph-gray-secondary-alt-alpha` | 79 |
| – | `#000000` | `rgb(0, 0, 0)` | `--sk-focus-color-alt` `--sk-glyph` | 40 |
| – | `#00000099` | `rgba(0, 0, 0, 0.6)` | – | 32 |
| – | `#000000e0` | `rgba(0, 0, 0, 0.88)` | `--sk-fill-gray-alpha` `--sk-glyph-gray-alpha` | 23 |
| – | `#0000007a` | `rgba(0, 0, 0, 0.48)` | `--sk-fill-gray-secondary-alpha` `--sk-glyph-gray-tertiary-alpha` | 22 |
| – | `#1d1d1f66` | `rgba(29, 29, 31, 0.4)` | – | 18 |
| – | `#0071e3` | `rgb(0, 113, 227)` | `--sk-fill-blue` `--sk-focus-color` | 9 |
| – | `#00000080` | `rgba(0, 0, 0, 0.5)` | – | 9 |
| – | `#00000038` | `rgba(0, 0, 0, 0.22)` | – | 3 |

Gradients:
- `radial-gradient(100% 33% at 0% 100%, rgba(0, 0, 0, 0.5) 0%, rgba(255, 255, 255, 0))`
- `linear-gradient(rgba(29, 29, 31, 0.4) 0%, rgba(29, 29, 31, 0) 70px, rgba(29, 29, 31, 0) calc(100% - 70px), rgba(29, 29, 31, 0.4) 100%)`

Contrast: 1 text/background pairs are below WCAG AA (#f5f5f7 on #a5b8c3 1.88:1).

## Typography

Fonts: `SF Pro Text`, `SF Pro Display`.

| Font | Size / line height | Weight | Letter spacing | Uses |
| --- | --- | --- | --- | --- |
| SF Pro Display | 40px / 44px | 600 | 0 | 6 |
| SF Pro Display | 28px / 32px | 400 | 0.2px | 4 |
| SF Pro Display | 21px / 25px | 700 | 0.23px | 7 |
| SF Pro Display | 21px / 25px | 400 | 0.23px | 16 |
| SF Pro Text | 17px / 20px | 400 | -0.37px | 15 |
| SF Pro Text | 17px / 25px | 400 | -0.37px | 7 |
| SF Pro Text | 14px / 18px | 600 | -0.22px | 9 |
| SF Pro Text | 14px / 18px | 400 | -0.22px | 19 |
| SF Pro Text | 12px / 16px | 600 | -0.12px | 11 |
| SF Pro Text | 12px / 16px | 400 | -0.12px | 97 |

## Shape and spacing

- Corner radius: `980px` (34×), `8px` (3×), `999px` (1×), `50px` (1×)
- Shadows: `3px 5px 30px 0px #00000038`
- Spacing in use (gaps and padding): 8px, 15px, 16px, 19px, 40px, 48px, 53px, 56px, 60px, 63px

## Sections

### 1. Global

1440×44 at desktop. Background `#ffffff`.

![Global](screenshots/01-global.png)

Responsive: [tablet](screenshots/01-global-tablet.png) · [mobile](screenshots/01-global-mobile.png)

Numbered highlights: ![Global, highlighted](highlights/01-global.png)

1. **Heading “Apple”** at 239,12
   - font: SF Pro Text 600, 17px/21px, letter-spacing -0.37px
   - colour: #000000cc

Motion and interaction:

- animation: `#globalnav-submenu-search > div > div > div > div > div > h2`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 200ms, linear
- animation: `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(1)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 220ms, linear
- animation: `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(2)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 240ms, linear
- animation: `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(3)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 260ms, linear
- animation: `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(4)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 280ms, linear
- animation: `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(5)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 300ms, linear
- hover: `Apple`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (color 320ms cubic-bezier(0.4, 0, 0.6, 1))
- focus: `Apple`: border-bottom-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98); border-left-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98); border-right-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98); border-top-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98) (instant)
- hover: `Store`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (color 320ms cubic-bezier(0.4, 0, 0.6, 1))
- focus: `Store`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (instant)
- hover: `Mac`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (color 320ms cubic-bezier(0.4, 0, 0.6, 1))
- focus: `Mac`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (instant)

### 2. iPhone

1440×2100 at desktop. Background `#ffffff`.

![iPhone](screenshots/02-iphone.png)

Responsive: [tablet](screenshots/02-iphone-tablet.png) · [mobile](screenshots/02-iphone-mobile.png)

Numbered highlights: ![iPhone, highlighted](highlights/02-iphone.png)

1. **Image 3008×692** at -784,0
   - size: 3008×692
   - fit: fill
2. **Card (×3, same size) “iPhone”** at 0,0
   - size: 1440×692
   - background: #f5f5f7
   - layout: row, gap 0px, padding 56px 0px 63px 0px, align normal, justify center
   - font: SF Pro Display 600, 56px/60px, letter-spacing -0.28px
   - colour: #1d1d1f, align center
3. **Heading “iPhone”** at 635,52
   - font: SF Pro Display 600, 56px/60px, letter-spacing -0.28px
   - colour: #1d1d1f, align center
4. **Body text “Meet the most powerful iPhone lineup ev…”** at 466,121
   - font: SF Pro Display 400, 28px/32px, letter-spacing 0.2px
   - colour: #1d1d1f, align center
5. **Button “Learn more”** at 576,171
   - size: 131×44
   - background: #0071e3
   - radius: 980px
   - font: SF Pro Text 400, 17px/20px, letter-spacing -0.37px
   - colour: #ffffff, align center
6. **Button “Shop iPhone”** at 724,171
   - size: 141×44
   - radius: 980px
   - border: 1px #0066cc
   - font: SF Pro Text 400, 17px/20px, letter-spacing -0.37px
   - colour: #0066cc, align center
7. **Image 3008×692** at -784,704
   - size: 3008×692
   - fit: fill
8. **Heading “MacBook Neo”** at 549,756
   - font: SF Pro Display 600, 56px/60px, letter-spacing -0.28px
   - colour: #1d1d1f, align center

Motion and interaction:

- animation: `picture`: transform none → , changes over time
- animation: `picture`: opacity 1 → , changes over time
- animation: `picture`: filter none → , changes over time
- animation: `picture`: clip-path none → , changes over time
- animation: `picture`: translate none → , changes over time
- animation: `picture`: scale none → , changes over time
- animation: `picture`: rotate none → , changes over time
- animation: `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture`: color rgb(29, 29, 31) → , changes over time
- animation: `picture`: top auto → , changes over time
- animation: `picture`: left auto → , changes over time
- animation: `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- animation: `picture > img`: opacity 1 → , changes over time
- animation: `picture > img`: filter none → , changes over time
- animation: `picture > img`: clip-path none → , changes over time
- animation: `picture > img`: translate none → , changes over time
- animation: `picture > img`: scale none → , changes over time
- animation: `picture > img`: rotate none → , changes over time
- animation: `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture > img`: color rgb(29, 29, 31) → , changes over time
- animation: `picture > img`: top 0px → , changes over time
- animation: `picture > img`: left 351px → , changes over time
- animation: `picture`: transform none → , changes over time
- animation: `picture`: opacity 1 → , changes over time
- animation: `picture`: filter none → , changes over time
- animation: `picture`: clip-path none → , changes over time
- animation: `picture`: translate none → , changes over time
- animation: `picture`: scale none → , changes over time
- animation: `picture`: rotate none → , changes over time
- animation: `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture`: color rgb(29, 29, 31) → , changes over time
- animation: `picture`: top auto → , changes over time
- animation: `picture`: left auto → , changes over time
- animation: `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- animation: `picture > img`: opacity 1 → , changes over time
- animation: `picture > img`: filter none → , changes over time
- animation: `picture > img`: clip-path none → , changes over time
- animation: `picture > img`: translate none → , changes over time
- animation: `picture > img`: scale none → , changes over time
- animation: `picture > img`: rotate none → , changes over time
- animation: `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture > img`: color rgb(29, 29, 31) → , changes over time
- animation: `picture > img`: top 0px → , changes over time
- animation: `picture > img`: left 351px → , changes over time
- animation: `picture`: transform none → , changes over time
- animation: `picture`: opacity 1 → , changes over time
- animation: `picture`: filter none → , changes over time
- animation: `picture`: clip-path none → , changes over time
- animation: `picture`: translate none → , changes over time
- animation: `picture`: scale none → , changes over time
- animation: `picture`: rotate none → , changes over time
- animation: `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture`: color rgb(29, 29, 31) → , changes over time
- animation: `picture`: top auto → , changes over time
- animation: `picture`: left auto → , changes over time
- animation: `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- animation: `picture > img`: opacity 1 → , changes over time
- animation: `picture > img`: filter none → , changes over time
- animation: `picture > img`: clip-path none → , changes over time
- animation: `picture > img`: translate none → , changes over time
- animation: `picture > img`: scale none → , changes over time
- animation: `picture > img`: rotate none → , changes over time
- animation: `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture > img`: color rgb(29, 29, 31) → , changes over time
- animation: `picture > img`: top 0px → , changes over time
- animation: `picture > img`: left 351px → , changes over time
- animation: `picture`: transform none → , changes over time
- animation: `picture`: opacity 1 → , changes over time
- animation: `picture`: filter none → , changes over time
- animation: `picture`: clip-path none → , changes over time
- animation: `picture`: translate none → , changes over time
- animation: `picture`: scale none → , changes over time
- animation: `picture`: rotate none → , changes over time
- animation: `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture`: color rgb(29, 29, 31) → , changes over time
- animation: `picture`: top auto → , changes over time
- animation: `picture`: left auto → , changes over time
- animation: `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- animation: `picture > img`: opacity 1 → , changes over time
- animation: `picture > img`: filter none → , changes over time
- animation: `picture > img`: clip-path none → , changes over time
- animation: `picture > img`: translate none → , changes over time
- animation: `picture > img`: scale none → , changes over time
- animation: `picture > img`: rotate none → , changes over time
- animation: `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture > img`: color rgb(29, 29, 31) → , changes over time
- animation: `picture > img`: top 0px → , changes over time
- animation: `picture > img`: left 351px → , changes over time
- animation: `picture`: transform none → , changes over time
- animation: `picture`: opacity 1 → , changes over time
- animation: `picture`: filter none → , changes over time
- animation: `picture`: clip-path none → , changes over time
- animation: `picture`: translate none → , changes over time
- animation: `picture`: scale none → , changes over time
- animation: `picture`: rotate none → , changes over time
- animation: `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture`: color rgb(29, 29, 31) → , changes over time
- animation: `picture`: top auto → , changes over time
- animation: `picture`: left auto → , changes over time
- animation: `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- animation: `picture > img`: opacity 1 → , changes over time
- animation: `picture > img`: filter none → , changes over time
- animation: `picture > img`: clip-path none → , changes over time
- animation: `picture > img`: translate none → , changes over time
- animation: `picture > img`: scale none → , changes over time
- animation: `picture > img`: rotate none → , changes over time
- animation: `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- animation: `picture > img`: color rgb(29, 29, 31) → , changes over time
- animation: `picture > img`: top 0px → , changes over time
- animation: `picture > img`: left 351px → , changes over time
- hover: `Learn more, iPhone`: background-color rgb(0, 113, 227) → rgb(0, 118, 223) (instant)
- focus: `Learn more, iPhone`: outline-color rgb(255, 255, 255) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)
- hover: `Shop iPhone`: background-color rgba(0, 0, 0, 0) → rgb(0, 118, 223); border-bottom-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-left-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-right-color rgb(0, 102, 204) → rgba(0, 0, 0, 0) (instant)
- focus: `Shop iPhone`: outline-color rgb(0, 102, 204) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)
- hover: `Learn more, MacBook Neo 13-inch`: background-color rgb(0, 113, 227) → rgb(0, 118, 223) (instant)
- focus: `Learn more, MacBook Neo 13-inch`: outline-color rgb(255, 255, 255) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)
- hover: `Buy, MacBook Neo 13-inch`: background-color rgba(0, 0, 0, 0) → rgb(0, 118, 223); border-bottom-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-left-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-right-color rgb(0, 102, 204) → rgba(0, 0, 0, 0) (instant)
- focus: `Buy, MacBook Neo 13-inch`: outline-color rgb(0, 102, 204) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)
- Recording: [motion/02-iphone.mp4](motion/02-iphone.mp4)

### 3. Gifts they’ll love.

1440×1764 at desktop. Background `#ffffff`.

![Gifts they’ll love.](screenshots/03-gifts-they-ll-love.png)

Responsive: [tablet](screenshots/03-gifts-they-ll-love-tablet.png) · [mobile](screenshots/03-gifts-they-ll-love-mobile.png)

Numbered highlights: ![Gifts they’ll love., highlighted](highlights/03-gifts-they-ll-love.png)

1. **Image 1262×580** at -268,0
   - size: 1262×580
   - fit: fill
2. **Card (×6, same size) “Gifts they’ll love.”** at 12,0
   - size: 702×580
   - background: #822704
   - layout: row, gap 0px, padding 53px 0px 60px 0px, align normal, justify center
   - font: SF Pro Display 600, 40px/44px
   - colour: #f5f5f7, align center
3. **Heading “iPad”** at 1039,51
   - font: SF Pro Display 600, 40px/44px
   - colour: #1d1d1f, align center
4. **Button “Learn more”** at 988,162
   - size: 104×36
   - background: #0071e3
   - radius: 980px
   - font: SF Pro Text 400, 14px/18px, letter-spacing -0.22px
   - colour: #ffffff, align center
5. **Button “Buy”** at 1106,162
   - size: 60×36
   - radius: 980px
   - border: 1px #0066cc
   - font: SF Pro Text 400, 14px/18px, letter-spacing -0.22px
   - colour: #0066cc, align center
6. **Heading “Gifts they’ll love.”** at 220,398
   - font: SF Pro Display 600, 40px/44px
   - colour: #f5f5f7, align center
7. **Body text “Find their perfect match this holiday.”** at 202,447
   - font: SF Pro Display 400, 21px/25px, letter-spacing 0.23px
   - colour: #f5f5f7, align center

No motion or hover effects found in this section.

### 4. Endless entertainment.

1440×957 at desktop. Background `#ffffff`.

![Endless entertainment.](screenshots/04-endless-entertainment.png)

Responsive: [tablet](screenshots/04-endless-entertainment-tablet.png) · [mobile](screenshots/04-endless-entertainment-mobile.png)

Numbered highlights: ![Endless entertainment., highlighted](highlights/04-endless-entertainment.png)

1. **Heading “Endless entertainment.”** at 439,49
   - font: SF Pro Display 600, 56px/60px, letter-spacing -0.28px
   - colour: #000000, align center
2. **Image 930×523** at -688,139
   - size: 930×523
   - fit: cover
3. **Image 930×523** at 255,139
   - size: 930×523
   - fit: cover
4. **Button “Stream now”** at 1246,575
   - size: 135×44
   - background: #f5f5f7
   - radius: 980px
   - font: SF Pro Text 400, 17px/20px, letter-spacing -0.37px
   - colour: #000000, align center
5. **Button “MLS on Apple TV”** at -640,578
   - size: 177×44
   - background: #f5f5f7
   - radius: 980px
   - font: SF Pro Text 400, 17px/20px, letter-spacing -0.37px
   - colour: #000000, align center
6. **Button “Stream now”** at 303,578
   - size: 135×44
   - background: #f5f5f7
   - radius: 980px
   - font: SF Pro Text 400, 17px/20px, letter-spacing -0.37px
   - colour: #000000, align center
7. **Body text “Watch every club, every match, live—all…”** at -445,588
   - font: SF Pro Display 400, 21px/25px, letter-spacing 0.23px
   - colour: #f5f5f7
8. **Heading “Comedy”** at 456,588
   - font: SF Pro Display 700, 21px/25px, letter-spacing 0.23px
   - colour: #f5f5f7

Motion and interaction:

- animation: `#endless-entertainment-gallery-item-1-trigger`: animation “dotnav-timed-animation” of width, 4160ms after 840ms, linear
- reveal: `body > main > section:nth-of-type(4) > div > div:nth-of-type(2) > button > span > svg:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 0) → matrix(1, 0, 0, 1, 0, 0), plays once as it scrolls into view
- hover: `MLS on Apple TV`: background-color rgb(245, 245, 247) → rgb(255, 255, 255) (instant)
- hover: `Item 2`: background-color rgba(0, 0, 0, 0.48) → rgba(0, 0, 0, 0.72) (instant)
- Recording: [motion/04-endless-entertainment.mp4](motion/04-endless-entertainment.mp4)

### 5. Apple Footer

1440×1069 at desktop. Background `#ffffff`.

![Apple Footer](screenshots/05-apple-footer.png)

Responsive: [tablet](screenshots/05-apple-footer-tablet.png) · [mobile](screenshots/05-apple-footer-mobile.png)

Numbered highlights: ![Apple Footer, highlighted](highlights/05-apple-footer.png)

1. **Body text “Offer valid on qualifying purchases of …”** at 230,18
   - font: SF Pro Text 400, 12px/16px, letter-spacing -0.12px
   - colour: #0000008f
2. **Heading “Shop and Learn”** at 230,504
   - font: SF Pro Text 600, 12px/16px, letter-spacing -0.12px
   - colour: #000000e0
3. **Heading “Apple Wallet”** at 230,826
   - font: SF Pro Text 600, 12px/16px, letter-spacing -0.12px
   - colour: #000000e0

Motion and interaction:

- hover: `Store`: text-decoration-line none → underline (instant)
- focus: `Store`: outline-offset 0px → 1px (instant)
- hover: `Mac`: text-decoration-line none → underline (instant)
- focus: `Mac`: outline-offset 0px → 1px (instant)
- focus: `United States (English). Choose your cou`: outline-offset 0px → 1px (instant)
- focus: `Esta página está disponible en Español`: outline-offset 0px → 1px (instant)
- focus: `Privacy Policy`: outline-offset 0px → 1px (instant)
- focus: `Terms of Use`: outline-offset 0px → 1px (instant)
- Recording: [motion/05-apple-footer.mp4](motion/05-apple-footer.mp4)

## Stack

No frameworks or libraries detected.

## Motion

### Global

- **animation** `#globalnav-submenu-search > div > div > div > div > div > h2`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 200ms, linear
- **animation** `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(1)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 220ms, linear
- **animation** `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(2)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 240ms, linear
- **animation** `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(3)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 260ms, linear
- **animation** `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(4)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 280ms, linear
- **animation** `#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(5)`: animation “globalnav-search-fade-and-slide” of opacity, transform, 320ms after 300ms, linear
- **hover** `Apple`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (color 320ms cubic-bezier(0.4, 0, 0.6, 1))
- **focus** `Apple`: border-bottom-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98); border-left-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98); border-right-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98); border-top-color rgba(0, 0, 0, 0.8) → rgba(0, 0, 0, 0.98) (instant)
- **hover** `Store`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (color 320ms cubic-bezier(0.4, 0, 0.6, 1))
- **focus** `Store`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (instant)
- **hover** `Mac`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (color 320ms cubic-bezier(0.4, 0, 0.6, 1))
- **focus** `Mac`: border-bottom-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-left-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-right-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0); border-top-color rgba(0, 0, 0, 0.8) → rgb(0, 0, 0) (instant)

### iPhone

- **animation** `picture`: transform none → , changes over time
- **animation** `picture`: opacity 1 → , changes over time
- **animation** `picture`: filter none → , changes over time
- **animation** `picture`: clip-path none → , changes over time
- **animation** `picture`: translate none → , changes over time
- **animation** `picture`: scale none → , changes over time
- **animation** `picture`: rotate none → , changes over time
- **animation** `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture`: top auto → , changes over time
- **animation** `picture`: left auto → , changes over time
- **animation** `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- **animation** `picture > img`: opacity 1 → , changes over time
- **animation** `picture > img`: filter none → , changes over time
- **animation** `picture > img`: clip-path none → , changes over time
- **animation** `picture > img`: translate none → , changes over time
- **animation** `picture > img`: scale none → , changes over time
- **animation** `picture > img`: rotate none → , changes over time
- **animation** `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture > img`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture > img`: top 0px → , changes over time
- **animation** `picture > img`: left 351px → , changes over time
- **animation** `picture`: transform none → , changes over time
- **animation** `picture`: opacity 1 → , changes over time
- **animation** `picture`: filter none → , changes over time
- **animation** `picture`: clip-path none → , changes over time
- **animation** `picture`: translate none → , changes over time
- **animation** `picture`: scale none → , changes over time
- **animation** `picture`: rotate none → , changes over time
- **animation** `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture`: top auto → , changes over time
- **animation** `picture`: left auto → , changes over time
- **animation** `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- **animation** `picture > img`: opacity 1 → , changes over time
- **animation** `picture > img`: filter none → , changes over time
- **animation** `picture > img`: clip-path none → , changes over time
- **animation** `picture > img`: translate none → , changes over time
- **animation** `picture > img`: scale none → , changes over time
- **animation** `picture > img`: rotate none → , changes over time
- **animation** `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture > img`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture > img`: top 0px → , changes over time
- **animation** `picture > img`: left 351px → , changes over time
- **animation** `picture`: transform none → , changes over time
- **animation** `picture`: opacity 1 → , changes over time
- **animation** `picture`: filter none → , changes over time
- **animation** `picture`: clip-path none → , changes over time
- **animation** `picture`: translate none → , changes over time
- **animation** `picture`: scale none → , changes over time
- **animation** `picture`: rotate none → , changes over time
- **animation** `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture`: top auto → , changes over time
- **animation** `picture`: left auto → , changes over time
- **animation** `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- **animation** `picture > img`: opacity 1 → , changes over time
- **animation** `picture > img`: filter none → , changes over time
- **animation** `picture > img`: clip-path none → , changes over time
- **animation** `picture > img`: translate none → , changes over time
- **animation** `picture > img`: scale none → , changes over time
- **animation** `picture > img`: rotate none → , changes over time
- **animation** `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture > img`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture > img`: top 0px → , changes over time
- **animation** `picture > img`: left 351px → , changes over time
- **animation** `picture`: transform none → , changes over time
- **animation** `picture`: opacity 1 → , changes over time
- **animation** `picture`: filter none → , changes over time
- **animation** `picture`: clip-path none → , changes over time
- **animation** `picture`: translate none → , changes over time
- **animation** `picture`: scale none → , changes over time
- **animation** `picture`: rotate none → , changes over time
- **animation** `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture`: top auto → , changes over time
- **animation** `picture`: left auto → , changes over time
- **animation** `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- **animation** `picture > img`: opacity 1 → , changes over time
- **animation** `picture > img`: filter none → , changes over time
- **animation** `picture > img`: clip-path none → , changes over time
- **animation** `picture > img`: translate none → , changes over time
- **animation** `picture > img`: scale none → , changes over time
- **animation** `picture > img`: rotate none → , changes over time
- **animation** `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture > img`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture > img`: top 0px → , changes over time
- **animation** `picture > img`: left 351px → , changes over time
- **animation** `picture`: transform none → , changes over time
- **animation** `picture`: opacity 1 → , changes over time
- **animation** `picture`: filter none → , changes over time
- **animation** `picture`: clip-path none → , changes over time
- **animation** `picture`: translate none → , changes over time
- **animation** `picture`: scale none → , changes over time
- **animation** `picture`: rotate none → , changes over time
- **animation** `picture`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture`: top auto → , changes over time
- **animation** `picture`: left auto → , changes over time
- **animation** `picture > img`: transform matrix(1, 0, 0, 1, -290, 0) → , changes over time
- **animation** `picture > img`: opacity 1 → , changes over time
- **animation** `picture > img`: filter none → , changes over time
- **animation** `picture > img`: clip-path none → , changes over time
- **animation** `picture > img`: translate none → , changes over time
- **animation** `picture > img`: scale none → , changes over time
- **animation** `picture > img`: rotate none → , changes over time
- **animation** `picture > img`: background-color rgba(0, 0, 0, 0) → , changes over time
- **animation** `picture > img`: color rgb(29, 29, 31) → , changes over time
- **animation** `picture > img`: top 0px → , changes over time
- **animation** `picture > img`: left 351px → , changes over time
- **hover** `Learn more, iPhone`: background-color rgb(0, 113, 227) → rgb(0, 118, 223) (instant)
- **focus** `Learn more, iPhone`: outline-color rgb(255, 255, 255) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)
- **hover** `Shop iPhone`: background-color rgba(0, 0, 0, 0) → rgb(0, 118, 223); border-bottom-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-left-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-right-color rgb(0, 102, 204) → rgba(0, 0, 0, 0) (instant)
- **focus** `Shop iPhone`: outline-color rgb(0, 102, 204) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)
- **hover** `Learn more, MacBook Neo 13-inch`: background-color rgb(0, 113, 227) → rgb(0, 118, 223) (instant)
- **focus** `Learn more, MacBook Neo 13-inch`: outline-color rgb(255, 255, 255) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)
- **hover** `Buy, MacBook Neo 13-inch`: background-color rgba(0, 0, 0, 0) → rgb(0, 118, 223); border-bottom-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-left-color rgb(0, 102, 204) → rgba(0, 0, 0, 0); border-right-color rgb(0, 102, 204) → rgba(0, 0, 0, 0) (instant)
- **focus** `Buy, MacBook Neo 13-inch`: outline-color rgb(0, 102, 204) → rgb(0, 113, 227); outline-offset 0px → 3px; outline-width 3px → 2px (instant)

### Endless entertainment.

- **animation** `#endless-entertainment-gallery-item-1-trigger`: animation “dotnav-timed-animation” of width, 4160ms after 840ms, linear
- **reveal** `body > main > section:nth-of-type(4) > div > div:nth-of-type(2) > button > span > svg:nth-of-type(2)`: transform matrix(1, 0, 0, 1, 0, 0) → matrix(1, 0, 0, 1, 0, 0), plays once as it scrolls into view
- **hover** `MLS on Apple TV`: background-color rgb(245, 245, 247) → rgb(255, 255, 255) (instant)
- **hover** `Item 2`: background-color rgba(0, 0, 0, 0.48) → rgba(0, 0, 0, 0.72) (instant)

### Apple Footer

- **hover** `Store`: text-decoration-line none → underline (instant)
- **focus** `Store`: outline-offset 0px → 1px (instant)
- **hover** `Mac`: text-decoration-line none → underline (instant)
- **focus** `Mac`: outline-offset 0px → 1px (instant)
- **focus** `United States (English). Choose your cou`: outline-offset 0px → 1px (instant)
- **focus** `Esta página está disponible en Español`: outline-offset 0px → 1px (instant)
- **focus** `Privacy Policy`: outline-offset 0px → 1px (instant)
- **focus** `Terms of Use`: outline-offset 0px → 1px (instant)

## Effect code

`01-global.css`

```css
/* Generated by Specimen. */

/* globalnav-search-fade-and-slide: the page's own keyframes and timing */
@keyframes fx-01-global-1 {
  0% { opacity: 0; transform: translateY(-4px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  100% { opacity: 1; transform: translateY(0px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
}
#globalnav-submenu-search > div > div > div > div > div > h2 {
  animation: fx-01-global-1 320ms linear 200ms 1 normal both;
}

/* globalnav-search-fade-and-slide: the page's own keyframes and timing */
@keyframes fx-01-global-2 {
  0% { opacity: 0; transform: translateY(-4px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  100% { opacity: 1; transform: translateY(0px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
}
#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(1) {
  animation: fx-01-global-2 320ms linear 220ms 1 normal both;
}

/* globalnav-search-fade-and-slide: the page's own keyframes and timing */
@keyframes fx-01-global-3 {
  0% { opacity: 0; transform: translateY(-4px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  100% { opacity: 1; transform: translateY(0px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
}
#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(2) {
  animation: fx-01-global-3 320ms linear 240.00000000000003ms 1 normal both;
}

/* globalnav-search-fade-and-slide: the page's own keyframes and timing */
@keyframes fx-01-global-4 {
  0% { opacity: 0; transform: translateY(-4px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  100% { opacity: 1; transform: translateY(0px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
}
#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(3) {
  animation: fx-01-global-4 320ms linear 260ms 1 normal both;
}

/* globalnav-search-fade-and-slide: the page's own keyframes and timing */
@keyframes fx-01-global-5 {
  0% { opacity: 0; transform: translateY(-4px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  100% { opacity: 1; transform: translateY(0px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
}
#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(4) {
  animation: fx-01-global-5 320ms linear 280ms 1 normal both;
}

/* globalnav-search-fade-and-slide: the page's own keyframes and timing */
@keyframes fx-01-global-6 {
  0% { opacity: 0; transform: translateY(-4px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
  100% { opacity: 1; transform: translateY(0px); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
}
#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(5) {
  animation: fx-01-global-6 320ms linear 300.00000000000006ms 1 normal both;
}

/* Apple: hover, with the page's computed values and transition */
#globalnav-list > li:nth-of-type(1) > a {
  transition: color 320ms cubic-bezier(0.4, 0, 0.6, 1);
}
#globalnav-list > li:nth-of-type(1) > a:hover {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(1) > a:hover > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(1) > a:hover > :nth-child(2) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(1) > a:hover > :nth-child(2) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(1) > a:hover > :nth-child(2) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(1) > a:hover > :nth-child(3) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}

/* Store: hover, with the page's computed values and transition */
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a {
  transition: color 320ms cubic-bezier(0.4, 0, 0.6, 1);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(2) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(2) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(2) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(1) > ul > li:nth-of-type(1) > a:hover > :nth-child(2) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}

/* Mac: hover, with the page's computed values and transition */
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a {
  transition: color 320ms cubic-bezier(0.4, 0, 0.6, 1);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(1) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(1) > :nth-child(2) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(2) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(2) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
#globalnav-list > li:nth-of-type(2) > div > div > div:nth-of-type(2) > ul > li:nth-of-type(1) > a:hover > :nth-child(2) > :nth-child(1) > :nth-child(1) {
  border-bottom-color: rgb(0, 0, 0);
  border-left-color: rgb(0, 0, 0);
  border-right-color: rgb(0, 0, 0);
  border-top-color: rgb(0, 0, 0);
  color: rgb(0, 0, 0);
  outline-color: rgb(0, 0, 0);
  text-decoration-color: rgb(0, 0, 0);
}
```

`01-global.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// globalnav-search-fade-and-slide
CustomEase.create("fx-01-global-1-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
gsap.set("#globalnav-submenu-search > div > div > div > div > div > h2", {"opacity":0,"y":-4});
gsap.timeline({ delay: 0.2 })
  .to("#globalnav-submenu-search > div > div > div > div > div > h2", {"opacity":1,"y":0,"duration":0.32, "ease": "fx-01-global-1-0_4-0-0_6-1" });

// globalnav-search-fade-and-slide
CustomEase.create("fx-01-global-2-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
gsap.set("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(1)", {"opacity":0,"y":-4});
gsap.timeline({ delay: 0.22 })
  .to("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(1)", {"opacity":1,"y":0,"duration":0.32, "ease": "fx-01-global-2-0_4-0-0_6-1" });

// globalnav-search-fade-and-slide
CustomEase.create("fx-01-global-3-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
gsap.set("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(2)", {"opacity":0,"y":-4});
gsap.timeline({ delay: 0.24 })
  .to("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(2)", {"opacity":1,"y":0,"duration":0.32, "ease": "fx-01-global-3-0_4-0-0_6-1" });

// globalnav-search-fade-and-slide
CustomEase.create("fx-01-global-4-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
gsap.set("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(3)", {"opacity":0,"y":-4});
gsap.timeline({ delay: 0.26 })
  .to("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(3)", {"opacity":1,"y":0,"duration":0.32, "ease": "fx-01-global-4-0_4-0-0_6-1" });

// globalnav-search-fade-and-slide
CustomEase.create("fx-01-global-5-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
gsap.set("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(4)", {"opacity":0,"y":-4});
gsap.timeline({ delay: 0.28 })
  .to("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(4)", {"opacity":1,"y":0,"duration":0.32, "ease": "fx-01-global-5-0_4-0-0_6-1" });

// globalnav-search-fade-and-slide
CustomEase.create("fx-01-global-6-0_4-0-0_6-1", "M0,0 C0.4,0 0.6,1 1,1");
gsap.set("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(5)", {"opacity":0,"y":-4});
gsap.timeline({ delay: 0.3 })
  .to("#globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(5)", {"opacity":1,"y":0,"duration":0.32, "ease": "fx-01-global-6-0_4-0-0_6-1" });
```

`01-global.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { motion, useScroll, useTransform } from "motion/react";

// globalnav-search-fade-and-slide — #globalnav-submenu-search > div > div > div > div > div > h2
export function GlobalnavSearchFadeAndSlide(props) {
  return <motion.div {...props} animate={{"opacity":[0,1],"y":[-4,0]}} transition={{"duration":0.32,"delay":0.2,"times":[0,1],"ease":[[0.4,0,0.6,1]]}} />;
}

// globalnav-search-fade-and-slide — #globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(1)
export function GlobalnavSearchFadeAndSlide(props) {
  return <motion.div {...props} animate={{"opacity":[0,1],"y":[-4,0]}} transition={{"duration":0.32,"delay":0.22,"times":[0,1],"ease":[[0.4,0,0.6,1]]}} />;
}

// globalnav-search-fade-and-slide — #globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(2)
export function GlobalnavSearchFadeAndSlide(props) {
  return <motion.div {...props} animate={{"opacity":[0,1],"y":[-4,0]}} transition={{"duration":0.32,"delay":0.24000000000000002,"times":[0,1],"ease":[[0.4,0,0.6,1]]}} />;
}

// globalnav-search-fade-and-slide — #globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(3)
export function GlobalnavSearchFadeAndSlide(props) {
  return <motion.div {...props} animate={{"opacity":[0,1],"y":[-4,0]}} transition={{"duration":0.32,"delay":0.26,"times":[0,1],"ease":[[0.4,0,0.6,1]]}} />;
}

// globalnav-search-fade-and-slide — #globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(4)
export function GlobalnavSearchFadeAndSlide(props) {
  return <motion.div {...props} animate={{"opacity":[0,1],"y":[-4,0]}} transition={{"duration":0.32,"delay":0.28,"times":[0,1],"ease":[[0.4,0,0.6,1]]}} />;
}

// globalnav-search-fade-and-slide — #globalnav-submenu-search > div > div > div > div > div > ul > li:nth-of-type(5)
export function GlobalnavSearchFadeAndSlide(props) {
  return <motion.div {...props} animate={{"opacity":[0,1],"y":[-4,0]}} transition={{"duration":0.32,"delay":0.30000000000000004,"times":[0,1],"ease":[[0.4,0,0.6,1]]}} />;
}
```

`02-iphone.css`

```css
/* Generated by Specimen. */

/* Learn more, iPhone: hover, with the page's computed values and transition */
body > main > section:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > a:nth-of-type(1):hover {
  background-color: rgb(0, 118, 223);
}

/* Shop iPhone: hover, with the page's computed values and transition */
body > main > section:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > a:nth-of-type(2):hover {
  background-color: rgb(0, 118, 223);
  border-bottom-color: rgba(0, 0, 0, 0);
  border-left-color: rgba(0, 0, 0, 0);
  border-right-color: rgba(0, 0, 0, 0);
  border-top-color: rgba(0, 0, 0, 0);
  color: rgb(255, 255, 255);
  outline-color: rgb(255, 255, 255);
  text-decoration-color: rgb(255, 255, 255);
}

/* Learn more, MacBook Neo 13-inch: hover, with the page's computed values and transition */
body > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > a:nth-of-type(1):hover {
  background-color: rgb(0, 118, 223);
}

/* Buy, MacBook Neo 13-inch: hover, with the page's computed values and transition */
body > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > a:nth-of-type(2):hover {
  background-color: rgb(0, 118, 223);
  border-bottom-color: rgba(0, 0, 0, 0);
  border-left-color: rgba(0, 0, 0, 0);
  border-right-color: rgba(0, 0, 0, 0);
  border-top-color: rgba(0, 0, 0, 0);
  color: rgb(255, 255, 255);
  outline-color: rgb(255, 255, 255);
  text-decoration-color: rgb(255, 255, 255);
}
```

`04-endless-entertainment.css`

```css
/* Generated by Specimen. */

/* dotnav-timed-animation: the page's own keyframes and timing */
@keyframes fx-04-endless-entertainment-1 {
  0% { width: 8px; }
  100% { width: calc(100% - 16px); }
}
#endless-entertainment-gallery-item-1-trigger {
  animation: fx-04-endless-entertainment-1 4160ms linear 840ms 1 normal forwards;
}

/* MLS on Apple TV: hover, with the page's computed values and transition */
#media-gallery-item-1-link > div:nth-of-type(2) > div:nth-of-type(2) > div:hover {
  background-color: rgb(255, 255, 255);
}

/* Item 2: hover, with the page's computed values and transition */
#endless-entertainment-gallery-item-2-trigger:hover > :nth-child(NaN) {
  background-color: rgba(0, 0, 0, 0.72);
}
```

`04-endless-entertainment.gsap.js`

```tsx
// Generated by Specimen. Needs GSAP with ScrollTrigger and CustomEase (both free).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

// dotnav-timed-animation
gsap.set("#endless-entertainment-gallery-item-1-trigger", {});
gsap.timeline({ delay: 0.84 })
;
```

`04-endless-entertainment.motion.tsx`

```tsx
// Generated by Specimen. Motion for React: npm install motion
import { motion, useScroll, useTransform } from "motion/react";

// dotnav-timed-animation — #endless-entertainment-gallery-item-1-trigger
export function DotnavTimedAnimation(props) {
  return <motion.div {...props} animate={{}} transition={{"duration":4.16,"delay":0.84,"times":[],"ease":[]}} />;
}
```

`05-apple-footer.css`

```css
/* Generated by Specimen. */

/* Store: hover, with the page's computed values and transition */
#footer-directory-column-section-products > li:nth-of-type(1) > a:hover {
  text-decoration-line: underline;
}

/* Mac: hover, with the page's computed values and transition */
#footer-directory-column-section-products > li:nth-of-type(2) > a:hover {
  text-decoration-line: underline;
}
```

