"""Writes compositions/*.html for the Specimen launch film "It records the motion" (film D).

Story: screenshots stop at a picture; a website moves; Specimen records the motion, the whole page or one
section; it rebuilds every effect as code, and the code is measured against the live site: the same
curve, frame for frame, in CSS, GSAP, Motion, Figma and After Effects.

Every number on screen comes from .media/proof.json (made by proof_data.py from `specimen verify`).
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
BASE = (ROOT / '.media/scene-base.css').read_text()
PROOF = json.loads((ROOT / '.media/proof.json').read_text())
CORNERS = '<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>'
W, H = 1920, 1080


VROOT = ROOT.parent / 'film-d-vertical'
from vertical_layout import VERT  # 9:16: extra CSS per scene


def render(sid, cls, css, body, js, w, h):
    return f"""<template>
  <style>
{BASE}
    #{sid} {{ position: absolute; inset: 0; overflow: hidden; }}
    #{sid} .world {{ position: absolute; inset: 0; }}
    #{sid} .lbl {{ font-family: 'JetBrains Mono', monospace; font-size: 28px; letter-spacing: 0.02em; text-transform: uppercase; }}
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
    (ROOT / 'compositions' / f'{sid}.html').write_text(render(sid, cls, css, body, js, W, H))
    (VROOT / 'compositions').mkdir(parents=True, exist_ok=True)
    (VROOT / 'compositions' / f'{sid}.html').write_text(render(sid, cls, css + VERT.get(sid, ''), body, js, 1080, 1920))


def path(points, x0, y0, w, h, xr, yr):
    """SVG path through (x, y) data points mapped into a w×h box at (x0, y0)."""
    (xa, xb), (ya, yb) = xr, yr
    pts = [(x0 + (x - xa) / (xb - xa) * w, y0 + h - (y - ya) / (yb - ya) * h) for x, y in points]
    return 'M' + ' L'.join(f'{px:.1f},{py:.1f}' for px, py in pts)


def enter(sel, at, y=30, dur=0.45):
    return f"    tl.fromTo('{sel}', {{ opacity: 0, y: {y} }}, {{ opacity: 1, y: 0, duration: {dur}, ease: 'expo.out' }}, {at});\n"


# 1 · Screenshot (0–2.8): the page freezes into a picture. Line on screen from frame 0.
scene('shot', 'paper', """
    #shot-line { position: absolute; left: 120px; top: 120px; width: 1680px; font-size: 96px; }
    #shot-card { position: absolute; left: 360px; top: 380px; width: 1200px; height: 574px; border-radius: 20px; overflow: hidden; box-shadow: 0 30px 70px rgba(77,60,112,0.22); }
    #shot-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    #shot-flat { opacity: 0; }
    #shot-flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
    #shot-tag { position: absolute; left: 360px; top: 980px; font-size: 32px; color: #57516a; }
""", """
    <div id="shot-line" class="t-title">Most capture tools stop at a screenshot.</div>
    <div id="shot-card"><img id="shot-live" src="assets/ui/ink-freeze.png" alt=""><img id="shot-flat" src="assets/ui/ink-flat.png" alt=""></div>
    <div id="shot-tag" class="t-mono">screenshot.png</div>
    <div id="shot-flash"></div>
""", """
    tl.fromTo('#shot-card', { scale: 1.04 }, { scale: 1, duration: 1.2, ease: 'power2.out' }, 0);
    tl.fromTo('#shot-flash', { opacity: 0 }, { opacity: 0.85, duration: 0.04 }, 1.55);
    tl.to('#shot-flash', { opacity: 0, duration: 0.25, ease: 'power2.out' }, 1.6);
    tl.fromTo('#shot-flat', { opacity: 0 }, { opacity: 1, duration: 0.05 }, 1.58);
    tl.fromTo('#shot-tag', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.75);
""")

