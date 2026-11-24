# FACTS: what the Specimen launch film claims

| # | Claim as shown (screen / voice) | Source | Quoted wording | Date |
|---|---|---|---|---|
| 1 | Captures a website section by section | README.md | "Capture any website section by section" | 2026-11-24 |
| 2 | Every section, at every width (1440, 768, 390 px) | README.md | "Full page and every section at desktop (1440px), tablet (768px) and mobile (390px)" | 2026-11-24 |
| 3 | Every colour, exactly as the site wrote it | README.md | "Every colour as the site wrote it (`oklch(…)`, `color(display-p3 …)`, hex)" | 2026-11-24 |
| 4 | Every animation, hover and scroll effect | README.md | "every CSS animation captured frame by frame, scroll reveals and parallax traced"; "Every hover and focus effect" | 2026-11-24 |
| 5 | The page's own shader code | README.md | "the page's own WebGL and WebGPU shader code with the uniform values it set" | 2026-11-24 |
| 6 | Watch it capture, live | apps/extension (PR #18) | Capturing view shows "every screenshot as it is taken" | 2026-11-24 |
| 7 | Send it to Figma, Framer or a coding agent | README.md | "Copy and paste into Figma, Paper, Sketch, Penpot, Framer…; a `DESIGN.md` spec for Claude Code, Codex, Cursor" | 2026-11-24 |
| 8 | Chrome, Edge, Brave, Firefox and Safari | README.md badges + Quick start | "Chrome, Brave, Edge, Arc", "Firefox 140+", "Safari (macOS)" | 2026-11-24 |
| 9 | specimen.ayushojha.com | live site | HTTP 200 on 2026-11-24 | 2026-11-24 |

## Measured values
| Value | Method | File |
|---|---|---|
| Every number on the panel (colour count, motion counts, hex values) | Real capture of apple.com by the shipped extension | footage/apple/*.png |
| Shader code lines | Copy everything after capturing the shader demo page | footage/raw/shader-everything.md |

## Illustrative
- The shader and ink shots are captures of Specimen's own demo pages (tests/fixtures), not of apple.com. Their page titles show in the panel as they are.

## Not claimed
- That it is free, on any extension store, or faster than anything.
- Anything about Apple beyond its public homepage being captured on screen. No Apple endorsement or use is implied.
- That a paste into Figma carries motion (only the plugin does).
