# Launch film

A 60-second launch film for Specimen, made with [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML rendered to video). The page Specimen captures in the film is apple.com. Every product shot is real footage or a real app window.

- `film/`: the HyperFrames project. `SPEC.md` is the shot list, `STORYLINES.md` the three options, `REVIEW.md` the review notes.
- `footage/record.mjs`: drives the built extension with Playwright and records the side panel and the page as time-stamped frames (CDP screencast), plus 2x panel stills and the capture bundle.
- `footage/make_clip.py`: turns a folder of frames into a 30 fps H.264 clip, optionally sped up.

## Remake the footage

```bash
pnpm --filter @specimen/extension build:e2e
STOPS='[[720,182],[641,289],[760,560]]' node launch-video/footage/record.mjs <out>/pick pick https://www.apple.com/
node launch-video/footage/record.mjs <out>/whole whole https://www.apple.com/
python3 launch-video/footage/make_clip.py <out>/pick/site 7000 18300 1 launch-video/film/assets/clips/pick-site.mp4
```

The Photoshop, After Effects and Figma shots are screenshots of those apps with the exported PSD, `specimen.jsx` and Copy for Figma SVG opened in them.

## Preview and render

With the HyperFrames skills installed, run these from `film/`:

```bash
npx hyperframes preview
npx hyperframes check
npx hyperframes render -q delivery -o renders/specimen-launch.mp4
```

Music is a HeyGen catalog track (needs a HyperFrames sign-in to fetch again). Sound effects were made with [earshot](https://github.com/Leonxlnx/earshot).
