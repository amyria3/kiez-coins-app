#!/usr/bin/env python3
"""
Baut die Ebenen von Cat The Käptn aus Darias Figma-Exporten (Daria, 02.11.2026).

Quellen in Übergabe/:
  KiezCoins Cat.svg       Kater mit Brille, Fläche 1300 × 1885 (Kreis, Körper, Besen, Stiefel, Kopf, Lächeln, Gläser)
  KiezCoins Cat2.svg      Kater schaut über die Brille: neue Schürze, Augen, gekippte Brille mit Bügeln, Default-Mund
                          (Fläche 1300 × 1696, Kater 294 nach oben verschoben)
  KiezCoins Cat Mund.svg  Default-Mund
  KiezCoins Cat.mp4       Schimmern der Gläser aus Figma

Ergebnis: assets/kater/*.png, assets/kater/glaeser.mp4, website/kater/kater.png
Aufruf im Repo-Ordner: python3 scripts/kater-ebenen.py   (braucht rsvg-convert, ffmpeg, Pillow, numpy)
"""
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageChops

W, H = 1300, 1885  # Fläche von Cat.svg; alle Koordinaten hier beziehen sich auf sie
CAT2_DY = 294  # Cat2.svg liegt um so viel höher als Cat.svg
# Ausschnitt der Ebenen wie in Cat2.svg: oben ab dem Kopf, unten bis zum tiefer gesetzten Kreis (Daria, 02.11.2026)
FLAECHE = (0, CAT2_DY, 1300, 1696)
OUT_W, OUT_H = 900, 1174  # Ebenen der App
MUND_AN = (582.066, 266.995 + CAT2_DY)  # Lage des Default-Munds, wie in Cat2.svg
MUND_BOX = (560, 530, 120, 140)  # Ausschnitt der Mundbilder auf der Fläche
CLIP = (430, 423, 374, 188)  # Ausschnitt des Videos auf der Fläche
FLECK = 1.7  # > 1 schiebt den grünen Lichtfleck in den Gläsern nach unten
FUELL = '#7E94FF'

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'Übergabe')
assets = os.path.join(root, 'assets', 'kater')
tmp = tempfile.mkdtemp()


def elemente(datei):
    s = open(os.path.join(src, datei)).read()
    return re.findall(r'<(?:path|circle|image)[^>]*/>', s, re.S)


def svg(body, box=FLAECHE):
    x, y, w, h = box
    return (f'<svg width="{w}" height="{h}" viewBox="{x} {y} {w} {h}" xmlns="http://www.w3.org/2000/svg" '
            f'xmlns:xlink="http://www.w3.org/1999/xlink">{body}</svg>')


def render(body, w=OUT_W, h=OUT_H, box=FLAECHE):
    p = os.path.join(tmp, 'x.svg')
    open(p, 'w').write(svg(body, box))
    q = os.path.join(tmp, 'x.png')
    subprocess.run(['rsvg-convert', '-w', str(w), '-h', str(h), p, '-o', q], check=True)
    return Image.open(q).convert('RGBA')


def ohne(im, maske):
    """Macht `im` dort durchsichtig, wo `maske` deckt."""
    im = im.copy()
    im.putalpha(ImageChops.multiply(im.split()[3], ImageChops.invert(maske)))
    return im


def speichern(im, name):
    im.save(os.path.join(assets, name), optimize=True)


c1 = elemente('KiezCoins Cat.svg')
c2 = elemente('KiezCoins Cat2.svg')
koerper = c1[1]
besen = c1[2:5]
stiefel = c1[5:7]
kopf = c1[10]
laecheln = c1[11]
glaeser = c1[12] + c1[13]
runter = lambda e: f'<g transform="translate(0 {CAT2_DY})">{e}</g>'
kreis = runter(c2[0])  # Kreis tiefer, wie in Cat2.svg
schuerze = runter(''.join(c2[8:11]))
augen = runter(c2[12] + c2[11])  # weißes Auge, schwarzes Auge
brille_unten = runter(c2[14] + c2[15] + c2[16] + c2[17])  # gekippte Gläser mit Bügeln
mund_path = re.search(r'<path[^>]*/>', open(os.path.join(src, 'KiezCoins Cat Mund.svg')).read()).group(0)
mund = f'<g transform="translate({MUND_AN[0]} {MUND_AN[1]})">{mund_path}</g>'
fell = laecheln.replace('fill="#2C2C2C"', f'fill="{FUELL}" stroke="{FUELL}" stroke-width="3"')  # füllt das Loch im Kopf, in dem das Lächeln sitzt

