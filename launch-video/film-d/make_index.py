"""Writes index.html: scenes cut on the voiceover, voice, music bed and effects.

Each scene starts just before its line, so the words on screen and the words heard match.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
words = json.loads((ROOT / 'vo_words.json').read_text())
dur = lambda f: float(subprocess.check_output(['ffprobe', '-v', '0', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(ROOT / f)]).decode())

# Voice line start times (s). Gaps leave room to read; the 0.8 s before L13 is the silent breath.
VO = {'L01': 0.30, 'L02': 2.90, 'L03': 4.70, 'L04': 7.50, 'L05': 11.30, 'L06': 16.70, 'L07': 19.60, 'L08': 24.10,
      'L09': 26.80, 'L10': 29.70, 'L11': 34.40, 'L12': 38.30, 'L13': 44.00, 'L14': 48.50}
END = 51.6
# Scene, start: each begins ~0.1–0.3 s before its line.
SCENES = [('shot', 0.0), ('moves', 2.8), ('title', 4.6), ('choose', 7.4), ('capture', 11.2), ('code', 16.6),
          ('proof', 19.5), ('hover', 26.6), ('figma', 29.5), ('ae', 34.2), ('results', 38.1), ('breath', 43.2),
          ('payoff', 44.0), ('endcard', 48.3)]
# Effects: (file, cue time, peak offset in the file, volume). Most cuts stay silent.
SFX = [('shutter', 1.58, 0.07, 0.7), ('whoosh-a', 2.80, 0.04, 0.45), ('tick', 24.60, 0.0, 0.6),
       ('riser', 44.00, 0.96, 0.8), ('payoff', 44.00, 0.02, 1.6), ('logo', 48.30, 0.30, 0.8)]

hosts = []
for i, (sid, start) in enumerate(SCENES):
    end = SCENES[i + 1][1] if i + 1 < len(SCENES) else END
    hosts.append(f'      <div id="{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{start}" data-duration="{end - start:.2f}"></div>')
# Voice at about -17 LUFS (the files are -23), the bed about 15 dB under it.
voice = [f'      <audio id="vo{k[1:]}" data-start="{t}" data-duration="{dur(f"assets/voice/{k}.mp3"):.2f}" data-volume="2" src="assets/voice/{k}.mp3"></audio>' for k, t in VO.items()]
sfx = [f'      <audio id="sfx-{n}" data-start="{t - p:.2f}" data-duration="{dur(f"assets/sfx/{n}.wav"):.2f}" data-volume="{v}" src="assets/sfx/{n}.wav"></audio>' for n, t, p, v in SFX]

html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #fffaf5; }}
      #root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{END}" data-width="1920" data-height="1080">
{chr(10).join(hosts)}

      <!-- Voice: Eric (ElevenLabs), one file a line. -->
{chr(10).join(voice)}

      <!-- Music bed: stops for the breath at 43.2 s, returns on the payoff. -->
      <audio id="bed" data-start="0" data-duration="44" data-volume="0.13" src="assets/music/bed.wav"></audio>
      <audio id="bed-end" data-start="44" data-duration="{END - 44}" data-media-start="44" data-volume="0.42" src="assets/music/bed.wav"></audio>

      <!-- Effects: each starts at its cue minus its own peak. -->
{chr(10).join(sfx)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
(ROOT / 'index.html').write_text(html)
print('index written')

# The 9:16 cut: same timeline, portrait root.
V = ROOT.parent / 'film-d-vertical'
V.mkdir(exist_ok=True)
(V / 'index.html').write_text(html.replace('width=1920, height=1080', 'width=1080, height=1920').replace('width: 1920px; height: 1080px', 'width: 1080px; height: 1920px').replace('data-width="1920" data-height="1080"', 'data-width="1080" data-height="1920"'))
print('vertical index written')