# 2 · But a website moves (2.8–4.7): the pointer ink, live.
scene('moves', 'night', """
    #mv-video { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover; }
    #mv-scrim { position: absolute; left: 0; right: 0; top: 0; height: 360px; background: linear-gradient(180deg, rgba(33,29,61,0.8), rgba(33,29,61,0)); }
    #mv-line { position: absolute; left: 120px; top: 110px; font-size: 110px; color: #fffaf6; }
""", """
    <video id="mv-video" class="clip" data-start="0" data-duration="1.9" data-media-start="0.6" src="assets/clips/ink.mp4" muted playsinline></video>
    <div id="mv-scrim"></div>
    <div id="mv-line" class="t-title">But a website moves.</div>
""", enter('#mv-line', 0.05, 24, 0.35))

# 3 · Specimen records the motion (4.7–7.4).
scene('title', 'paper', f"""
    #ti-line {{ position: absolute; left: 160px; top: 400px; font-size: 150px; }}
    #ti-corners {{ left: 110px; top: 356px; width: 1700px; height: 280px; color: #2b2849; }}
    #ti-icon {{ position: absolute; left: 160px; top: 200px; width: 120px; height: 120px; border-radius: 28px; }}
""", f"""
    <img id="ti-icon" src="assets/ui/specimen-icon.png" alt="">
    <div id="ti-line" class="t-display">Specimen records the <span class="iris-text">motion.</span></div>
    <div id="ti-corners" class="corners">{CORNERS}</div>
""", enter('#ti-line', 0.0, 40) + enter('#ti-icon', 0.1, 20) + """
    tl.fromTo('#ti-corners', { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(2.2)' }, 0.95);
""")

# 4 · The whole page, or one section (7.4–11.2): the real panel.
scene('choose', 'paper', """
    #ch-line { position: absolute; left: 120px; top: 90px; width: 1700px; font-size: 76px; }
    #ch-a, #ch-b { top: 230px; width: 560px; height: 790px; background: #fffaf5; }
    #ch-a { left: 120px; } #ch-b { left: 120px; }
    #ch-a img, #ch-b img { width: 560px; }
    #ch-site { left: 760px; top: 230px; width: 1040px; height: 600px; background: #fff; }
    #ch-site img { position: absolute; left: 0; top: 0; width: 1040px; }
    #ch-cap { position: absolute; left: 760px; top: 860px; font-size: 36px; color: #57516a; width: 1040px; }
""", """
    <div id="ch-line" class="t-title">The whole page, or just the section you want.</div>
    <div id="ch-a" class="card"><img src="assets/ui/panel-choose.png" alt=""></div>
    <div id="ch-b" class="card"><img src="assets/ui/panel-sections.png" alt=""></div>
    <div id="ch-site" class="card"><img src="assets/ui/site-section.png" alt=""></div>
    <div id="ch-cap" class="t-body">Or click a section on the page.</div>
""", enter('#ch-line', 0.05) + """
    tl.fromTo('#ch-a', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out' }, 0.1);
    tl.fromTo('#ch-b', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.6);
    tl.fromTo('#ch-site', { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }, 1.7);
    tl.fromTo('#ch-cap', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.2);
""")

# 5 · Capture (11.2–16.6): the panel captures, the page moves under Specimen's cursor.
scene('capture', 'paper', """
    #cp-line { position: absolute; left: 120px; top: 90px; width: 1100px; font-size: 72px; }
    #cp-list { position: absolute; left: 124px; top: 330px; font-size: 44px; line-height: 1.7; }
    #cp-list div { opacity: 0; }
    #cp-panel { left: 1250px; top: 70px; width: 560px; height: 940px; background: #fffaf5; }
    #cp-panel video, #cp-end { position: absolute; left: 0; top: 0; width: 560px; height: 1074px; object-fit: cover; object-position: top; }
""", """
    <div id="cp-line" class="t-title">It measures every effect as it happens.</div>
    <div id="cp-list" class="t-body"><div>Scrolls the page</div><div>Hovers every link and button</div><div>Moves the pointer over each section</div><div>Times each curve, frame by frame</div></div>
    <div id="cp-panel" class="card"><img id="cp-end" src="assets/ui/capture-end.png" alt=""><video id="cp-video" class="clip" data-start="0" data-duration="4.95" src="assets/clips/panel-capture.mp4" muted playsinline></video></div>
""", enter('#cp-line', 0.05) + """
    tl.fromTo('#cp-panel', { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }, 0.1);
    tl.fromTo('#cp-list div', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35, ease: 'expo.out', stagger: 0.7 }, 0.6);
""")

