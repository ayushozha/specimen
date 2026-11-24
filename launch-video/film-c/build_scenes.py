"""Writes compositions/*.html for the Specimen launch film (storyline C), one file per scene.

Each scene gets the shared look (.media/scene-base.css) inlined, its own markup and its own paused
GSAP timeline. Times are local to the scene; the root (index.html) places scenes and audio.
"""
from pathlib import Path

ROOT = Path(__file__).parent
BASE = (ROOT / '.media/scene-base.css').read_text()
CORNERS = '<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>'


VROOT = ROOT.parent / 'film-c-vertical'
from vertical_layout import VERT  # 9:16 overrides: extra CSS and JS replacements per scene


def render(sid, cls, css, body, js, w, h):
    return f"""<template>
  <style>
{BASE}
    #{sid} {{ position: absolute; inset: 0; overflow: hidden; }}
    #{sid} .world {{ position: absolute; inset: 0; }}
{css}
  </style>
  <div id="{sid}" data-composition-id="{sid}" data-width="{w}" data-height="{h}">
   <div class="world {cls}">
{body}
   </div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{js}
    window.__timelines["{sid}"] = tl;
  </script>
</template>
"""


def scene(sid, cls, css, body, js):
    (ROOT / 'compositions' / f'{sid}.html').write_text(render(sid, cls, css, body, js, 1920, 1080))
    vcss, vjs = VERT[sid]
    for a, b in vjs:
        assert a in js, (sid, a)
        js = js.replace(a, b)
    (VROOT / 'compositions').mkdir(parents=True, exist_ok=True)
    (VROOT / 'compositions' / f'{sid}.html').write_text(render(sid, cls, css + vcss, body, js, 1080, 1920))


# 1 · Hook (0–4.5 s): the old way in one line, then the promise inside the capture corners.
scene('hook', 'paper', """
    #hook-a { position: absolute; left: 160px; top: 260px; font-size: 92px; color: #57516a; }
    #hook-b { position: absolute; left: 160px; top: 430px; font-size: 140px; }
    #hook-corners { left: 120px; top: 392px; width: 1620px; height: 236px; color: #2b2849; }
    #hook-url { position: absolute; left: 160px; top: 860px; font-size: 52px; color: #2b2849; }
    #hook-url span { color: #64509b; }
""", f"""
    <div id="hook-a" class="t-title">Every capture tool takes a picture.</div>
    <div id="hook-b" class="t-display">Specimen records the <span class="iris-text">motion.</span></div>
    <div id="hook-corners" class="corners">{CORNERS}</div>
    <div id="hook-url" class="t-body">Browser extension · <span>specimen.ayushojha.com</span></div>
""", """
    tl.fromTo('#hook-a', { opacity: 1, y: 0 }, { opacity: 1, y: 0, duration: 0.01 }, 0);
    tl.fromTo('#hook-url', { opacity: 1 }, { opacity: 1, duration: 0.01 }, 0);
    tl.fromTo('#hook-b', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 2.2);
    tl.fromTo('#hook-corners', { opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(2.2)' }, 2.3);
    tl.to('#hook-a', { opacity: 0.32, duration: 0.3, ease: 'power2.in' }, 2.2);
    tl.to('#hook-corners', { scale: 1.06, opacity: 0, duration: 0.25, ease: 'power2.in' }, 4.2);
""")

# 2 · The edge case (4.5–7.2 s): ink that follows the cursor, the real page.
scene('ink', 'night', """
    #ink-video { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover; }
    #ink-scrim { position: absolute; left: 0; right: 0; top: 0; height: 380px; background: linear-gradient(180deg, rgba(33,29,61,0.82), rgba(33,29,61,0)); }
    #ink-cap { position: absolute; left: 140px; top: 110px; font-size: 96px; color: #fffaf6; }
""", """
    <video id="ink-video" class="clip" data-start="0" data-duration="2.7" src="assets/clips/ink.mp4" muted playsinline></video>
    <div id="ink-scrim"></div>
    <div id="ink-cap" class="t-title">Ink that follows your cursor.</div>
""", """
    tl.fromTo('#ink-cap', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.15);
    tl.fromTo('#ink-video', { scale: 1.0 }, { scale: 1.04, duration: 2.7, ease: 'none' }, 0);
""")

