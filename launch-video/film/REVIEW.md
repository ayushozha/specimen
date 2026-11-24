# Review · Specimen launch film, motion cut (60 s)

## Creative calls
- The film is about motion, at the person's direction: what other tools reduce to a screenshot, Specimen records (pointer effects, canvas and WebGPU trails, loops, reveals) and rebuilds as code. The first cut, which followed apple.com through Figma, Photoshop and After Effects, is in git history (commit `e04633a`). Its After Effects shot is reused here.
- The page is a site with a pen-and-ink hero: a WebGPU fluid simulation whose ink follows the pointer. Its name is hidden: an init script hides the logo link on every load (Specimen reloads the page to record motion), the panel's host labels are blanked while filming, and no shot shows the parts of the page that name the company. `record-motion.mjs` takes the pattern to hide as `HIDE`.
- Every motion shot is real output: Specimen's own pointer sweep painting the ink, its `pointer.mp4` with the cursor drawn in, the fade time it measured (916 ms), the WGSL it read from the page (29 shaders; the splat and dissipation lines are quoted verbatim), the CSS and GSAP it wrote, its replay page playing that code, and a Record interaction stroke.
- Music: the same HeyGen catalog bed (130 BPM), dipped under the "screenshot" beat. Effects from earshot.

## Measured
- `hyperframes check`: no errors; no reading-time or type-size warnings.
- Final file `renders/specimen-motion-final.mp4`: 60.0 s, 1920×1080. Audio −14.9 LUFS, −3.8 dBTP (`qa_video.py`: pass).
- `qa_video.py` flags 0.13–0.57 s of near-plain paper at scene changes (9.0, 12.0, 20.0, 27.0, 33.0, 41.0, 45.5, 51.5 s): the out-and-in between scenes. Short; tightening them is the next pass.
- Sound was measured, not heard.

## Weakest shots
- Edges: the replay page's cards are small at 900 px wide; a punch-in on the reveal card would read better.
- Interaction: the scripted stroke leaves a thinner trail than Specimen's own sweep. A real hand-drawn stroke would look better.

## Bugs found in Specimen while making these films
- **Copy for Figma loses text when the page's font isn't installed.** apple.com's SVG names SF Pro; Figma shows "Missing fonts" and drops the 13 text layers. The SVG needs a fallback family or an outline option (`packages/exporters/src/svg.ts`).
- **Framer overrides can't compile when one animation repeats.** apple.com's `01-global.framer.tsx` declares `withGlobalnavSearchFadeAndSlide` six times; the Specimen site's export repeats `withEnterUp` (`packages/exporters/src/framer.ts`).
- **A fitted reveal can lose its easing in the CSS export.** The ink site's first scroll reveal is written as `transition: ;` in the `.css` file, while the GSAP file has the fitted `cubic-bezier(0.1, 0.604, 0.504, 1.399)`.
- **One element can pick an empty overlay link.** apple.com covers each tile with `a.tile-link`, so the pick captures an empty link unless you press ↑.