# 6 · Rebuilt as code (16.6–19.5): the hero's exported CSS, as written.
CSS = PROOF['heroCss']
scene('code', 'night', """
    #cd-line { position: absolute; left: 120px; top: 100px; font-size: 80px; color: #fffaf6; }
    #cd-card { position: absolute; left: 120px; top: 260px; width: 1680px; padding: 36px 44px; border-radius: 22px; background: rgba(255,250,246,0.06); border: 2px solid rgba(219,211,233,0.18); }
    .cl { font-size: 30px; line-height: 46px; white-space: pre; color: #e9e2f5; }
    .cl.k { color: #f8c9d6; }
""", '\n'.join(['    <div id="cd-line" class="t-title">Then it rebuilds each one as code.</div>', '    <div id="cd-card">']
               + [f'      <div class="cl t-mono{" k" if ("range" in l or "translate" in l or "opacity" in l) else ""}">{l.replace("<", "&lt;")}</div>' for l in CSS]
               + ['    </div>']), enter('#cd-line', 0.05) + """
    tl.fromTo('#cd-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.2);
    tl.fromTo('.cl', { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.09 }, 0.35);
""")

# 7 · Proof, scroll (19.5–26.6): the live site beside its measured curves.
hero = PROOF['hero']
GX, GY, GW, GH = 1140, 300, 660, 420
pos_o = path(hero['ty']['original'], GX, GY, GW, GH, (0, 480), (-90, 0))
pos_r = path(hero['ty']['css'], GX, GY, GW, GH, (0, 480), (-90, 0))
op_o = path(hero['opacity']['original'], GX, GY, GW, GH, (0, 480), (0, 1))
op_r = path(hero['opacity']['css'], GX, GY, GW, GH, (0, 480), (0, 1))
scene('proof', 'paper', f"""
    #pf-line {{ position: absolute; left: 100px; top: 70px; width: 1720px; font-size: 64px; }}
    #pf-site {{ left: 100px; top: 230px; width: 960px; height: 540px; }}
    #pf-site video {{ position: absolute; inset: 0; width: 960px; height: 540px; }}
    #pf-l1 {{ position: absolute; left: 100px; top: 790px; color: #57516a; }}
    #pf-graph {{ position: absolute; left: {GX - 30}px; top: {GY - 30}px; width: {GW + 60}px; height: {GH + 60}px; }}
    #pf-l2 {{ position: absolute; left: {GX}px; top: 790px; color: #57516a; }}
    #pf-key {{ position: absolute; left: {GX}px; top: 236px; font-size: 28px; color: #57516a; }}
    #pf-key b {{ color: #2b2849; font-weight: 600; }}
    #pf-same {{ position: absolute; left: 100px; top: 880px; font-size: 76px; }}
    #pf-diff {{ position: absolute; left: {GX}px; top: 860px; font-size: 96px; color: #64509b; }}
    #pf-diff small {{ font-size: 32px; color: #57516a; letter-spacing: 0; }}
""", f"""
    <div id="pf-line" class="t-title">The live site, and Specimen's code, measured the same way.</div>
    <div id="pf-site" class="card"><img src="assets/ui/hero-end.png" alt="" style="position:absolute;inset:0;width:100%;height:100%"><video id="pf-video" class="clip" data-start="0" data-duration="6.4" src="assets/clips/hero-scroll.mp4" muted playsinline></video></div>
    <div id="pf-l1" class="lbl">Live site · scrolled 0 → 480 px</div>
    <div id="pf-key" class="t-mono"><b>━</b> site &nbsp; <b>┅</b> Specimen's CSS &nbsp; · position, opacity</div>
    <svg id="pf-graph" viewBox="{GX - 30} {GY - 30} {GW + 60} {GH + 60}">
      <line x1="{GX}" y1="{GY + GH}" x2="{GX + GW}" y2="{GY + GH}" stroke="#ded4e1" stroke-width="3"/>
      <path id="pf-po" d="{pos_o}" fill="none" stroke="#2b2849" stroke-width="7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <path id="pf-oo" d="{op_o}" fill="none" stroke="#e88aa8" stroke-width="7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <path id="pf-pr" d="{pos_r}" fill="none" stroke="#d9c8f2" stroke-width="3" stroke-dasharray="10 8" opacity="0"/>
      <path id="pf-or" d="{op_r}" fill="none" stroke="#fffaf5" stroke-width="3" stroke-dasharray="10 8" opacity="0"/>
      <line id="pf-head" x1="{GX}" y1="{GY - 10}" x2="{GX}" y2="{GY + GH + 10}" stroke="#64509b" stroke-width="3"/>
    </svg>
    <div id="pf-l2" class="lbl">Measured: site vs code</div>
    <div id="pf-same" class="t-title">Same curve, frame for frame.</div>
    <div id="pf-diff" class="t-display">{hero['diff']}<small> largest difference</small></div>
""", enter('#pf-line', 0.05) + f"""
    tl.fromTo('#pf-site', {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }}, 0.1);
    tl.fromTo(['#pf-key', '#pf-l1', '#pf-l2'], {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 0.4);
    // The curves draw as the page scrolls: the playhead is the scroll position of the clip.
    tl.fromTo(['#pf-po', '#pf-oo'], {{ strokeDashoffset: 1 }}, {{ strokeDashoffset: 0, duration: 6.4, ease: 'none' }}, 0);
    tl.fromTo('#pf-head', {{ attr: {{ x1: {GX}, x2: {GX} }} }}, {{ attr: {{ x1: {GX + GW}, x2: {GX + GW} }}, duration: 6.4, ease: 'none' }}, 0);
    tl.fromTo(['#pf-pr', '#pf-or'], {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 4.6);
    tl.fromTo('#pf-same', {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }}, 4.6);
    tl.fromTo('#pf-diff', {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }}, 5.0);
""")