# 3 · The screenshot fails (7.2–9.4 s): a shutter freezes it flat.
scene('shot', 'paper', """
    #shot-full { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover; }
    #shot-card { position: absolute; left: 1010px; top: 300px; width: 760px; height: 363px; border-radius: 18px; overflow: hidden; box-shadow: 0 30px 70px rgba(77,60,112,0.22); }
    #shot-card img { width: 100%; height: 100%; object-fit: cover; }
    #shot-label { position: absolute; left: 1010px; top: 690px; font-size: 34px; color: #57516a; }
    #shot-flash { position: absolute; inset: 0; background: #ffffff; opacity: 0; }
    #shot-line { position: absolute; left: 140px; top: 400px; width: 780px; font-size: 104px; }
""", """
    <img id="shot-full" src="assets/ui/ink-freeze.png" alt="">
    <div id="shot-card"><img src="assets/ui/ink-flat.png" alt=""></div>
    <div id="shot-label" class="t-mono">screenshot.png · no motion</div>
    <div id="shot-line" class="t-title">A screenshot can't keep that.</div>
    <div id="shot-flash"></div>
""", """
    tl.fromTo('#shot-flash', { opacity: 0 }, { opacity: 0.9, duration: 0.04 }, 0.18);
    tl.to('#shot-flash', { opacity: 0, duration: 0.22, ease: 'power2.out' }, 0.22);
    tl.fromTo('#shot-full', { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.45);
    tl.fromTo('#shot-card', { opacity: 0, scale: 2.2, x: -400, y: 120 }, { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.55, ease: 'power3.inOut' }, 0.4);
    tl.fromTo('#shot-label', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.6);
    tl.fromTo('#shot-line', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.6);
""")

# 4 · The sweep (9.4–15.0 s): Specimen's own cursor over the ink, and the panel capturing.
scene('sweep', 'paper', f"""
    #sweep-title {{ position: absolute; left: 120px; top: 92px; font-size: 84px; width: 1140px; }}
    #sweep-frame {{ position: absolute; left: 120px; top: 300px; width: 1120px; height: 536px; }}
    #sweep-still {{ position: absolute; left: 0; top: 0; width: 1120px; height: 536px; object-fit: cover; border-radius: 18px; }}
    #sweep-video {{ position: absolute; left: 0; top: 0; width: 1120px; height: 536px; object-fit: cover; border-radius: 18px; }}
    #sweep-corners {{ left: -26px; top: -26px; width: 1172px; height: 588px; color: #2b2849; }}
    #sweep-cap {{ position: absolute; left: 120px; top: 880px; font-size: 40px; color: #57516a; }}
    #sweep-panel {{ left: 1340px; top: 70px; width: 470px; height: 900px; background: #fffaf5; }}
    #sweep-panel video {{ width: 470px; height: 900px; object-fit: cover; object-position: top; }}
""", f"""
    <div id="sweep-title" class="t-title">It sweeps every section with its own cursor.</div>
    <div id="sweep-frame">
      <img id="sweep-still" src="assets/ui/ink-freeze.png" alt="">
      <video id="sweep-video" class="clip" data-start="0" data-duration="4.5" data-media-start="0.3" src="assets/clips/ink.mp4" muted playsinline></video>
      <div id="sweep-corners" class="corners">{CORNERS}</div>
    </div>
    <div id="sweep-cap" class="t-body">Recorded by Specimen, cursor drawn in</div>
    <div id="sweep-panel" class="card"><video id="sweep-panel-video" class="clip" data-start="0" data-duration="5.6" src="assets/clips/panel-capture.mp4" muted playsinline></video></div>
""", """
    tl.fromTo('#sweep-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.1);
    tl.fromTo('#sweep-frame', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.0);
    tl.fromTo('#sweep-corners', { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, 0.35);
    tl.fromTo('#sweep-panel', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.55, ease: 'expo.out' }, 0.25);
    tl.fromTo('#sweep-cap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.9);
""")

