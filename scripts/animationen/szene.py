"""Animationen je Abzeichen aus Darias Vorlagen (2026-11-02).
Aufruf: python3 szene.py Ocular owning|received
Liest die Vorlage, erkennt Himmel, Wellen, kleine und große Illustration, baut daraus
  owning:   kleine Illustration schwimmt herein und bleibt auf den Wellen (wie Bottle Reward)
  received: kleine Illustration holt Schwung, steigt auf, wird zur großen und strahlt (wie Badge Received)
Bitseps schwimmt nicht: Der Arm steht an seiner Stelle, mit Lichtrand von Anfang an.
"""
import os as _os
REPO = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), '..', '..')) + '/'
AUSORDNER = _os.environ.get('AUS', _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'aus')) + '/'
_os.makedirs(AUSORDNER + 'video', exist_ok=True)

import re, sys, math, base64, io, json
import numpy as np
from PIL import Image
from skimage import measure
from svgpathtools import parse_path, CubicBezier, Line, Path as SPath
from shapely.geometry import Polygon, LineString

VORL = REPO + 'Übergabe/Animationen/Vorlagen/'
ICONS = REPO + 'Übergabe/Abzeichen-Icons/'
S = AUSORDNER
NAME, MODE = sys.argv[1], sys.argv[2]
LICHT = '#F3EEE8'      # Warmweiß der App (Daria, 2026-11-02)
LINIE = '#191716'      # Linie außen um den Lichtrand
STRAHL = '#6155F5' if NAME == 'Steuerrad' else LICHT   # auf gelbem Himmel lila Strahlen
src = open(VORL + NAME + '.svg').read()
defs = re.search(r'<defs>.*</defs>', src, re.S).group(0)
body = src[src.index('>', src.index('<g clip-path')) + 1: src.index('<defs>')]
body = body[:body.rindex('</g>')]
ELEM = re.findall(r'<(?:path|use|image)\b[^>]*/>', body)
stroke_d = {m.group(1): m.group(2) for m in re.finditer(r'<path id="([^"]+)"[^>]*? d="([^"]+)"', defs)}

def geom(el):
    if el.startswith('<image'):
        a = {k: float(v) for k, v in re.findall(r'(x|y|width|height)="([-\d.]+)"', el)}
        x, y = a.get('x', 0), a.get('y', 0)
        return None, (x, y, x + a['width'], y + a['height'])
    d = re.search(r' d="([^"]+)"', el)
    if d: d = d.group(1)
    else: d = stroke_d[re.search(r'href="#([^"]+)"', el).group(1)]
    p = parse_path(d); x0, x1, y0, y1 = p.bbox()
    return d, (x0, y0, x1, y1)

# --- Ebenen: aufeinanderfolgende <use> mit gleichem Pfad gehören zusammen
layers = []
for el in ELEM:
    d, bb = geom(el)
    ref = re.search(r'href="#([^"]+)"', el)
    key = ref.group(1) if ref and el.startswith('<use') else id(el)
    if layers and layers[-1]['key'] == key:
        layers[-1]['els'].append(el); continue
    layers.append(dict(key=key, els=[el], d=d, bb=bb, img=el.startswith('<image')))
sky = layers.pop(0)
for L in layers:
    x0, y0, x1, y1 = L['bb']
    L['welle'] = (not L['img']) and (x0 < -50 or x1 > 920) and (x1 - x0) > 900
waves = [L for L in layers if L['welle']]
illus = [L for L in layers if not L['welle']]
first_illu = layers.index(illus[0]) if illus else len(layers)
back = [L for L in layers[:first_illu] if L['welle']]
front = [L for L in layers[first_illu:] if L['welle']]

# kleine und große Illustration: In Darias Vorlagen steht die kleine zuerst, dann die große
KLEIN = {'Ocular': 2, 'Steuerrad': 2, 'Anchor': 1, 'Bitseps': 0}[NAME]
small = illus[:KLEIN] or None; big = illus[KLEIN:]
for L in illus: print('  Illustration', 'klein' if small and L in small else 'groß', [round(v) for v in L['bb']], len(L['els']))
def gbb(g):
    return (min(o['bb'][0] for o in g), min(o['bb'][1] for o in g), max(o['bb'][2] for o in g), max(o['bb'][3] for o in g))

