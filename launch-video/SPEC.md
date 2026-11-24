# SPEC: Specimen launch film, "Every value, exactly" (storyline C)

GOAL:    The viewer leaves knowing Specimen captures a website's every value (sections, colours, motion, shaders) exactly, and goes to specimen.ayushojha.com.
IDEA:    A title sequence that proves each claim with the real panel capturing apple.com.
OUTPUT:  HyperFrames. Master 1920x1080, 30 fps, 42.0 s. Cut 1080x1920, 30 fps, 30.0 s, same beats re-laid.
TIME:    Designed grid 120 bpm, 4/4: beat 0.5 s = 15 frames, bar 2.0 s = 60 frames. Master 21 bars = 1260 frames. Drop (payoff) at bar 16 = 30.0 s (71%).
CLOCK:   Voice for reveals (VO words land the words on screen); the music grid sets cuts. Payoff hit in the VO pause at 30.0 s.
REGISTER: Kinetic, at 30 fps. Fast in, hold, next. Hard cuts allowed on bar lines.

LOOK
- Medium: the Specimen website, printed in two worlds that alternate on the bar.
  - Paper world: ground #fffaf5 with 1.5% fibre noise, ink #2b2849, secondary #57516a.
  - Night world: ground #211d3d with a radial #493966 at 86% 12% (the site's motion section), ink #fffaf6, secondary #dbd3e9.
- Accent: the iris gradient (#f8c9d6 → #d9c8f2 → #bfe0ef, 135°). It appears ONLY inside the capture corners: the captured thing. One accented word per shot at most.
- Capture corners: Specimen's own icon motif (brand material, so allowed). Four L-corners, 6 px stroke at 1080, 56 px arms, radius 10, colour = ink of the world. They close on the thing being captured.
- Type: Manrope (brand font, assets/fonts). Display 700, 150 px at 1080, tracking -6%, line-height 0.95, max 3 words a line. Body 600, 52 px. Values in SF Mono / ui-monospace 500, 44 px.
- Product UI: real captures only (footage/apple, footage/raw), shown at 1.6-2.0x of the 420-px panel; text never below 26 px rendered. Panel sits on paper with shadow 0 30px 70px rgba(77,60,112,0.22) and radius 22.
- Depth: one shadow recipe above. No grain on UI, no vignette, no blur except subframe motion blur on 0.4-0.6 s moves.

OBJECTS
- The capture corners (constant): every shot hands them to the next.
- The Specimen side panel (hero): the real panel, cropped to the part that proves the line.
- apple.com (subject): real screenshots at 1440 px, sections outlined by Specimen's own picker overlay.
- The words (claims): "every section", "every colour", "every curve", "every shader".

MOTION
- Enter: expo.out 0.45 s (14 f); move: power3.inOut 0.5 s; exit: power2.in 0.25 s (half of enter).
- Corners close: spring zeta 0.8, 10 f, 12 px overshoot once; open: 6 f ease-in.
- Words land letter-group by group, 1 f stagger, settle by the beat, then hold still while read.
- Camera pushes: 0.5 s power3.inOut to 1.6-2.0x on the panel area the line names.
- Children lag parents 2-3 f. One hero move per shot.

SHOTS (master, seconds)
1. 0.0-4.0 Hook, paper. Frame 0 already reads "Capture any website." (150 px). 1.0 s: corners snap around "Exactly." (accent word). 2.0 s: "Specimen" lockup + "specimen.ayushojha.com" (52 px). Read: the promise + name + URL by 3.0 s. Out: corners lift off the word and fly to apple.com.
2. 4.0-8.0 "every section", paper. apple.com hero screenshot fills 70% of frame; Specimen's picker outline hops section to section on the beats (4 beats); the panel's section list slides in at right at 1.6x. Word lands in corners at 4.5 s.
3. 8.0-12.0 "every colour", paper. Push into the Colours tab: role strip then the detail with exact values (real). Word in corners. Values tick on the beats.
4. 12.0-16.0 "every curve", paper. Motion tab counts land (real apple numbers), the rebuilt CSS curve draws as a line. Word in corners.
5. 16.0-20.0 "every shader", NIGHT. The glow capture's pointer-effect card at 1.8x, then the real GLSL scrolls in mono beside it, `uniform vec2 uMouse;` highlighted. Word in corners.
6. 20.0-24.0 "live", paper. The Capturing screencast of apple.com plays (sped to fit, process fast): live preview filling, checklist ticking. Word "as it captures".
7. 24.0-28.0 Acceleration, paper/night alternating per cut: "Figma" 0.5 s, "Framer" 0.5 s, "Claude Code" 0.5 s, "Cursor" 0.25 s, "Paper" 0.25 s, then the Export tab destinations (real) with "Use it anywhere".
8. 28.0-30.0 Breath. Empty paper, corners alone, held open. Silence (music cut, room tone).
9. 30.0-36.0 Payoff (hero moment, loudest non-voice hit at 30.0). One frame rebuilds: every insert from the film snaps into a 4x3 grid inside the corners, then the grid collapses into the one full panel. Claim "Every value. Exactly." at 32.0.
10. 36.0-42.0 End card. Corners shrink into the real Specimen icon (assets), wordmark "Specimen" wipes in beside it, CTA "specimen.ayushojha.com" and "For Chrome, Edge, Brave, Firefox and Safari". Holds 3 s. Music ends on the bar at 42.0.

SOUND
- Bed: a real track (HeyGen catalog when signed in): warm, driving 120 bpm minimal electronic, builds through shot 7, cut to near-silence at 28.0, full drop at 30.0, resolves under the end card. No synthesized tones.
- Voice: a natural, warm voice (HeyGen Voice Turbo), about 2.4 words/s, ducked music to ~0.14 under it.
- Effects (recorded, never synthesized; 2-3 takes rotated): a soft camera-shutter click when corners close; whooshes only on world changes; key ticks for the GLSL lines; one riser into the payoff impact. About half the cuts stay silent.
- Mix: -14 LUFS, true peak <= -1 dBTP, measured on the final file.

BANNED (this film)
- A dark void with small UI floating in it; glow, bloom, particles; mesh or purple glass gradients as ground.
- Everything fading and sliding up; titles drifting after they land; a title over a dimmed screenshot.
- Drawn or redrawn UI: every panel pixel is a capture.
- The Apple logo as a standalone mark, or any line implying Apple uses or endorses Specimen.
- Three cards in a row; the logo docked in a corner; "Introducing" as the first word; "unlock", "seamless", "effortless".
- The same whoosh on every cut.

QA
- 2.9 s: hook, name and URL readable on a 360-px-wide sheet.
- 4.6, 8.6, 12.6, 16.6: each word inside the corners, the proof UI legible (>= 26 px).
- 29.0: silence and an empty frame by design.
- 30.0: loudest non-voice moment; grid snaps.
- 40.0: end card complete, CTA held.