# 5 · The fade, measured (15.0–20.0 s): the Motion tab and the number.
scene('fade', 'night', """
    #fade-card { left: 1140px; top: 60px; width: 660px; height: 930px; background: #fffaf5; }
    #fade-card img { position: absolute; left: 0; top: 0; width: 660px; }
    #fade-num { position: absolute; left: 140px; top: 300px; font-size: 300px; color: #fffaf6; }
    #fade-num small { font-size: 120px; letter-spacing: -0.03em; }
    #fade-sub { position: absolute; left: 150px; top: 640px; font-size: 48px; color: #dbd3e9; width: 960px; white-space: nowrap; }
    #fade-curve { position: absolute; left: 150px; top: 780px; width: 860px; height: 160px; }
    #fade-hl { position: absolute; left: 1150px; top: 174px; width: 640px; height: 70px; border-radius: 10px; border: 4px solid #d9c8f2; }
""", """
    <div id="fade-card" class="card"><img id="fade-img" src="assets/ui/motion-card.png" alt=""></div>
    <div id="fade-hl"></div>
    <div id="fade-num" class="t-display">775<small> ms</small></div>
    <div id="fade-sub" class="t-body">This capture: the ink fades in 775 ms.</div>
    <svg id="fade-curve" viewBox="0 0 860 160"><path id="fade-path" d="M0 12 C 200 12, 260 150, 860 150" fill="none" stroke="#d9c8f2" stroke-width="8" stroke-linecap="butt" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>
""", """
    // The card scrolls from the counts to the pointer-effect card, then holds on its line.
    tl.fromTo('#fade-card', { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.0);
    tl.fromTo('#fade-img', { y: 0 }, { y: -330, duration: 0.6, ease: 'power3.inOut' }, 0.9);
    tl.fromTo('#fade-hl', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.55);
    tl.fromTo('#fade-num', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 2.3);
    tl.fromTo('#fade-sub', { opacity: 0 }, { opacity: 1, duration: 0.35 }, 2.6);
    tl.fromTo('#fade-path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.78, ease: 'none' }, 2.6);
""")

# 6 · The page's own shader (20.0–23.0 s).
SHADER = [
    '@fragment',
    'fn fs(input: VertexOutput) -&gt; @location(0) vec4f {',
    '  let coordinate = input.vUv - uniforms.uDelta',
    '    * lookup(tVelocity, input.vUv).xy * uniforms.uVelocityTexel;',
    '  return lookup(tSource, coordinate)',
    '    / (1.0 + <b>uniforms.uDissipation</b> * uniforms.uDelta);',
    '}',
]
scene('shader', 'night', """
    #shader-title { position: absolute; left: 140px; top: 110px; font-size: 84px; color: #fffaf6; }
    #shader-sub { position: absolute; left: 144px; top: 220px; font-size: 38px; color: #dbd3e9; }
    #shader-code { position: absolute; left: 140px; top: 360px; width: 1640px; padding: 44px 52px; border-radius: 22px; background: rgba(255,250,246,0.06); border: 2px solid rgba(219,211,233,0.18); }
    .sl { font-size: 40px; line-height: 64px; color: #e9e2f5; white-space: pre; }
    .sl b { font-weight: 600; color: #211d3d; background: #d9c8f2; padding: 0 6px; border-radius: 6px; }
""", '\n'.join([
    '    <div id="shader-title" class="t-title">It reads the page\'s own shader.</div>',
    '    <div id="shader-sub" class="t-body">WebGPU · the ink\'s fluid simulation</div>',
    '    <div id="shader-code">',
    *[f'      <div class="sl t-mono" id="sl{i}">{line}</div>' for i, line in enumerate(SHADER)],
    '    </div>',
]), """
    tl.fromTo('#shader-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.05);
    tl.fromTo('#shader-sub', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.25);
    tl.fromTo('#shader-code', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.25);
    tl.fromTo('.sl', { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.22, ease: 'power2.out', stagger: 0.11 }, 0.45);
""")