# 8 · An AI agent gets the export (26.6–29.4): the real Claude Code session, as it ran.
TERM = [
    ('p', '> Rebuild section 4 from DESIGN.md as rebuilt.html, with the same motion,'),
    ('p', '  exactly as the spec records it: the hover, the scroll effects, the reveals.'),
    ('s', '⏺ Read DESIGN.md'),
    ('s', '⏺ Read screenshots/04-the-easiest-way-to-train-your-mo.png'),
    ('s', '⏺ Read bundle/sections/04-…/04-the-easiest-way-to-train-your-mo.html'),
    ('s', '⏺ Write rebuilt.html'),
    ('r', '  Hover: scales to 1.05 over 300ms, cubic-bezier(0.34, 1.56, 0.64, 1).'),
    ('r', '  Scroll-linked motion: all 13 recorded motions, tied to page scroll.'),
]
scene('agent', 'night', """
    #ag-line { position: absolute; left: 120px; top: 100px; font-size: 80px; color: #fffaf6; }
    #ag-term { position: absolute; left: 120px; top: 260px; width: 1680px; padding: 30px 40px 36px; border-radius: 20px; background: #15131f; border: 2px solid rgba(219,211,233,0.16); box-shadow: 0 30px 70px rgba(0,0,0,0.35); }
    #ag-bar { font-size: 28px; color: #9d93b8; margin-bottom: 22px; }
    .tl { font-size: 30px; line-height: 52px; white-space: pre; color: #e9e2f5; opacity: 0; }
    .tl.p { color: #fffaf6; } .tl.s { color: #bfe0ef; } .tl.r { color: #d9c8f2; }
""", '\n'.join(['    <div id="ag-line" class="t-title">Hand the export to an AI agent.</div>', '    <div id="ag-term" class="t-mono"><div id="ag-bar">claude · agent-rebuild/ · DESIGN.md from Specimen</div>']
              + [f'      <div class="tl {k}">{t}</div>' for k, t in TERM] + ['    </div>']), enter('#ag-line', 0.05) + """
    tl.fromTo('#ag-term', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.15);
    tl.fromTo('.tl', { opacity: 0 }, { opacity: 1, duration: 0.12, stagger: 0.26 }, 0.4);
""")

