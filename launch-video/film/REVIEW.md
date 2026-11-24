# Review · Specimen launch film (60 s, apple.com)

## Creative calls
- Storyline A from `STORYLINES.md` ("one section, all the way"), built without stops as asked. Not built: B (screenshot that fails, split screen) and C (DESIGN.md as kinetic type).
- The page being captured is apple.com, at the person's request. The film's own look stays Specimen's (paper `#fffaf5`, ink `#2b2849`, accent `#64509b`, Manrope). Apple's site appears only as the page Specimen captures and in the exports. The end card is Specimen's alone.
- Every product shot is real: Playwright drove the built extension on apple.com and recorded the side panel and the page (CDP screencast). The exports were opened in the real apps: Photoshop 2027 (the exported PSD), After Effects 2027 (the exported `specimen.jsx` built the comps and keyframes), Figma on the web in Edge (the Copy for Figma SVG pasted into a new draft) and the DESIGN.md that Copy everything puts on the clipboard.
- The browser window frame around the page and panel, the big cursor and the cursor's click dips are drawn. The cursor follows the pointer path logged during recording.
- Music: a HeyGen catalog track (130 BPM), looped to 60 s on a crossfade. It drops to about 30% under the "screenshot" beat (4–8.3 s) and comes back when Specimen appears. Sound effects come from earshot, one per on-screen cause.

## Measured vs looked at
- `hyperframes check`: no errors. Kept warnings: `nested_media_start_basis_ambiguous` (media start times are local to each scene, on purpose) and `timeline_track_too_dense` on the root (14 scene hosts plus the sound).
- Reading time: every title meets the 0.5 s + 0.3 s per word floor after the fixes. The DESIGN.md scroll in the agent scene is texture; the title carries the line.
- Frames looked at: 19 review snapshots plus a re-check of the agent scene.
- Sound was measured (loudness and placement), not heard.

## Weakest shots and what I'd change with more time
- Figma: the paste brought in the images and layers named from the page's HTML, but the 13 text layers did not appear in Figma on the web, probably because Figma can't load SF Pro, which the SVG names. The shot keeps the layers panel in view and makes no claim about text. A Figma plugin import (or a font fallback in the SVG) would make this shot stronger.
- Motion: apple.com's own motion is subtle (the nav search fade), so the motion scene leans on the recorded values and the rebuilt GSAP code. The After Effects shot shows the same animation keyframed.
- The page is recorded at 1× and shown at about 1.33×, so the site text is slightly soft. The panel close-ups use 2× stills where it matters.

## Final file checks (`renders/specimen-launch-final.mp4`)
- 60.0 s, 1920×1080, H.264 + AAC, 13 MB.
- Loudness: −15.0 LUFS integrated, −3.1 dBTP true peak (`qa_video.py`: pass). The HyperFrames render came out at −19.6 LUFS. The final file raises it 5.5 dB through a limiter and copies the video stream unchanged.
- `qa_video.py` flags "frozen stretches" of 1–3.4 s. They are the title holds and the UI reading moments (the longest, 16.9–20.2 s, is the picker hovering the hero before the click), so they're designed. It also flags 0.03–0.37 s of plain paper at a few scene starts (8.5, 11.5, 27.0, 31.0, 51.0 s). They're short, but they're where the film would tighten next: start each scene's first element at 0.
- The last 1.1 s is quiet: the music fades out under the end card.

## Bugs found in Specimen while making this
- **Copy for Figma loses text in Figma on the web.** The apple.com iPhone section's SVG has 13 `<text>` elements in SF Pro. Pasted into Figma in Edge, the images and the groups named from the HTML came in, but no text did.
- **Framer overrides can't compile when one animation repeats.** `01-global.framer.tsx` declares `export function withGlobalnavSearchFadeAndSlide` six times, and the Specimen site's export repeats `withEnterUp` the same way. The override name needs a suffix per element (`packages/exporters/src/framer.ts`).
- **One element can pick an empty overlay link.** On apple.com the whole tile is covered by `a.tile-link`, so picking anywhere on the tile captures the empty link (its SVG is two rects) unless you press ↑ to its parent.