def punkte(g):
    pts = []
    for L in g:
        if L['img']:
            x0, y0, x1, y1 = L['bb']
            b64 = re.search(r'base64,([A-Za-z0-9+/=]+)', L['els'][0]).group(1)
            im = np.array(Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA'))[..., 3]
            ys, xs = np.nonzero(im[::6, ::6] > 128)
            pts += list(zip(x0 + xs * 6 * (x1 - x0) / im.shape[1], y0 + ys * 6 * (y1 - y0) / im.shape[0]))
        else:
            for sp in parse_path(L['d']).continuous_subpaths():
                pts += [(z.real, z.imag) for z in [sp.point(t / 60) for t in range(60)]]
    return np.array(pts)

def pca(P):
    c = P.mean(0); u, s, vt = np.linalg.svd(P - c, full_matrices=False); ax = vt[0]
    proj = (P - c) @ ax
    return c, math.degrees(math.atan2(ax[1], ax[0])), proj.max() - proj.min()

# --- Scheibe aus dem Himmelsbild
b64 = re.search(r'base64,([A-Za-z0-9+/=]+)', sky['els'][0]).group(1)
alpha = np.array(Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA'))[..., 3]
ix, iy, ix1, iy1 = sky['bb']
cont = max(measure.find_contours(np.pad(alpha, 2), 128), key=len)[::6]
disc = 'M' + ' L'.join(f'{ix + (p[1] - 2) / alpha.shape[1] * (ix1 - ix):.1f} {iy + (p[0] - 2) / alpha.shape[0] * (iy1 - iy):.1f}' for p in cont) + 'Z'

# --- Wellen periodisch machen
def kontur(d):
    # Oberkante: kleinstes y des Umrisses je Spalte (robust gegen Selbstüberschneidung und Teilpfade)
    best = {}
    for seg in parse_path(d):
        n = max(int(seg.length() * 2), 4)
        for t in np.linspace(0, 1, n):
            z = seg.point(t); x = int(round(z.real))
            if x not in best or z.imag < best[x]: best[x] = z.imag
    xs = sorted(best)
    lo, hi = xs[0] + 22, xs[-1] - 21
    return {x: best[x] for x in xs if lo <= x <= hi}
def periode(Y):
    best = None
    for L in range(200, 1750):
        common = [x for x in Y if x + L in Y]
        if len(common) < 150: continue
        e = np.mean([abs(Y[x] - Y[x + L]) for x in common])
        if best is None or e < best[0]: best = (e, L)
    return best[1]
def periodisch(Y, L):
    yy = np.full(L, np.nan)
    for x, y in Y.items(): yy[x % L] = y
    known = ~np.isnan(yy)
    for i in np.where(~known)[0]:
        if known[(i - 1) % L] and known[(i + 1) % L]: yy[i] = (yy[(i - 1) % L] + yy[(i + 1) % L]) / 2; known[i] = True
    while not known.all():
        starts = np.where(~known & np.roll(known, 1))[0]
        runs = []
        for a0 in starts:
            n = 0
            while not known[(a0 + n) % L]: n += 1
            runs.append((n, int(a0)))
        gap, a = max(runs); m = 20
        Yt = np.concatenate([yy, yy, yy]); off = L
        left = Yt[off + a - m:off + a]; right = Yt[off + a + gap:off + a + gap + m]
        best = None
        for s0 in range(L):
            w = Yt[off + s0 - m:off + s0 + gap + m]
            if np.isnan(w).any(): continue
            err = np.mean(np.abs(left - w[:m] - np.mean(left - w[:m]))) + np.mean(np.abs(right - w[-m:] - np.mean(right - w[-m:])))
            if best is None or err < best[0]: best = (err, w)
        w = best[1]; e0 = left[-1] - w[m - 1]; e1 = right[0] - w[m + gap]
        fill = w[m:m + gap] + np.linspace(e0, e1, gap + 2)[1:-1]
        for j in range(gap): yy[(a + j) % L] = fill[j]; known[(a + j) % L] = True
    return yy
def pd_fill(v):
    i = np.arange(len(v)); ok = ~np.isnan(v); return np.interp(i, i[ok], v[ok])
TAKT = [(26, 3, 4.2), (20, 4, 3.6), (25.6, 5, 3.2), (13, 6, 2.8)]   # Dauer, Heben px, Heben-Periode je Tiefe
import os
VIDEO = os.environ.get('VIDEO') == '1'   # für Videos: alle Takte teilen 25,6 s, so ist die Schleife nahtlos
if VIDEO: TAKT = [(25.6, 3, 25.6 / 6), (25.6, 4, 3.2), (25.6, 5, 3.2), (12.8, 6, 2.56)]
alle = back + front
for i, L in enumerate(alle):
    Y = kontur(L['d']); top = min(Y.values())
    Y = {x: y for x, y in Y.items() if y < top + 60}          # Bodenstreifen und Seitenkanten weg
    L['L'] = periode(Y); L['yy'] = periodisch(Y, L['L'])
    if np.abs(np.diff(L['yy'])).max() > 6:                      # Vorlage nur im sichtbaren Teil gezeichnet: von Kamm zu Kamm kacheln
        xs = sorted(Y); runs = []; cur = [xs[0]]
        for x in xs[1:]:
            if x - cur[-1] <= 2: cur.append(x)
            else: runs.append(cur); cur = [x]
        runs.append(cur); run = max(runs, key=len)
        yv = np.array([Y.get(x, np.nan) for x in range(run[0], run[-1] + 1)]); yv = np.array(pd_fill(yv))
        pk = [i for i in range(3, len(yv) - 3) if yv[i] == yv[i - 3:i + 4].min() and yv[i] < top + 8]
        a, b = pk[0], pk[-1]; seg = yv[a:b]; seg = seg + np.linspace(0, seg[0] - yv[b], len(seg))
        L['L'] = len(seg); L['yy'] = seg; print('  gekachelt von Kamm', run[0] + a, 'bis', run[0] + b)
    L['dir'] = 1 if L['bb'][0] < -50 else -1
    k = min(i, 3) if len(alle) == 4 else [0, 1, 2, 3][min(i, 3)]
    L['dur'], L['amp'], L['bob'] = TAKT[min(i, 3)]
    if front and L is front[0]: L['dur'], L['amp'], L['bob'] = 25.6, 5, 3.2    # die Welle vor der Illustration: langsam
    print('Welle', i, 'Periode', L['L'], 'Richtung', L['dir'], 'Dauer', L['dur'])

# --- CSS und Masken
css = []; masks = []; rects = {}
def fills(L):
    out = []
    for el in L['els']:
        f = re.search(r'fill="[^"]*"(?: fill-opacity="[^"]*")?', el).group(0)
        out.append(f)
    return out
for i, L in enumerate(alle):
    c = f'w{i}'; Lp = L['L']
    xs = np.arange(-Lp - 40, 870 + Lp + 40, 2)
    d = 'M' + ' L'.join(f'{x:.0f} {L["yy"][int(x) % Lp]:.1f}' for x in xs) + f' L{xs[-1]} 960 L{xs[0]} 960Z'
    css.append(f'.lauf-{c}{{animation:lauf-{c} {L["dur"]}s linear infinite}}@keyframes lauf-{c}{{from{{transform:translateX(0)}}to{{transform:translateX({L["dir"] * Lp}px)}}}}')
    css.append(f'.heben-{c}{{animation:heben-{c} {L["bob"]}s cubic-bezier(.3,.2,.7,.8) -{L["bob"] / 2}s infinite alternate}}@keyframes heben-{c}{{from{{transform:translateY(-{L["amp"]}px)}}to{{transform:translateY({L["amp"]}px)}}}}')
    masks.append(f'<mask id="m-{c}" maskUnits="userSpaceOnUse" x="0" y="0" width="870" height="960"><g class="heben-{c}"><path class="lauf-{c}" d="{d}" fill="#fff"/></g></mask>')
    rects[id(L)] = ''.join(f'<rect x="0" y="300" width="870" height="660" {f} mask="url(#m-{c})"/>' for f in fills(L))

# Oberfläche der Welle vor der Illustration
R = front[0]
def bez(x1, y1, x2, y2):
    def f(p):
        lo, hi = 0.0, 1.0
        for _ in range(40):
            t = (lo + hi) / 2; X = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3
            lo, hi = (t, hi) if X < p else (lo, t)
        t = (lo + hi) / 2; return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3
    return f
EASE = bez(.3, .2, .7, .8)
def heave(t):
    tau = t + R['bob'] / 2; c = int(tau // R['bob']); fr = tau / R['bob'] - c; p = fr if c % 2 == 0 else 1 - fr
    return -R['amp'] + 2 * R['amp'] * EASE(p)
def surf(x, t):
    shift = R['dir'] * R['L'] * ((t / R['dur']) % 1); X = x - shift
    i = int(np.floor(X)) % R['L']; j = (i + 1) % R['L']; fr = X - np.floor(X)
    return R['yy'][i] * (1 - fr) + R['yy'][j] * fr + heave(t)
MEAN = float(R['yy'].mean())

def inhalt(g): return '\n'.join(el for L in g for el in L['els'])

# ---------------------------------------------------------------- Bewegung schwimmend (wie Bottle Reward)
P = 25.6
def weg(u, brems):
    us = np.linspace(0, 1, 2001); v = np.where(us < 1 - brems, 1.0, (1 - us) / brems)
    s_ = np.concatenate([[0], np.cumsum((v[1:] + v[:-1]) / 2 * np.diff(us))]); s_ /= s_[-1]
    return float(np.interp(u, us, s_))
def anlauf(u, a=0.12, brems=0.35):
    us = np.linspace(0, 1, 2001); v = np.minimum(np.minimum(us / a, 1.0), (1 - us) / brems)
    s_ = np.concatenate([[0], np.cumsum((v[1:] + v[:-1]) / 2 * np.diff(us))]); s_ /= s_[-1]
    return float(np.interp(u, us, s_))
def summe(liste, t): return sum(a * math.sin(2 * math.pi * t / per + ph) for per, a, ph in liste)
STOER = [(P / 3, 2.2, 0.4), (P / 5, 1.4, 2.1), (P / 7, 0.9, 4.0), (P / 11, 0.6, 1.1)]
STOER_R = [(P / 4, 0.8, 0.7), (P / 9, 0.5, 2.6), (P / 13, 0.35, 5.2)]
DRIFT = [(P, 3.5, 0.3), (P / 2, 1.8, 1.9)]
def schwimm_sim(xb, neig_faktor, T_END):
    def ziel(t):
        x = xb(t); y = surf(x, t); sl = (surf(x + 12, t) - surf(x - 12, t)) / 24
        r = np.degrees(np.arctan(sl)) * 0.33
        if r < 0: r *= 0.55
        f = neig_faktor(t)
        return x + (-R['dir'] * 0.7 * 47 * sl * f + summe(DRIFT, t) * (0.4 + 0.6 * f)), 0.7 * (y - MEAN) + summe(STOER, t), float(np.clip(r, -5, 7)) * f + summe(STOER_R, t) * (0.35 + 0.65 * f)
    DT = 0.01; ts = np.arange(0, T_END, DT); st = np.zeros((len(ts), 3))
    xx, y, r = ziel(0); v = w = 0.0
    OM_H, Z_H = 2 * math.pi / 1.5, 0.32; OM_R, Z_R = 2 * math.pi / 2.1, 0.22
    for i, t in enumerate(ts):
        xx, yt, rt = ziel(t)
        v += (OM_H ** 2 * (yt - y) - 2 * Z_H * OM_H * v) * DT; y += v * DT
        w += (OM_R ** 2 * (rt - r) - 2 * Z_R * OM_R * w) * DT; r += w * DT
        st[i] = (xx, y, r)
    return lambda t: st[min(int(round(t / DT)), len(ts) - 1)]

def keyframes(name, f, t0, dur, step=0.1, fmt=None):
    n = int(round(dur / step)); out = []
    for i in range(n + 1):
        out.append(f'{100 * i / n:.3f}%{{transform:{fmt(*f(t0 + i * step))}}}')
    return f'@keyframes {name}{{' + ''.join(out) + '}'

# ---------------------------------------------------------------- Lichtrand
def lichtrand(fid, r_breit, r_schmal, begin):
    an = '' if begin is None else f'<animate attributeName="flood-opacity" values="0;1" dur=".25s" begin="{begin}s" fill="freeze"/>'
    op = '1' if begin is None else '0'
    return (f'<filter id="{fid}" x="-40%" y="-40%" width="180%" height="180%">'
            f'<feMorphology in="SourceAlpha" operator="dilate" radius="{r_breit:.1f}" result="rand"><animate attributeName="radius" values="{r_breit:.1f};{r_schmal:.1f};{r_breit:.1f}" dur="3.2s" begin="{begin or 0}s" repeatCount="indefinite"/></feMorphology>'
            f'<feFlood flood-color="{LICHT}" flood-opacity="{op}">{an}</feFlood><feComposite in2="rand" operator="in" result="ring"/>'
            f'<feComposite in="ring" in2="SourceAlpha" operator="out" result="schein"/>'
            f'<feMorphology in="rand" operator="dilate" radius="2.5" result="rand2"/><feFlood flood-color="{LINIE}" flood-opacity="{op}">{an}</feFlood><feComposite in2="rand2" operator="in" result="ring2"/>'
            f'<feComposite in="ring2" in2="rand" operator="out" result="linie"/><feMerge><feMergeNode in="linie"/><feMergeNode in="schein"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')

# ---------------------------------------------------------------- Strahlen (wie Badge Received)
ICON = open(ICONS + 'Property 1=Default, Type=Bottle.svg').read()
subs = parse_path(re.findall(r' d="([^"]+)"', ICON)[0]).continuous_subpaths()
blades = []
for i in (13, 14, 15, 6, 7, 8):
    sp = subs[i]; pts = np.array([[sp.point(t / 80).real, sp.point(t / 80).imag] for t in range(80)])
    c = pts.mean(0); u, sv, vt = np.linalg.svd(pts - c); ax = vt[0]; ang = math.degrees(math.atan2(ax[1], ax[0]))
    p = sp.translated(complex(-c[0], -c[1])).rotated(-ang - 90, 0); x0, x1, y0, y1 = p.bbox(); Lb = y1 - y0
    blades.append(p.translated(complex(-(x0 + x1) / 2, -y1)).scaled(60 / Lb))
def runde(d): return re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.1f}', d)
def dehnen(path, L, r, KAPPE=13.0, BASIS=60.0):
    neu = max(L - 2 * KAPPE, 1.0); mitte = BASIS - 2 * KAPPE
    def f(z):
        y = z.imag
        if y > -KAPPE: y2 = y
        elif y < -(BASIS - KAPPE): y2 = y - (L - BASIS)
        else: y2 = -KAPPE + (y + KAPPE) * neu / mitte
        return complex(z.real, y2 - r)
    return SPath(*[CubicBezier(f(s.start), f(s.control1), f(s.control2), f(s.end)) if isinstance(s, CubicBezier) else Line(f(s.start), f(s.end)) for s in path]).d()
def strahlen(cx, cy, RX, RY, BEG):
    rng = np.random.default_rng(4); D = 1.3; GAP = 0.3; G = 25.6 / 12 if VIDEO else 2.1; GR = [2, 3, 2, 3]; C = G * len(GR)
    imp = []
    for g, n in enumerate(GR):
        t = g * G + rng.normal(0, 0.04)
        for k in range(n): imp.append((t + k * GAP + rng.normal(0, 0.025), k))
    dfs = []; uses = []
    for p_i in range(7):
        m = p_i * 360 / 7; th = math.radians(m); rr = RX * RY / math.sqrt((RY * math.sin(th)) ** 2 + (RX * math.cos(th)) ** 2)
        for platz in range(3):
            for teil in 'AB':
                form = blades[(p_i * 2 + platz + (3 if teil == 'B' else 0)) % len(blades)]
                keys = []
                for t0, k in imp:
                    if k != platz: continue
                    r0 = rr + 14 + rng.normal(0, 3); r1 = rr + 250 + rng.normal(0, 10); L = 72 * rng.uniform(0.93, 1.07)
                    pts = [(0, 0, r0, .4 * L), (.08, 1, None, None), (.38, 1, r1 * .75, .95 * L), (.45, 1, None, None), (.62, 0, r1, L)] if teil == 'A' else \
                          [(0, 0, r0, .35 * L), (.28, 0, r0 + 50, .5 * L), (.38, 1, None, None), (.62, 0, r1 * .62, .42 * L)]
                    kn = [(q[0], q[2], q[3]) for q in pts if q[2] is not None]
                    for q in pts:
                        if q[2] is None:
                            lo = max(x for x in kn if x[0] <= q[0]); hi = min(x for x in kn if x[0] >= q[0]); f_ = (q[0] - lo[0]) / ((hi[0] - lo[0]) or 1)
                            rv, lv = lo[1] + (hi[1] - lo[1]) * f_, lo[2] + (hi[2] - lo[2]) * f_
                        else: rv, lv = q[2], q[3]
                        keys.append((t0 + q[0] * D, q[1], rv, lv))
                keys.sort(); a0, z0 = keys[0], keys[-1]
                keys = [(0.0, 0, a0[2], a0[3])] + [x for x in keys if 0 < x[0] < C] + [(C, 0, z0[2], z0[3])]
                kt = ';'.join(f'{x[0] / C:.4f}' for x in keys)
                pid = f's{p_i}{platz}{teil}'
                dfs.append(f'<path id="{pid}" fill="{STRAHL}" opacity="0" d="{runde(dehnen(form, a0[3], a0[2]))}">'
                           f'<animate attributeName="d" values="{";".join(runde(dehnen(form, x[3], x[2])) for x in keys)}" keyTimes="{kt}" dur="{C:.2f}s" begin="{BEG}s" repeatCount="indefinite"/>'
                           f'<animate attributeName="opacity" values="{";".join(f"{x[1]:.2f}" for x in keys)}" keyTimes="{kt}" dur="{C:.2f}s" begin="{BEG}s" repeatCount="indefinite"/></path>')
                for off in (-5, 0, 5): uses.append(f'<use href="#{pid}" transform="translate({cx:.1f} {cy:.1f}) rotate({m + off:.1f})"/>')
    return ''.join(dfs), '<g class="strahlen">' + ''.join(uses) + '</g>'

# ---------------------------------------------------------------- Szene zusammenbauen
extra_defs = ''; mitte_inhalt = ''   # zwischen hinteren und vorderen Wellen
kommentar = ''
if small: sP = punkte(small); sc_, sa, sl_ = pca(sP)
if big: bP = punkte(big); bc, ba, bl = pca(bP)

if MODE == 'owning' and small:
    # schwimmt herein, quert, kehrt zurück, bleibt an Darias Stelle (kleine Illustration) und bewegt sich nur noch auf und ab
    X0 = sc_[0]; T_A, T_B, T_C = 12.0, 6.0, 4.0; T1 = T_A + T_B + T_C
    def xb(t):
        if t < T_A: return X0 + 540 - 830 * weg(t / T_A, 0.12)
        if t < T_A + T_B: return X0 - 290 + 315 * anlauf((t - T_A) / T_B)
        if t < T1: u = (t - T_A - T_B) / T_C; u = u * u * (3 - 2 * u); return X0 + 25 - 25 * u
        return X0
    def nf(t):
        e = T_A + T_B
        return 1.0 if t < e - 1.5 else ((e - t) / 1.5 if t < e else 0.0)
    sim = schwimm_sim(xb, nf, T1 + 2 + 4 * P); T_IN = T1 + 2
    def z(t):
        if t <= T_IN:
            a = sim(t)
            if t > T_IN - 1.5:
                u = (t - (T_IN - 1.5)) / 1.5; u = u * u * (3 - 2 * u); a = a * (1 - u) + sim(t + 3 * P) * u
            return a
        return sim(t + 3 * P)
    fmt = lambda x, y, r: f'translate({x - X0:.1f}px,{y:.1f}px) rotate({r:.2f}deg)'
    css.append(f'.figur{{transform-box:view-box;transform-origin:{sc_[0]:.1f}px {sc_[1]:.1f}px;animation:weg {T_IN}s linear forwards,schaukeln {P}s linear {T_IN}s infinite}}')
    css.append(keyframes('weg', z, 0, T_IN, fmt=fmt)); css.append(keyframes('schaukeln', z, T_IN, P, fmt=fmt))
    mitte_inhalt = f'<g class="figur">{inhalt(small)}</g>'
    kommentar = 'Owning Badge: Die Illustration schwimmt von rechts herein, quert das Bild, kehrt zurück an ihre Stelle und bewegt sich dann nur noch auf und ab. Sie verhält sich wie ein gedämpfter Körper auf der Welle vor ihr.'

elif MODE == 'owning' and not small:
    # Bitseps: schwimmt nicht. Steht an seiner Stelle, Lichtrand von Anfang an, schwebt ruhig und spannt alle 6,4 s kurz an.
    extra_defs += lichtrand('rand', 14, 10, None)
    def z(t):
        k = t % 6.4; puls = math.sin(math.pi * min(k / 0.7, 1)) if k < 0.7 else 0
        return 5 * math.sin(2 * math.pi * t / 6.4) + 1.6 * math.sin(2 * math.pi * t / 2.133 + 1.3), 1 + 0.05 * puls, -2 * puls
    fmt = lambda y, s, r: f'translateY({y:.1f}px) rotate({r:.2f}deg) scale({s:.3f})'
    css.append(f'.figur{{transform-box:view-box;transform-origin:{bc[0]:.1f}px {bc[1]:.1f}px;animation:schweben 6.4s linear infinite}}')
    css.append(keyframes('schweben', z, 0, 6.4, step=0.05, fmt=fmt))
    mitte_inhalt = f'<g class="figur"><g filter="url(#rand)">{inhalt(big)}</g></g>'
    kommentar = 'Owning Badge, Bitseps: Der Arm schwimmt nicht. Er steht an seiner Stelle, mit Lichtrand von Anfang an, schwebt ruhig und spannt alle 6,4 s kurz an.'

elif MODE == 'received':
    T0, TA, TB, TC, TD, T1 = 1.0, 1.55, 2.15, 2.45, 3.25, 4.0
    def smooth(u): u = min(max(u, 0), 1); return u * u * (3 - 2 * u)
    def eout(u): u = min(max(u, 0), 1); return 1 - (1 - u) ** 3
    def backe(u, s=1.8): u = min(max(u, 0), 1); u -= 1; return u * u * ((s + 1) * u + s) + 1
    if small:
        # Abbildung klein -> groß: Drehung, Größe, Lage aus den Hauptachsen
        CX, CY = sc_
        best = None
        for rot in (ba - sa, ba - sa + 180, ba - sa - 180):
            sc = bl / sl_; a = math.radians(rot)
            Q = (sP - sc_) * sc; Q = np.stack([Q[:, 0] * math.cos(a) - Q[:, 1] * math.sin(a), Q[:, 0] * math.sin(a) + Q[:, 1] * math.cos(a)], 1) + bc
            from scipy.spatial import cKDTree
            e = cKDTree(bP).query(Q[::5])[0].mean()
            if best is None or e < best[0]: best = (e, rot, sc)
        _, ROT, SC = best
        while ROT > 180: ROT -= 360
        while ROT < -180: ROT += 360
        DX, UP = bc[0] - CX, bc[1] - CY; AX = -90 - sa
        print(f'klein -> groß: Drehung {ROT:.1f}°, Größe {SC:.2f}, Weg {DX:.0f} {UP:.0f}')
    else:
        CX, CY = bc[0], bc[1] + 500; ROT, SC, DX, UP, AX = 0, 1, 0, -500, 0   # Bitseps steigt aus dem Wasser
    def welle_y(t): return (0.7 if small else 0.4) * (surf(CX, t) - MEAN)
    def f(t):
        if t < T0: return 0, welle_y(t), 0, 1, 1
        if t < TA:
            u = (t - T0) / (TA - T0); k = math.sin(math.pi * u); zit = 2.5 * math.sin(2 * math.pi * 9 * (t - T0)) * (1 - u)
            return 0, welle_y(t) + 14 * k, zit, 1, 1 - 0.06 * k
        if t < TB:
            u = eout((t - TA) / (TB - TA)); p = 0.35 * u
            return 8 * math.sin(math.pi * u * 0.9), welle_y(t) * (1 - min(p * 3, 1)) + 14 * (1 - u) + UP * p, ROT * 0.4 * u, 1 + (SC - 1) * p, 1 + 0.05 * math.sin(math.pi * u)
        if t < TC:
            u = smooth((t - TB) / (TC - TB)); p = 0.35 - 0.05 * math.sin(math.pi * u * 0.5)
            return 8 * math.cos(math.pi * u * 0.5) * 0.9 + DX * 0.0, UP * p, ROT * (0.4 - 0.05 * math.sin(math.pi * u)), 1 + (SC - 1) * p, 1
        u = min((t - TC) / (TD - TC), 1); p = 0.30 + 0.70 * backe(u)
        return 7.2 * (1 - smooth(u)) + DX * smooth(u) - 10 * math.sin(math.pi * u), UP * p, ROT * (0.35 + 0.65 * backe(u, 2.4)), 1 + (SC - 1) * min(p, 1.04), 1 + 0.10 * math.sin(math.pi * min(u * 1.3, 1))
    fmt = lambda dx, dy, r, s, st: f'translate({dx:.1f}px,{dy:.1f}px) rotate({r:.2f}deg) scale({s:.3f}) rotate({-AX:.1f}deg) scale({1 / math.sqrt(st):.3f},{st:.3f}) rotate({AX:.1f}deg)'
    # Ankommen und Schweben für die große Illustration (relativ zu ihrer Lage)
    def g(t):
        if t < T1:
            u = (t - TD) / (T1 - TD); e = math.exp(-4 * u)
            return 0, 9 * e * math.sin(2 * math.pi * u * 1.6), 4 * e * math.cos(2 * math.pi * u * 1.3), 1, 1 - 0.07 * e * math.cos(2 * math.pi * u * 1.6)
        k = t - T1
        return 0, 6 * math.sin(2 * math.pi * k / 6.4) + 1.8 * math.sin(2 * math.pi * k / 2.133 + 1.3), 0.6 * math.sin(2 * math.pi * k / 3.2 + 0.4), 1, 1
    BX = -90 - ba
    fmtg = lambda dx, dy, r, s, st: f'translate({dx:.1f}px,{dy:.1f}px) rotate({r:.2f}deg) rotate({-BX:.1f}deg) scale({1 / math.sqrt(st):.3f},{st:.3f}) rotate({BX:.1f}deg)'
    if small:
        css.append(f'.figur{{transform-box:view-box;transform-origin:{CX:.1f}px {CY:.1f}px;animation:aufstieg {TD}s linear forwards}}')
        css.append(keyframes('aufstieg', f, 0, TD, step=0.05, fmt=fmt))
        css.append(f'.figur-aus{{animation:aus .2s linear {TD}s forwards}}@keyframes aus{{to{{opacity:0}}}}')
        css.append(f'.gross{{opacity:0;transform-box:view-box;transform-origin:{bc[0]:.1f}px {bc[1]:.1f}px;animation:ein .2s linear {TD - 0.02}s forwards,ankommen {T1 - TD:.2f}s linear {TD}s forwards,schweben 6.4s linear {T1}s infinite}}@keyframes ein{{to{{opacity:1}}}}')
        css.append(keyframes('ankommen', g, TD, T1 - TD, step=0.05, fmt=fmtg)); css.append(keyframes('schweben', g, T1, 6.4, step=0.05, fmt=fmtg))
        extra_defs += lichtrand('rand', 14, 10, TD - 0.05)
        mitte_inhalt = f'<g class="figur-aus"><g class="figur">{inhalt(small)}</g></g>'
    else:
        # Bitseps: steigt aus dem Wasser mit Lichtrand von Anfang an
        def fb(t):
            if t < TD: return f(t)
            return g(t)
        css.append(f'.gross{{transform-box:view-box;transform-origin:{bc[0]:.1f}px {bc[1]:.1f}px;animation:aufstieg {TD}s linear forwards,ankommen {T1 - TD:.2f}s linear {TD}s forwards,schweben 6.4s linear {T1}s infinite}}')
        fmtb = lambda dx, dy, r, s, st: f'translate({dx:.1f}px,{dy - UP:.1f}px) rotate({r:.2f}deg) scale({s:.3f})'
        css.append(keyframes('aufstieg', lambda t: f(t) if t < TD else g(t), 0, TD, step=0.05, fmt=lambda dx, dy, r, s, st: f'translate({dx:.1f}px,{dy - UP:.1f}px) rotate({r:.2f}deg) scale({1/math.sqrt(st):.3f},{st:.3f})'))
        css.append(keyframes('ankommen', g, TD, T1 - TD, step=0.05, fmt=fmtg)); css.append(keyframes('schweben', g, T1, 6.4, step=0.05, fmt=fmtg))
        extra_defs += lichtrand('rand', 14, 10, None)
    # Tropfen: fallen vom tiefsten Punkt der Illustration, so wie sie gerade steht, und verschwinden im Wasser
    tropfen = ''
    if small:
        def welt(px, py, t):
            dx, dy, r, sc, st = f(t); x, y = px - CX, py - CY
            a = math.radians(AX); x, y = x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
            x, y = x / math.sqrt(st), y * st
            a = math.radians(-AX); x, y = x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
            x, y = x * sc, y * sc
            a = math.radians(r); x, y = x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
            return CX + dx + x, CY + dy + y
        Q = sP[::7]; trng = np.random.default_rng(11)
        for k, (ts, n) in enumerate([(1.7, 3), (2.55, 4), (2.95, 3), (3.2, 2)]):
            W = np.array([welt(px, py, ts) for px, py in Q]); unten = W[np.argsort(-W[:, 1])[:12]]
            for j in range(n):
                x0, y0 = unten[trng.integers(len(unten))]; x0 += trng.normal(0, 4)
                W1 = np.array([welt(px, py, ts + 0.05) for px, py in Q[:: max(len(Q) // 40, 1)]]).mean(0); W0 = np.array([welt(px, py, ts) for px, py in Q[:: max(len(Q) // 40, 1)]]).mean(0)
                vx = (W1[0] - W0[0]) / 0.05 * 0.4 + trng.normal(0, 25); vy = min((W1[1] - W0[1]) / 0.05 * 0.4, 0) + trng.normal(-30, 30)
                r = trng.uniform(3, 5.5); steps = []; tt = 0.0
                while tt < 1.5:
                    x = x0 + vx * tt; y = y0 + vy * tt + 0.5 * 900 * tt * tt; steps.append((tt, x, y))
                    if y > MEAN - 8: break
                    tt += 0.03
                dur = steps[-1][0] or 0.03; nm = f'tropfen{k}_{j}'
                fr = ''.join(f'{100 * tt / dur:.2f}%{{transform:translate({x:.1f}px,{y:.1f}px);opacity:{1 if tt < dur * 0.85 else 0}}}' for tt, x, y in steps)
                css.append(f'.{nm}{{opacity:0;animation:{nm} {dur:.2f}s linear {ts:.2f}s 1 forwards}}@keyframes {nm}{{{fr}}}')
                tropfen += f'<ellipse class="{nm}" cx="0" cy="0" rx="{r * 0.8:.1f}" ry="{r:.1f}" fill="#CFF6FF"/>'
    # Strahlen um die große Illustration
    bx0, by0, bx1, by1 = gbb(big)
    sdefs, srays = strahlen(bc[0], bc[1], (bx1 - bx0) / 2 * 0.85, (by1 - by0) / 2 * 0.85, TD)
    extra_defs += sdefs
    mitte_inhalt = srays + tropfen + mitte_inhalt + f'<g class="gross"><g filter="url(#rand)">{inhalt(big)}</g></g>'
    kommentar = 'Badge Received: Die Illustration holt Schwung, zögert, steigt auf, wird zur großen Illustration an Darias Stelle und strahlt. Lichtrand und Strahlen in Eisweiß, Strahlen in 7 Paketen, Impulse abwechselnd zu zweit und zu dritt.'

css.append('@media (prefers-reduced-motion: reduce){*{animation:none!important}}')
head = (f'<svg width="870" height="819" viewBox="0 0 870 819" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n'
        f'<style>\n/* {NAME}, {kommentar} Nach Darias Vorlage (2026-11-02). Wellen periodisch und endlos, Farben stehen, nur die Form wandert. */\n' + '\n'.join(css) + '\n</style>\n')
out = (head + defs + f'\n<defs><clipPath id="scheibe"><path d="{disc}"/></clipPath>{"".join(masks)}{extra_defs}</defs>\n' + sky['els'][0] + '\n<g clip-path="url(#scheibe)">\n'
       + ''.join(rects[id(L)] for L in back) + '\n' + mitte_inhalt + '\n' + ''.join(rects[id(L)] for L in front) + '\n</g>\n</svg>\n')
titel = {'owning': 'Owning Badge', 'received': 'Badge Received'}[MODE]
open(S + ('video/' if VIDEO else '') + f'{NAME} – {titel}.svg', 'w').write(out)
print(NAME, titel, len(out) // 1024, 'KB')