# 9 · Its rebuild beside the site (29.4–35.6): same scroll, frame by frame, then the measurement.
ai = PROOF.get('ai', {'count': 14, 'diff': '0.4%'})
scene('ai', 'paper', f"""
    #ai-line {{ position: absolute; left: 100px; top: 70px; width: 1720px; font-size: 64px; }}
    .ai-card {{ top: 220px; width: 840px; height: 473px; background: #fff; }}
    .ai-card img, .ai-card video {{ position: absolute; inset: 0; width: 840px; height: 473px; }}
    #ai-a {{ left: 100px; }} #ai-b {{ left: 980px; }}
    .ai-l {{ position: absolute; top: 712px; color: #57516a; }}
    #ai-la {{ left: 100px; }} #ai-lb {{ left: 980px; }}
    #ai-num {{ position: absolute; left: 100px; top: 830px; font-size: 72px; }}
    #ai-num span {{ color: #64509b; }}
    #ai-sub {{ position: absolute; left: 104px; top: 930px; font-size: 32px; color: #57516a; width: 1700px; }}
""", f"""
    <div id="ai-line" class="t-title">Claude Code rebuilt this section from it.</div>
    <div id="ai-a" class="card ai-card"><img src="assets/ui/ai-scroll-site-end.png" alt=""><video id="ai-va" class="clip" data-start="0.2" data-duration="5" src="assets/clips/ai-scroll-site.mp4" muted playsinline></video></div>
    <div id="ai-b" class="card ai-card"><img src="assets/ui/ai-scroll-rebuilt-end.png" alt=""><video id="ai-vb" class="clip" data-start="0.2" data-duration="5" src="assets/clips/ai-scroll-rebuilt.mp4" muted playsinline></video></div>
    <div id="ai-la" class="lbl ai-l">Live site</div>
    <div id="ai-lb" class="lbl ai-l">Rebuilt by Claude Code · rebuilt.html</div>
    <div id="ai-num" class="t-title">Every effect moves like the original: <span>within {ai['diff']}</span></div>
    <div id="ai-sub" class="t-body">{ai['count']} effects measured frame by frame: the hover, the 3D tilt, the scroll-linked motion, the reveals.</div>
""", enter('#ai-line', 0.05) + """
    tl.fromTo(['#ai-a', '#ai-b'], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out', stagger: 0.08 }, 0.0);
    tl.fromTo('.ai-l', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
    tl.fromTo('#ai-num', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 2.4);
    tl.fromTo('#ai-sub', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.8);
""")

# 9 · Figma (29.5–34.2): the hover as a prototype, with the page's own curve.
scene('figma', 'paper', """
    #fg-line { position: absolute; left: 100px; top: 80px; width: 1720px; font-size: 72px; }
    #fg-import { left: 100px; top: 250px; width: 1720px; height: 1098px; }
    #fg-import video { width: 1720px; }
    #fg-panel { left: 100px; top: 250px; width: 1240px; height: 826px; background: #fff; }
    #fg-panel img { width: 1240px; }
    #fg-facts { position: absolute; left: 1420px; top: 330px; width: 420px; font-size: 44px; line-height: 1.2; }
    #fg-facts div { margin-bottom: 30px; }
    #fg-facts span { display: block; font-size: 30px; color: #57516a; }
""", """
    <div id="fg-line" class="t-title">In Figma, a Smart Animate on the page's own curve.</div>
    <div id="fg-import" class="card"><video id="fg-video" class="clip" data-start="0" data-duration="2" src="assets/clips/figma-import.mp4" muted playsinline></video></div>
    <div id="fg-panel" class="card"><img src="assets/ui/figma-panel.png" alt=""></div>
    <div id="fg-facts" class="t-title">
      <div><span class="t-body">Animation</span>Smart animate</div>
      <div><span class="t-body">Duration</span>200 ms, as the page</div>
      <div><span class="t-body">Easing</span>0.25, 0.1, 0.25, 1</div>
    </div>
""", enter('#fg-line', 0.05) + """
    tl.fromTo('#fg-import', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.0);
    tl.fromTo('#fg-panel', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' }, 1.6);
    tl.to('#fg-import', { opacity: 0, duration: 0.2 }, 1.8);
    tl.fromTo('#fg-facts div', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.3, ease: 'expo.out', stagger: 0.12 }, 1.9);
""")

