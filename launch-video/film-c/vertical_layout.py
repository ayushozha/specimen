"""9:16 (1080x1920) layout for the Specimen launch film: per scene, CSS that overrides the 16:9
positions (same markup, same timing) and any JS strings to swap where a tween carries a position."""

VERT = {
    'hook': ("""
    #hook-a { left: 100px; top: 430px; width: 820px; font-size: 72px; }
    #hook-b { left: 100px; top: 760px; width: 820px; font-size: 120px; }
    #hook-corners { left: 60px; top: 720px; width: 1000px; height: 480px; }
    #hook-url { left: 100px; top: 1380px; width: 820px; font-size: 46px; line-height: 1.3; }
""", []),
    'ink': ("""
    #ink-video { width: 1080px; height: 1920px; object-position: 80% 50%; }
    #ink-scrim { height: 620px; }
    #ink-cap { left: 100px; top: 260px; width: 800px; font-size: 104px; }
""", []),
    'shot': ("""
    #shot-full { width: 1080px; height: 1920px; object-position: 80% 50%; }
    #shot-line { left: 100px; top: 380px; width: 820px; font-size: 112px; }
    #shot-card { left: 100px; top: 1000px; width: 900px; height: 430px; }
    #shot-label { left: 100px; top: 1470px; font-size: 38px; }
""", []),
    'sweep': ("""
    #sweep-title { left: 100px; top: 250px; width: 800px; font-size: 64px; }
    #sweep-frame { left: 60px; top: 470px; width: 960px; height: 460px; }
    #sweep-still, #sweep-video { width: 960px; height: 460px; }
    #sweep-corners { width: 1012px; height: 512px; }
    #sweep-cap { left: 100px; top: 950px; font-size: 38px; }
    #sweep-panel { left: 290px; top: 1030px; width: 500px; height: 640px; }
    #sweep-panel video { width: 500px; height: 958px; }
""", []),
    'fade': ("""
    #fade-num { left: 100px; top: 260px; font-size: 230px; }
    #fade-sub { left: 100px; top: 540px; width: 800px; font-size: 38px; }
    #fade-curve { left: 100px; top: 630px; width: 800px; height: 170px; }
    #fade-card { left: 210px; top: 860px; width: 660px; height: 680px; }
    #fade-hl { left: 220px; top: 974px; }
""", []),
    'shader': ("""
    #shader-title { left: 100px; top: 260px; width: 800px; font-size: 76px; }
    #shader-sub { left: 100px; top: 460px; font-size: 38px; }
    #shader-code { left: 30px; top: 580px; width: 1020px; padding: 36px 28px; }
    .sl { font-size: 28px; line-height: 44px; white-space: pre-wrap; }
""", []),
    'code': ("""
    #code-title { left: 100px; top: 260px; width: 800px; font-size: 76px; }
    #code-card { left: 40px; top: 470px; width: 1000px; padding: 34px 36px; }
    .cl { font-size: 31px; }
    #code-curve { left: 100px; top: 740px; width: 880px; height: 290px; }
    #code-prev { left: 240px; top: 1060px; width: 600px; height: 380px; }
    #code-prev video { width: 600px; height: 600px; }
    #code-match { left: 240px; top: 1470px; font-size: 44px; }
""", []),
    'figma': ("""
    #figma-title { left: 100px; top: 260px; width: 780px; font-size: 68px; }
    #figma-import { left: 0; top: 520px; width: 1080px; height: 690px; border-radius: 0; }
    #figma-import video { width: 1080px; }
    #figma-panel { left: 30px; top: 480px; width: 1020px; height: 680px; }
    #figma-panel img { width: 1020px; }
    #figma-facts { left: 100px; top: 1220px; width: 820px; font-size: 52px; }
    #figma-facts span { font-size: 32px; }
""", []),
    'ae': ("""
    #ae-title { left: 100px; top: 280px; width: 800px; font-size: 80px; }
    #ae-sub { left: 100px; top: 500px; width: 800px; font-size: 40px; }
    #ae-clip { left: 0; top: 700px; width: 1080px; height: 598px; }
    #ae-clip video { width: 2496px; height: 598px; margin-left: -420px; }
""", []),
    'agent': ("""
    #agent-title { left: 100px; top: 260px; width: 800px; font-size: 76px; }
    #agent-doc { left: 24px; top: 520px; width: 1032px; padding: 34px 26px; }
    #agent-file { font-size: 30px; }
    .al { font-size: 31px; line-height: 50px; white-space: normal; }
""", []),
    'breath': ("""
    #breath-corners { left: 140px; top: 660px; width: 800px; height: 500px; }
""", []),
    # Corners open from the breath box (800x500 at 140,660) to the title box (960x600 at 60,640).
    'payoff': ("""
    #pay-corners { left: 60px; top: 640px; width: 960px; height: 600px; }
    #pay-grid { left: 180px; top: 700px; width: 720px; height: 420px; }
    #pay-name { top: 700px; font-size: 200px; }
    #pay-claim { top: 960px; font-size: 80px; }
""", [
        ("'#pay-corners .tl', { x: 350, y: 20 }", "'#pay-corners .tl', { x: 80, y: 20 }"),
        ("'#pay-corners .tr', { x: -350, y: 20 }", "'#pay-corners .tr', { x: -80, y: 20 }"),
        ("'#pay-corners .bl', { x: 350, y: -40 }", "'#pay-corners .bl', { x: 80, y: -80 }"),
        ("'#pay-corners .br', { x: -350, y: -40 }", "'#pay-corners .br', { x: -80, y: -80 }"),
    ]),
    'endcard': ("""
    #end-icon { left: 390px; top: 560px; }
    #end-name { top: 900px; font-size: 112px; left: 140px; right: 140px; }
    #end-url { top: 1060px; font-size: 46px; left: 140px; right: 140px; }
    #end-browsers { top: 1140px; left: 160px; right: 160px; font-size: 32px; }
""", []),
}
