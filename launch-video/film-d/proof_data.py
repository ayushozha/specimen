"""Builds .media/proof.json: every number and curve the film shows, from a real `specimen verify` run.

Usage: python3 proof_data.py <verify dir: bundle zip, *.verify.json with traces, x/ unzipped, ae.txt>
"""
import glob
import json
import re
import sys
from pathlib import Path

d = Path(sys.argv[1])
v = json.load(open(glob.glob(str(d / '*.verify.json'))[0]))
rep = {r['id']: (s['section'], r) for s in json.load(open(d / 'x/exports/code/replication.json')) for r in s['replicas']}
eff = {e['id']: e for e in v['effects']}
tr = {(t['id'], t['kind']): t for t in v.get('traces', [])}


def pct(x):
    return f'{x * 100:.1f}%'


def rel(trace, prop, lo=None, hi=None):
    base = trace[0][1][prop]
    pts = [(x, s[prop] - (base if prop in ('tx', 'ty') else 0)) for x, s in trace]
    return [(x, y) for x, y in pts if (lo is None or x >= lo) and (hi is None or x <= hi)]


# The hero: a scroll-linked effect moving and fading over different ranges.
hero_id = next(i for i, (sec, r) in rep.items() if sec.startswith('02') and r['trigger'] == 'scroll-linked' and set((r.get('ranges') or {})) == {'ty', 'opacity'})
h = eff[hero_id]
hero = {
    'ty': {'original': rel(tr[(hero_id, 'css')]['original'], 'ty', 0, 480), 'css': rel(tr[(hero_id, 'css')]['replica'], 'ty', 0, 480)},
    'opacity': {'original': rel(tr[(hero_id, 'css')]['original'], 'opacity', 0, 480), 'css': rel(tr[(hero_id, 'css')]['replica'], 'opacity', 0, 480)},
    'diff': pct(max(h['css'], h['gsap'], h['motion'])),
}
css = rep[hero_id][1]['css'].strip().splitlines()
hero_css = [l for l in css if not l.startswith('/*')]

# The hover: an overshoot, site against the GSAP and Motion code.
hov_id = next(i for i, (sec, r) in rep.items() if r['name'] == 'Watch it in action hover')
e = eff[hov_id]
o = tr[(hov_id, 'gsap')]['original']
ms = 400
scale = {'original': rel(o, 'scale', 0, ms), 'gsap': rel(tr[(hov_id, 'gsap')]['replica'], 'scale', 0, ms), 'motion': rel(tr[(hov_id, 'motion')]['replica'], 'scale', 0, ms)}
vals = [y for k in scale.values() for _, y in k]
hover = {'scale': scale, 'peak': round(max(y for _, y in scale['original']), 3), 'rest': round(scale['original'][-1][1], 3), 'ms': ms, 'range': [min(vals) - 0.005, max(vals) + 0.005], 'diff': pct(max(e['css'], e['gsap'], e['motion']))}

# After Effects: the evaluated keyframes against the page's curves.
ae_lines = [l for l in (d / 'ae.txt').read_text().splitlines() if re.match(r'\s*[\d.]+%', l)]
ae_vals = [float(l.split('%')[0]) / 100 for l in ae_lines]
ae = {'count': len(ae_vals), 'diff': pct(max(ae_vals))}

# Every checked effect on the live site.
checked = [e for e in v['effects'] if e['css'] is not None]
kinds = sorted({e['trigger'] for e in checked})
rows = [(k, pct(max(e[k.lower()] for e in checked if e[k.lower()] is not None))) for k in ['CSS', 'GSAP', 'Motion']]
names = {'hover': 'hovers', 'scroll-reveal': 'scroll reveals', 'scroll-linked': 'scroll-linked motion'}
results = {
    'rows': rows,
    'sub': f"{len(checked)} effects on a live site: {', '.join(names[k] for k in kinds)}.",
    'foot': 'Largest difference of any effect. 0% is identical.',
}
# The AI rebuild, measured against the site (specimen verify --against rebuilt.html).
agent = json.load(open(glob.glob(str(Path(__file__).parent.parent / 'footage/agent-rebuild/*.verify.json'))[0]))
aiv = [e['against'] for e in agent['effects'] if e.get('against') is not None]
ai = {'count': len(aiv), 'diff': pct(max(aiv))}
json.dump({'ai': ai, 'heroCss': hero_css, 'hero': hero, 'hover': hover, 'ae': ae, 'results': results}, open(Path(__file__).parent / '.media/proof.json', 'w'), indent=1)
print(json.dumps({'hero': hero['diff'], 'hover': hover['diff'], 'ae': ae, 'results': results}, indent=1))