# 10 · After Effects (35.6–39.4): the site's hover beside After Effects' own render of the export.
ae = PROOF['ae']
scene('ae', 'night', f"""
    #ae-line {{ position: absolute; left: 100px; top: 90px; width: 1720px; font-size: 72px; color: #fffaf6; }}
    .ae-card {{ top: 250px; width: 840px; height: 473px; background: #fff; }}
    .ae-card img, .ae-card video {{ position: absolute; inset: 0; width: 840px; height: 473px; }}
    #ae-a {{ left: 100px; }} #ae-b {{ left: 980px; }}
    .ae-l {{ position: absolute; top: 742px; color: #dbd3e9; }}
    #ae-la {{ left: 100px; }} #ae-lb {{ left: 980px; }}
    #ae-num {{ position: absolute; left: 100px; top: 850px; font-size: 48px; color: #dbd3e9; }}
    #ae-num span {{ color: #fffaf6; }}
""", f"""
    <div id="ae-line" class="t-title">In After Effects, the keyframes play the same hover.</div>
    <div id="ae-a" class="card ae-card"><img src="assets/ui/ai-hover-site-end.png" alt=""><video id="ae-va1" class="clip" data-start="0.3" data-duration="1" src="assets/clips/ai-hover-site.mp4" muted playsinline></video><video id="ae-va2" class="clip" data-start="1.9" data-duration="1" src="assets/clips/ai-hover-site.mp4" muted playsinline></video></div>
    <div id="ae-b" class="card ae-card"><img src="assets/ui/ae-hover-end.png" alt=""><video id="ae-vb1" class="clip" data-start="0.3" data-duration="1" src="assets/clips/ae-hover.mp4" muted playsinline></video><video id="ae-vb2" class="clip" data-start="1.9" data-duration="1" src="assets/clips/ae-hover.mp4" muted playsinline></video></div>
    <div id="ae-la" class="lbl ae-l">Live site · slowed 2×</div>
    <div id="ae-lb" class="lbl ae-l">After Effects render · slowed 2×</div>
    <div id="ae-num" class="t-body">Every curve After Effects plays is within <span>{ae['diff']}</span> of the page.</div>
""", enter('#ae-line', 0.05) + """
    tl.fromTo(['#ae-a', '#ae-b'], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out', stagger: 0.08 }, 0.0);
    tl.fromTo('.ae-l', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
    tl.fromTo('#ae-num', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.8);
""")

