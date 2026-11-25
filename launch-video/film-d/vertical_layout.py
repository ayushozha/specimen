"""9:16 (1080×1920) layout for film D: CSS appended to each scene, same markup and timing.
Reading text stays inside the platforms' safe area (left 100, about 820 wide, below the top bar)."""

VERT = {
    'shot': """
    #shot-line { left: 100px; top: 320px; width: 820px; font-size: 80px; }
    #shot-card { left: 60px; top: 700px; width: 960px; height: 459px; }
    #shot-tag { left: 100px; top: 1190px; }
""",
    'moves': """
    #mv-video { width: 1080px; height: 1920px; object-position: 78% 50%; }
    #mv-scrim { height: 760px; }
    #mv-line { left: 100px; top: 300px; width: 820px; font-size: 104px; }
""",
    'title': """
    #ti-icon { left: 100px; top: 440px; }
    #ti-line { left: 100px; top: 640px; width: 860px; font-size: 128px; }
    #ti-corners { left: 60px; top: 600px; width: 960px; height: 520px; }
""",
    'choose': """
    #ch-line { left: 100px; top: 260px; width: 820px; font-size: 68px; }
    #ch-a, #ch-b { left: 60px; top: 520px; width: 470px; height: 880px; }
    #ch-a img, #ch-b img { width: 470px; }
    #ch-site { left: 560px; top: 520px; width: 460px; height: 274px; }
    #ch-site img { width: 460px; }
    #ch-cap { left: 560px; top: 830px; width: 420px; font-size: 34px; }
""",
    'capture': """
    #cp-line { left: 100px; top: 260px; width: 820px; font-size: 66px; }
    #cp-list { left: 100px; top: 470px; font-size: 38px; }
    #cp-panel { left: 270px; top: 800px; width: 540px; height: 700px; }
    #cp-panel video, #cp-end { width: 540px; height: 1036px; }
""",
    'code': """
    #cd-line { left: 100px; top: 280px; width: 820px; font-size: 72px; }
    #cd-card { left: 30px; top: 520px; width: 1020px; padding: 28px 24px; }
    .cl { font-size: 22px; line-height: 34px; white-space: pre-wrap; }
""",
    'proof': """
    #pf-line { left: 100px; top: 260px; width: 820px; font-size: 58px; }
    #pf-site { left: 60px; top: 480px; }
    #pf-l1 { left: 60px; top: 1040px; }
    #pf-key { left: 100px; top: 1100px; }
    #pf-graph { left: 150px; top: 1150px; width: 780px; height: 520px; }
    #pf-l2 { display: none; }
    #pf-same { display: none; }
    #pf-diff { left: 100px; top: 1690px; font-size: 64px; }
""",
    'agent': """
    #ag-line { left: 100px; top: 260px; width: 820px; font-size: 72px; }
    #ag-term { left: 30px; top: 520px; width: 1020px; padding: 24px 24px 28px; }
    #ag-bar { font-size: 22px; }
    .tl { font-size: 22px; line-height: 38px; white-space: pre-wrap; }
""",
    'ai': """
    #ai-line { left: 100px; top: 250px; width: 820px; font-size: 60px; }
    .ai-card { width: 960px; height: 540px; }
    .ai-card img, .ai-card video { width: 960px; height: 540px; }
    #ai-a { left: 60px; top: 440px; } #ai-b { left: 60px; top: 1050px; }
    #ai-la { left: 60px; top: 990px; } #ai-lb { left: 60px; top: 1600px; }
    #ai-num { left: 100px; top: 1660px; width: 880px; font-size: 44px; }
    #ai-sub { display: none; }
""",
    'figma': """
    #fg-line { left: 100px; top: 260px; width: 820px; font-size: 64px; }
    #fg-import { left: 0; top: 520px; width: 1080px; height: 690px; border-radius: 0; }
    #fg-import video { width: 1080px; }
    #fg-panel { left: 30px; top: 520px; width: 1020px; height: 680px; }
    #fg-panel img { width: 1020px; }
    #fg-facts { left: 100px; top: 1240px; width: 820px; font-size: 44px; }
""",
    'ae': """
    #ae-line { left: 100px; top: 250px; width: 820px; font-size: 54px; }
    .ae-card { width: 960px; height: 540px; }
    .ae-card img, .ae-card video { width: 960px; height: 540px; }
    #ae-a { left: 60px; top: 470px; } #ae-b { left: 60px; top: 1070px; }
    #ae-la { left: 60px; top: 1020px; } #ae-lb { left: 60px; top: 1620px; }
    #ae-num { left: 100px; top: 1680px; width: 880px; font-size: 36px; }
""",
    'results': """
    #rs-line { left: 100px; top: 260px; width: 820px; font-size: 60px; }
    #rs-sub { left: 100px; top: 470px; width: 820px; font-size: 34px; }
    #rs-tab { left: 100px; top: 620px; width: 880px; }
    .rs-row { grid-template-columns: 260px 220px 1fr; height: 110px; }
    .rs-k { font-size: 48px; }
    .rs-v { font-size: 40px; }
    #rs-foot { left: 100px; top: 1020px; width: 820px; font-size: 32px; }
""",
    'breath': """
    #br-corners { left: 140px; top: 660px; width: 800px; height: 500px; }
""",
    'payoff': """
    #py-corners { left: 60px; top: 640px; width: 960px; height: 600px; }
    #py-name { top: 700px; font-size: 180px; }
    #py-claim { top: 950px; left: 100px; right: 100px; font-size: 64px; }
""",
    'endcard': """
    #en-icon { left: 390px; top: 560px; }
    #en-name { top: 900px; font-size: 112px; left: 140px; right: 140px; }
    #en-url { top: 1060px; font-size: 46px; left: 140px; right: 140px; }
    #en-br { top: 1150px; left: 160px; right: 160px; font-size: 32px; }
""",
}
