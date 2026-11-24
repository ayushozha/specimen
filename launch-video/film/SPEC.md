# SPEC · Specimen launch film (storyline A)

SUBJECT: the page being captured is apple.com (the person's choice, 2026-11-24). The film's own look stays Specimen's;
         Apple's site appears only as the page Specimen captures, never as a brand on the end card.

GOAL:    a designer or developer who has never heard of Specimen wants to install it to take a section they love into Figma, Framer or their coding agent.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps.
TIME:    60 s x 30 = 1800 frames. Music: HeyGen catalog track at 130 BPM, looped, dipped under the tension beat.

LOOK:    ground: paper #fffaf5, flat, 0% grain. Ink #2b2849, muted #57516a, line #ded4e1, dark world #211d3d.
         Accent #64509b (the accent Specimen read from its own site): one word per title, the cursor's click ring is NOT used.
         Display: Manrope 630, 76 px (7% of 1080), tracking -0.05em, one line at a time, left-aligned at x 128.
         Small text: Manrope 600, 30 px. Mono: JetBrains Mono 500, 26 px (code and DESIGN.md only).
         Medium: real product UI on paper. The browser is a plain window (radius 18 px, 1 px #ded4e1 border,
         shadow 0 30px 80px rgba(43,40,73,0.16)), no fake chrome beyond a 44 px top bar with three dots.
OBJECTS: apple.com (real footage of Specimen capturing it), the Specimen side panel (real footage and 2x stills), the hero card
         (cut from the real frame), section screenshots at 1440/768/390 (real capture output), the colour swatches
         (real palette.json values and variable names), the motion clip and its rebuilt code (real export),
         DESIGN.md (real file, real text), the Specimen icon (the extension's own 128 px icon).
MOTION:  arrive expo.out 0.6 s; camera power2.inOut 0.5 s; exits power3.in 0.3 s (half the entrance).
         Titles: per word blur 6px→0 + opacity, 0.13 s each, 0.07 s apart; land and hold dead still; exit blur-out 0.2 s.
         Cursor: 64 px tall (6% of frame), eases power2.inOut between logged points, clicks are a 0.08 s scale 0.86 dip.
SHOTS (as built, 60 s):
  0.0–4.0   HOOK. apple.com full-bleed, real picker footage: the outline jumps from the page to a button
            ("Learn more") to the hero tile, labelled a.tile-link 1440 × 692.
  4.0–8.5   TENSION. The tile lifts onto paper, a shutter flash, it goes flat with a screenshot filename.
            "A screenshot keeps the pixels." / "No motion. No layers. No code." Music dips.
  8.5–11.5  REVEAL. Icon + "Specimen" + "captures the real thing."; the icon flies to centre.
  11.5–20.5 PICK. The window grows out of the icon: page + side panel in sync; One element, Pick, roam, click.
  20.5–27.0 CAPTURE. Whole-page run (checklist at 30x, live preview); the tile lands at 1440/768/390.
  27.0–31.0 MOTION. Page-load recording + apple's nav fade (320 ms after 200 ms) + rebuilt GSAP code.
  31.0–34.5 COLOURS. Six apple.com colours with their --sk-* variables, printed in on the half beat.
  34.5–38.1 EXPORTS. Real Export tab: Framer, Code agent, Figma clicks. "Then take it into any tool."
  38.0–42.0 FIGMA. Real Figma (web) after pasting Copy for Figma: frame + layers named from the HTML.
  42.0–46.5 PHOTOSHOP. Real Photoshop: the exported PSD, live type layer "iPhone" (SF Pro Display Bold 56 pt).
  46.5–51.0 AFTER EFFECTS. Real After Effects: comps built by specimen.jsx, playhead stepping through keys.
  51.0–54.5 AGENT. Dark world: apple.com's real DESIGN.md scrolls. "Your agent gets a DESIGN.md."
  54.5–57.0 CLAIM. "Capture websites, section by section." (Specimen's own headline)
  57.0–60.0 END CARD. Icon drops, wordmark wipes, specimen.ayushojha.com, browsers.
BANNED:  dark void with floating UI; glow, particles, gradients as decoration; everything centred; every element
         fading and sliding up; titles moving after they land; corner labels and HUD brackets as decoration;
         three cards in a row; a title over a dimmed screenshot; the logo docked in a corner; invented UI.
QA:      2.0 outline on the card; 5.2 flat frozen card + line; 11.0 icon + wordmark; 18.0 picker in the window;
         27.0 panel + three screenshots; 34.0 motion clip + code; 40.0 swatches; 50.0 DESIGN.md readable; 58.5 end card.
