"""Compares what After Effects evaluates (ae-dump.jsx output) with the curve the page itself plays.

The reference is the CSS easing of each captured effect (from the bundle's replication.json), evaluated
here independently: cubic-bezier by bisection, linear() by its stops. Reports the largest difference
as a share of how far the property moves.
Usage: python3 ae_compare.py <dump.json> <replication.json>
"""
import json
import re
import sys


def bezier(x1, y1, x2, y2):
    def f(x):
        lo, hi, t = 0.0, 1.0, x
        for _ in range(60):
            v = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3
            if abs(v - x) < 1e-9:
                break
            lo, hi = (t, hi) if v < x else (lo, t)
            t = (lo + hi) / 2
        return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3
    return f


NAMED = {'linear': (0, 0, 1, 1), 'ease': (0.25, 0.1, 0.25, 1), 'ease-in': (0.42, 0, 1, 1), 'ease-out': (0, 0, 0.58, 1), 'ease-in-out': (0.42, 0, 0.58, 1)}


def easing(css):
    css = css.strip()
    if css in NAMED:
        return bezier(*NAMED[css])
    m = re.match(r'cubic-bezier\(([^)]+)\)', css)
    if m:
        return bezier(*[float(v) for v in m.group(1).split(',')])
    m = re.match(r'linear\((.+)\)$', css)
    if m:
        pts = []
        parts = [p.strip().split() for p in m.group(1).split(',')]
        for i, p in enumerate(parts):
            x = float(p[1].rstrip('%')) / 100 if len(p) > 1 else None
            pts.append([x, float(p[0])])
        pts[0][0] = 0 if pts[0][0] is None else pts[0][0]
        pts[-1][0] = 1 if pts[-1][0] is None else pts[-1][0]
        for i in range(1, len(pts) - 1):
            if pts[i][0] is None:
                j = i
                while pts[j][0] is None:
                    j += 1
                pts[i][0] = pts[i - 1][0] + (pts[j][0] - pts[i - 1][0]) / (j - i + 1)

        def f(x):
            for i in range(1, len(pts)):
                if x <= pts[i][0]:
                    x0, y0 = pts[i - 1]
                    x1, y1 = pts[i]
                    return y1 if x1 == x0 else y0 + (y1 - y0) * (x - x0) / (x1 - x0)
            return pts[-1][1]
        return f
    raise ValueError(css)


PROP = {'Opacity': ('opacity', 100), 'Scale': ('scale', 100), 'Rotation': ('rotate', 1), 'X Position': ('tx', 1), 'Y Position': ('ty', 1)}


def main():
    dump = json.load(open(sys.argv[1]))
    sections = json.load(open(sys.argv[2]))
    slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    seen = {}
    for d in dump:
        if d['layer'].startswith('Background'):
            continue
        key, mult = PROP[d['prop']]
        # The comp is the section; layers with the same name are its replicas of that name, in order.
        sec = next((s for s in sections if s['section'].split('-', 1)[1].startswith(slug(d['comp'])[:30])), None)
        cands = [r for r in (sec['replicas'] if sec else []) if r.get('spec') and r.get('inCode') and (d['layer'] == r['name'] or d['layer'].startswith(r['name']))]
        n = seen.setdefault((d['comp'], d['layer'], d['prop']), 0)
        seen[(d['comp'], d['layer'], d['prop'])] += 1
        spec = cands[n]['spec'] if n < len(cands) else None
        if not spec or key not in spec['tracks']:
            print(f"   –     {d['comp']} · {d['layer']} · {d['prop']}: no reference")
            continue
        keys = spec['tracks'][key]
        dur = (spec['durationMs'] or 1) / 1000
        if d['layer'].endswith('(1px scroll = 1ms)'):
            dur = (d['samples'][-1][0]) or dur

        def expected(t):
            o = t / dur
            if o <= keys[0]['offset']:
                return keys[0]['value'] * mult
            for a, b in zip(keys, keys[1:]):
                if o <= b['offset']:
                    u = (o - a['offset']) / max(1e-9, b['offset'] - a['offset'])
                    return (a['value'] + (b['value'] - a['value']) * easing(a['easing'])(u)) * mult
            return keys[-1]['value'] * mult
        s0 = d['samples'][0][1]
        e0 = expected(0)
        exp = [expected(t) - e0 for t, _ in d['samples']]
        act = [v - s0 for _, v in d['samples']]
        rng = max(exp) - min(exp) or 1
        worst = max(abs(a - e) for a, e in zip(act, exp)) / rng
        print(f"{worst * 100:5.1f}%   {d['comp']} · {d['layer']} · {d['prop']}")


main()
