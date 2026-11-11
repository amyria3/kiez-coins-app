#!/usr/bin/env python3
"""
Herzen als Augen von Cat The Käptn (Daria, 2026-11-11): Sie liegen über den Augen, aber unter der Brille.
Etwa zwei Drittel jedes Herzens schauen oben aus der Brille, das untere Drittel verdecken die Gläser.

Ergebnis:
  assets/kater/herzen.png       Herzen mit Aussparung der Gläser (liegt über `oben.png`, die Gläser bleiben davor)
  assets/kater/herzen-ganz.png  ganze Herzen, für den Moment, in dem die Brille runterrutscht

Baut auf assets/kater/glaeser.png auf (aus scripts/kater-ebenen.py), also danach aufrufen.
Aufruf im Repo-Ordner: python3 scripts/kater-herzaugen.py   (braucht rsvg-convert, Pillow, numpy)
"""
import os
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageChops

W, H = 1300, 1696  # Fläche der Ebenen (wie KaterStage.tsx)
OUT_W, OUT_H = 900, 1174
# Mitte der Gläser waagrecht, wie GLAS_L und GLAS_R in KaterStage.tsx
GLAESER_X = (523, 707)
HOEHE = 90  # Höhe eines Herzens auf der Fläche
SICHTBAR = 2 / 3  # so viel vom Herzen schaut über den Rand der Brille

# Darias Herz (assets/icons/heart.svg, Herz.tsx): grün, weißer Rand, Umriss etwa 0..32 × 0..35.5
HERZ_PFAD = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'icons', 'heart.svg')).read()
HERZ_PFAD = HERZ_PFAD.split('d="', 1)[1].split('"', 1)[0]
HERZ_B, HERZ_H = 32.0, 35.5
FARBE, RAND, RAND_BREITE = '#89F269', '#FFFFFF', 2.2

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
assets = os.path.join(root, 'assets', 'kater')
tmp = tempfile.mkdtemp()

glas = Image.open(os.path.join(assets, 'glaeser.png')).convert('RGBA')
glas_maske = glas.split()[3]
alpha = np.array(glas_maske)
k = W / OUT_W


def oberkante(x):
    """Oberer Rand des Glases an der Stelle x der Fläche"""
    ys = np.where(alpha[:, int(round(x / k))] > 128)[0]
    return ys.min() * k


herzen = ''
f = HOEHE / HERZ_H
for x in GLAESER_X:
    oben = oberkante(x) - SICHTBAR * HOEHE
    herzen += (
        f'<g transform="translate({x - HERZ_B * f / 2:.2f} {oben:.2f}) scale({f:.4f})">'
        f'<path d="{HERZ_PFAD}" fill="{FARBE}" stroke="{RAND}" stroke-width="{RAND_BREITE}" stroke-linejoin="round"/></g>'
    )

p = os.path.join(tmp, 'h.svg')
open(p, 'w').write(f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{herzen}</svg>')
q = os.path.join(tmp, 'h.png')
subprocess.run(['rsvg-convert', '-w', str(OUT_W), '-h', str(OUT_H), p, '-o', q], check=True)
ganz = Image.open(q).convert('RGBA')

halb = ganz.copy()
halb.putalpha(ImageChops.multiply(halb.split()[3], ImageChops.invert(glas_maske)))

ganz.save(os.path.join(assets, 'herzen-ganz.png'), optimize=True)
halb.save(os.path.join(assets, 'herzen.png'), optimize=True)
print('assets/kater/herzen.png, assets/kater/herzen-ganz.png')