# 7 · Effects become code (23.0–27.0 s): the page's computed hover, and a fitted scroll reveal replayed.
scene('code', 'paper', """
    #code-title { position: absolute; left: 120px; top: 92px; font-size: 84px; }
    #code-card { position: absolute; left: 120px; top: 270px; width: 920px; padding: 40px 44px; border-radius: 22px; background: #211d3d; color: #fffaf6; }
    .cl { font-size: 32px; line-height: 50px; white-space: pre; color: #e9e2f5; }
    .cl.c { color: #9d93b8; }
    .cl b { font-weight: 600; color: #211d3d; background: #f8c9d6; padding: 0 6px; border-radius: 6px; }
    #code-curve { position: absolute; left: 120px; top: 650px; width: 920px; height: 330px; }
    #code-prev { left: 1120px; top: 240px; width: 680px; height: 680px; background: #fff; }
    #code-prev video { width: 680px; height: 680px; object-fit: cover; }
    #code-match { position: absolute; left: 1120px; top: 950px; font-size: 44px; }
    #code-match span { color: #64509b; }
""", """
    <div id="code-title" class="t-title">Every effect becomes code.</div>
    <div id="code-card">
      <div class="cl c t-mono">&#47;&#42; the page's own hover, as computed &#42;&#47;</div>
      <div class="cl t-mono">a:hover { scale: 1.05; }</div>
      <div class="cl t-mono">a { transition: scale 300ms</div>
      <div class="cl t-mono">  <b>cubic-bezier(0.34, 1.56, 0.64, 1)</b>; }</div>
    </div>
    <svg id="code-curve" viewBox="0 0 920 330">
      <line x1="40" y1="290" x2="880" y2="290" stroke="#ded4e1" stroke-width="3"/>
      <line x1="40" y1="70" x2="880" y2="70" stroke="#ded4e1" stroke-width="3" stroke-dasharray="10 10"/>
      <path id="code-path" d="M40 290 C 325.6 290, 577.6 -53.2, 880 70" fill="none" stroke="#64509b" stroke-width="9" stroke-linecap="butt" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    </svg>
    <div id="code-prev" class="card"><video id="code-prev-video" class="clip" data-start="0" data-duration="4" src="assets/clips/preview.mp4" muted playsinline></video></div>
    <div id="code-match" class="t-body">Scroll reveals: <span>fitted, match 99%</span></div>
""", """
    tl.fromTo('#code-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.05);
    tl.fromTo('#code-card', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.2);
    tl.fromTo('.cl', { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.12 }, 0.4);
    tl.fromTo('#code-path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: 'power1.inOut' }, 1.0);
    tl.fromTo('#code-prev', { opacity: 0, x: 100 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }, 0.5);
    tl.fromTo('#code-match', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'expo.out' }, 2.1);
""")