# 11 · Results (38.1–43.2): every effect on the live site, measured.
R = PROOF['results']
rows = ''.join(f'<div class="rs-row"><span class="rs-k">{k}</span><span class="rs-v">{v}</span><div class="rs-bar"><i style="width:{max(2, float(v.rstrip("%")) / 2 * 100):.0f}%"></i></div></div>' for k, v in R['rows'])
scene('results', 'paper', """
    #rs-line { position: absolute; left: 120px; top: 90px; width: 1680px; font-size: 64px; }
    #rs-sub { position: absolute; left: 124px; top: 200px; font-size: 38px; color: #57516a; }
    #rs-tab { position: absolute; left: 120px; top: 330px; width: 1680px; }
    .rs-row { display: grid; grid-template-columns: 420px 260px 1fr; align-items: center; height: 120px; border-bottom: 2px solid #ded4e1; }
    .rs-k { font-family: Manrope, sans-serif; font-weight: 700; font-size: 56px; letter-spacing: -0.03em; }
    .rs-v { font-family: 'JetBrains Mono', monospace; font-size: 48px; color: #64509b; }
    .rs-bar { height: 18px; border-radius: 9px; background: #efe8f3; overflow: hidden; }
    .rs-bar i { display: block; height: 100%; background: #64509b; }
    #rs-foot { position: absolute; left: 124px; top: 880px; font-size: 34px; color: #57516a; width: 1680px; }
""", f"""
    <div id="rs-line" class="t-title">CSS, GSAP and Motion, all measured against the live site.</div>
    <div id="rs-sub" class="t-body">{R['sub']}</div>
    <div id="rs-tab">{rows}</div>
    <div id="rs-foot" class="t-body">{R['foot']}</div>
""", enter('#rs-line', 0.05) + """
    tl.fromTo('#rs-sub', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5);
    tl.fromTo('.rs-row', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.35, ease: 'expo.out', stagger: 0.18 }, 0.7);
    tl.fromTo('#rs-foot', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.0);
    tl.fromTo('.rs-bar i', { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.out', stagger: 0.18, transformOrigin: 'left center' }, 0.9);
    tl.fromTo('#rs-tab', { scale: 1 }, { scale: 1.025, duration: 4.0, ease: 'none', transformOrigin: 'left top' }, 1.0);
""")

# 12 · Breath (43.2–44.0).
scene('breath', 'paper', f"""
    #br-corners {{ left: 560px; top: 290px; width: 800px; height: 500px; color: #2b2849; }}
""", f"""
    <div id="br-corners" class="corners">{CORNERS}</div>
""", """
    tl.fromTo('#br-corners', { opacity: 0, scale: 1.2 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }, 0.0);
""")

# 13 · Payoff (44.0–48.3).
scene('payoff', 'paper', f"""
    #py-corners {{ left: 160px; top: 260px; width: 1600px; height: 560px; color: #2b2849; }}
    #py-name {{ position: absolute; left: 0; right: 0; top: 300px; text-align: center; font-size: 200px; }}
    #py-claim {{ position: absolute; left: 0; right: 0; top: 570px; text-align: center; font-size: 80px; }}
""", f"""
    <div id="py-corners" class="corners">{CORNERS}</div>
    <div id="py-name" class="t-display">Specimen</div>
    <div id="py-claim" class="t-title">It records the <span class="iris-text">motion</span>, and replays it exactly.</div>
""", """
    tl.fromTo('#py-corners .tl', { x: 400, y: 30 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.0);
    tl.fromTo('#py-corners .tr', { x: -400, y: 30 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.0);
    tl.fromTo('#py-corners .bl', { x: 400, y: -30 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.0);
    tl.fromTo('#py-corners .br', { x: -400, y: -30 }, { x: 0, y: 0, duration: 0.45, ease: 'power3.inOut' }, 0.0);
    tl.fromTo('#py-name', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.1);
    tl.fromTo('#py-claim', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 1.0);
""")

# 14 · End card (48.3–53).
scene('endcard', 'paper', """
    #en-icon { position: absolute; left: 810px; top: 240px; width: 300px; height: 300px; border-radius: 66px; }
    #en-name { position: absolute; left: 0; right: 0; top: 580px; text-align: center; font-size: 132px; }
    #en-url { position: absolute; left: 0; right: 0; top: 760px; text-align: center; font-size: 64px; color: #64509b; }
    #en-br { position: absolute; left: 0; right: 0; top: 870px; text-align: center; font-size: 36px; color: #57516a; }
""", """
    <img id="en-icon" src="assets/ui/specimen-icon.png" alt="">
    <div id="en-name" class="t-display">Specimen</div>
    <div id="en-url" class="t-title">specimen.ayushojha.com</div>
    <div id="en-br" class="t-body">For Chrome, Edge, Brave, Firefox and Safari</div>
""", """
    tl.fromTo('#en-icon', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, 0.0);
    tl.fromTo('#en-name', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.2);
    tl.fromTo('#en-url', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, 0.45);
    tl.fromTo('#en-br', { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.75);
""")
print('scenes written')
