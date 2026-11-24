# SPEC · Specimen launch film (storyline A)

SUBJECT: motion first (the person's direction, 2026-11-24): Specimen records what moves and rebuilds it as code,
         where other tools stop at a screenshot. The page is a site with a pen-and-ink hero whose WebGPU ink trail
         follows the pointer. Its name is hidden everywhere: the logo link is hidden by an init script while filming,
         the panel's host labels are blanked, and no shot shows the parts of the page that name it.
GOAL:    a designer or developer sees Specimen record a pointer-driven WebGPU effect, read its shader code, and
         rebuild loops and reveals as code that replays, and wants to install it.
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
  0.0–4.5   HOOK. Specimen's own recording of the hero: the pointer drags ink across the sky, cursor drawn in.
  4.5–9.0   TENSION. The hero as a screenshot goes flat. "A screenshot keeps the pixels." / "The motion never makes it out."
  9.0–12.0  REVEAL. Icon + "Specimen" + "records the motion."
  12.0–20.0 SWEEP. Window grows from the icon: the real panel ("Drawing pointer strokes over sections") beside the page
            while Specimen's own pointer paints the ink. "It sweeps the pointer for you."
  20.0–27.0 RECORDED. pointer.mp4 plays; the Inspect · Motion card: "The pointer paints into a canvas; the trail fades in
            about 916ms." Badge: trail fades in 916 ms.
  27.0–33.0 SHADER. The page's own WGSL: the splat at uPoint (ink lands at the pointer) and the uDissipation fade.
            "29 WebGPU shaders, read from the page with their uniforms."
  33.0–41.0 EDGES. Specimen's replay page playing its rebuilt effects. A loop read from its CSS (44000ms linear,
            translateX(-50%)); a reveal with no CSS, fitted to the recording: cubic-bezier(0.1,0.604,0.504,1.399), 100% match.
  41.0–45.5 AFTER EFFECTS. Keyframes built by Specimen's exported script (apple.com nav fade), playhead moving.
  45.5–51.5 INTERACTION. "Missed one? Record it yourself." A hand-drawn stroke recorded with the cursor, beside the panel's
            Record interaction box.
  51.5–54.5 CLAIM. "Capture the motion, not just pixels."
  54.5–60.0 END CARD.
BANNED:  dark void with floating UI; glow, particles, gradients as decoration; everything centred; every element
         fading and sliding up; titles moving after they land; corner labels and HUD brackets as decoration;
         three cards in a row; a title over a dimmed screenshot; the logo docked in a corner; invented UI.
QA:      2.0 outline on the card; 5.2 flat frozen card + line; 11.0 icon + wordmark; 18.0 picker in the window;
         27.0 panel + three screenshots; 34.0 motion clip + code; 40.0 swatches; 50.0 DESIGN.md readable; 58.5 end card.