# 8 · Figma (27.0–30.4 s): the plugin builds the capture, and the hover is a Smart Animate.
scene('figma', 'paper', """
    #figma-title { position: absolute; left: 120px; top: 80px; font-size: 76px; }
    #figma-import { left: 120px; top: 220px; width: 1680px; height: 1073px; }
    #figma-import video { width: 1680px; }
    #figma-panel { left: 120px; top: 220px; width: 1260px; height: 840px; background: #fff; }
    #figma-panel img { width: 1260px; }
    #figma-facts { position: absolute; left: 1440px; top: 330px; width: 380px; font-size: 40px; line-height: 1.25; }
    #figma-facts div { margin-bottom: 26px; }
    #figma-facts span { display: block; font-size: 30px; color: #57516a; }
""", """
    <div id="figma-title" class="t-title">Figma: the hover, already animated.</div>
    <div id="figma-import" class="card"><video id="figma-import-video" class="clip" data-start="0" data-duration="2" src="assets/clips/figma-import.mp4" muted playsinline></video></div>
    <div id="figma-panel" class="card"><img src="assets/ui/figma-panel.png" alt=""></div>
    <div id="figma-facts" class="t-title">
      <div><span class="t-body">Animation</span>Smart animate</div>
      <div><span class="t-body">Duration</span>200 ms</div>
      <div><span class="t-body">Easing</span>0.25, 0.1, 0.25, 1</div>
    </div>
""", """
    tl.fromTo('#figma-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.05);
    tl.fromTo('#figma-import', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.0);
    tl.fromTo('#figma-panel', { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' }, 1.45);
    tl.to('#figma-import', { opacity: 0, duration: 0.2 }, 1.6);
    tl.fromTo('#figma-facts div', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.3, ease: 'expo.out', stagger: 0.1 }, 1.3);
""")

# 9 · After Effects (30.4–33.4 s): the same motion as eased keyframes.
scene('ae', 'night', """
    #ae-title { position: absolute; left: 120px; top: 120px; font-size: 84px; color: #fffaf6; }
    #ae-sub { position: absolute; left: 124px; top: 232px; font-size: 38px; color: #dbd3e9; }
    #ae-clip { left: 0; top: 380px; width: 1920px; height: 460px; border-radius: 0; }
    #ae-clip video { width: 1920px; height: 460px; }
""", """
    <div id="ae-title" class="t-title">After Effects: keyframed.</div>
    <div id="ae-sub" class="t-body">Eased keyframes, as the page timed them</div>
    <div id="ae-clip" class="card"><video id="ae-video" class="clip" data-start="0" data-duration="3" src="assets/clips/ae.mp4" muted playsinline></video></div>
""", """
    tl.fromTo('#ae-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.05);
    tl.fromTo('#ae-sub', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2);
    tl.fromTo('#ae-clip', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.1);
""")

# 10 · Coding agents (33.4–37.0 s): the motion as text an agent can build from.
scene('agent', 'paper', """
    #agent-title { position: absolute; left: 120px; top: 92px; font-size: 84px; }
    #agent-doc { position: absolute; left: 120px; top: 250px; width: 1680px; padding: 40px 52px; border-radius: 22px; background: #fff; border: 2px solid #ded4e1; box-shadow: 0 30px 70px rgba(77,60,112,0.14); }
    #agent-file { font-size: 30px; color: #57516a; margin-bottom: 22px; }
    .al { font-size: 34px; line-height: 54px; color: #2b2849; }
    .al b { font-weight: 600; background: #eee7f8; padding: 0 6px; border-radius: 6px; }
""", """
    <div id="agent-title" class="t-title">Your agent gets every value as text.</div>
    <div id="agent-doc">
      <div id="agent-file" class="t-mono">DESIGN.md · Motion</div>
      <div class="al t-mono">- pointer: canvas: moving the pointer paints into a &lt;canvas&gt;,</div>
      <div class="al t-mono">  over 738×846 at 423,0; <b>the trail fades about 775ms</b> after the</div>
      <div class="al t-mono">  pointer stops. It listens to pointermove on the whole window.</div>
      <div class="al t-mono">- hover: "Watch it in action": scale none → 1.05</div>
      <div class="al t-mono">  (<b>scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1)</b>)</div>
    </div>
""", """
    tl.fromTo('#agent-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.05);
    tl.fromTo('#agent-doc', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.15);
    tl.fromTo('.al', { opacity: 0 }, { opacity: 1, duration: 0.18, stagger: 0.06 }, 0.3);
""")