glas = render(glaeser)
glas_maske = glas.split()[3]
oben = schuerze + kopf + fell

speichern(render(kreis + koerper), 'unten.png')
speichern(render(''.join(besen)), 'besen.png')
speichern(render(''.join(stiefel)), 'stiefel.png')
speichern(ohne(render(oben), glas_maske), 'oben.png')
speichern(render(oben), 'oben-ganz.png')
speichern(glas, 'glaeser.png')
speichern(render(augen + brille_unten), 'drueber.png')

# Münder: kleiner Ausschnitt, 1 px pro Einheit der Fläche
mx, my, mw, mh = MUND_BOX
glas_klein = render(glaeser, W, H, (0, 0, W, H)).split()[3].crop((mx, my, mx + mw, my + mh))
# Mund und Nase haben immer Farbe: Das Lächeln aus Cat.svg bekommt das Braun des Default-Munds (Daria, 2026-11-09)
MUND_FARBE = '#604500'
laecheln_farbig = laecheln.replace('fill="#2C2C2C"', f'fill="{MUND_FARBE}"')
for name, body in (('mund', mund), ('mund-laecheln', laecheln_farbig)):
    m = render(body, mw, mh, MUND_BOX)
    speichern(m, f'{name}-ganz.png')
    speichern(ohne(m, glas_klein), f'{name}.png')

# Website: der ganze Kater in Ruhe
web = render(kreis + koerper + ''.join(besen) + ''.join(stiefel) + oben + mund + glaeser, 1120, 1461)
web.save(os.path.join(root, 'website', 'kater', 'kater.png'), optimize=True)

# Video: Gläser ausschneiden, vor und zurück, grünen Lichtfleck nach unten ziehen
cx, cy, cw, ch = CLIP
roh = os.path.join(tmp, 'roh')
os.makedirs(roh)
subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(src, 'KiezCoins Cat.mp4'), '-filter_complex',
                f'[0:v]crop={cw}:{ch}:{cx}:{cy},split[a][b];[b]reverse,trim=start_frame=1:end_frame=60,'
                'setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[o]', '-map', '[o]', os.path.join(roh, '%03d.png')], check=True)
# Gläser im Video selbst finden (im Figma-Video sitzen sie ein paar Pixel anders als im SVG):
# Glas ist, was deutlich mehr Rot als Blau hat (Fell ist blau, Nase grau), in allen Bildern; dann 2 px nach innen
bilder = [np.array(Image.open(os.path.join(roh, f)).convert('RGB')).astype(int) for f in sorted(os.listdir(roh))]
maske = np.all([(b[..., 0] - b[..., 2]) > 40 for b in bilder], axis=0)
for _ in range(2):
    maske = maske & np.roll(maske, 1, 0) & np.roll(maske, -1, 0) & np.roll(maske, 1, 1) & np.roll(maske, -1, 1)
# Je Spalte: Glas von oben bis unten; das Bild darin wird oben gestreckt, unten gestaucht
quelle = np.tile(np.arange(ch)[:, None], (1, cw)).astype(float)
for x in range(cw):
    ys = np.where(maske[:, x])[0]
    if len(ys) < 2:
        continue
    for teil in np.split(ys, np.where(np.diff(ys) > 1)[0] + 1):
        t, b = teil[0], teil[-1]
        if b - t < 4:
            continue
        innen = teil[(teil >= t) & (teil <= b)]
        u = (innen - t) / (b - t)
        quelle[innen, x] = t + (u ** FLECK) * (b - t)
yi = np.clip(np.round(quelle).astype(int), 0, ch - 1)
xi = np.tile(np.arange(cw), (ch, 1))
for f in sorted(os.listdir(roh)):
    p = os.path.join(roh, f)
    a = np.array(Image.open(p).convert('RGB'))
    Image.fromarray(a[yi, xi]).save(p)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', os.path.join(roh, '%03d.png'), '-an',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'main',
                '-movflags', '+faststart', os.path.join(assets, 'glaeser.mp4')], check=True)
print('fertig')