# 11 · Breath (37.0–38.0 s): empty corners, held open in silence.
scene('breath', 'paper', f"""
    #breath-corners {{ left: 560px; top: 290px; width: 800px; height: 500px; color: #2b2849; }}
""", f"""
    <div id="breath-corners" class="corners">{CORNERS}</div>
""", """
    tl.fromTo('#breath-corners', { opacity: 0, scale: 1.2 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }, 0.0);
""")

# 12 · Payoff (38.0–42.0 s): the corners close on everything it captured, then the claim.
TILES = [
    ('assets/ui/ink-freeze.png', 'cover'),
    ('assets/ui/motion-card.png', 'cover'),
    ('assets/ui/figma-panel.png', 'cover'),
    ('assets/ui/motion-head.png', 'cover'),
]
scene('payoff', 'paper', f"""
    #pay-corners {{ left: 210px; top: 270px; width: 1500px; height: 560px; color: #2b2849; }}
    #pay-grid {{ position: absolute; left: 600px; top: 330px; width: 720px; height: 420px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }}
    #pay-grid div {{ border-radius: 14px; overflow: hidden; }}
    #pay-grid img {{ width: 100%; height: 100%; object-fit: cover; object-position: top; }}
    #pay-name {{ position: absolute; left: 0; right: 0; top: 330px; text-align: center; font-size: 200px; }}
    #pay-claim {{ position: absolute; left: 0; right: 0; top: 600px; text-align: center; font-size: 84px; }}
""", f"""
    <div id="pay-grid">{''.join(f'<div class="pt"><img src="{src}" alt=""></div>' for src, _ in TILES)}</div>
    <div id="pay-corners" class="corners">{CORNERS}</div>
    <div id="pay-name" class="t-display">Specimen</div>
    <div id="pay-claim" class="t-title">It records the <span class="iris-text">motion.</span></div>
""", """
    // Corners start where the breath left them (800x500 at 560,290) and open to the title box.
    tl.fromTo('#pay-corners .tl', { x: 350, y: 20 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.95);
    tl.fromTo('#pay-corners .tr', { x: -350, y: 20 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.95);
    tl.fromTo('#pay-corners .bl', { x: 350, y: -40 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.95);
    tl.fromTo('#pay-corners .br', { x: -350, y: -40 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.95);
    tl.fromTo('.pt', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.8)', stagger: 0.05 }, 0.0);
    tl.to('#pay-grid', { scale: 0.2, opacity: 0, duration: 0.35, ease: 'power3.in' }, 0.95);
    tl.fromTo('#pay-name', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 1.1);
    tl.fromTo('#pay-claim', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 1.75);
""")

# 13 · End card (42.0–46.0 s): the mark, the name and where to get it.
scene('endcard', 'paper', """
    #end-icon { position: absolute; left: 810px; top: 250px; width: 300px; height: 300px; border-radius: 66px; }
    #end-name { position: absolute; left: 0; right: 0; top: 590px; text-align: center; font-size: 132px; }
    #end-url { position: absolute; left: 0; right: 0; top: 770px; text-align: center; font-size: 64px; color: #64509b; }
    #end-browsers { position: absolute; left: 0; right: 0; top: 880px; text-align: center; font-size: 36px; color: #57516a; }
""", """
    <img id="end-icon" src="assets/ui/specimen-icon.png" alt="">
    <div id="end-name" class="t-display">Specimen</div>
    <div id="end-url" class="t-title">specimen.ayushojha.com</div>
    <div id="end-browsers" class="t-body">For Chrome, Edge, Brave, Firefox and Safari</div>
""", """
    tl.fromTo('#end-icon', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, 0.0);
    tl.fromTo('#end-name', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.25);
    tl.fromTo('#end-url', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.5);
    tl.fromTo('#end-browsers', { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.8);
""")

print('scenes written')
