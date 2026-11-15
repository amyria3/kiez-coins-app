#!/usr/bin/env python3
"""
Baut die App-Icons aus der Bildmarke (assets/marke/bildmarke.svg, Daria 2026-11-15).

Web und Favicon (immer):
  public/apple-touch-icon.png, public/icon-192.png, public/icon-512.png: quadratisch, Grund Gelbgrün,
  der Kater reicht bis an den unteren Rand.
  assets/favicon.png, website/favicon.png: die Bildmarke rund, Ecken durchsichtig.
  ../store-grafiken/app-icon-512.png: Icon für Google Play, falls der Ordner da ist.
Android und iOS (nur mit --nativ):
  assets/icon.png und das adaptive Android-Icon (Kater auf durchsichtigem Grund, Hintergrund Gelbgrün, Monochrom weiß).
  Diese Dateien zählen zum Fingerprint von expo-updates. Neue native Icons bekommen vorhandene APKs deshalb nicht
  per Update, sondern erst mit dem nächsten Build. Darum nur zusammen mit einem neuen Build erzeugen.

Aufruf im Repo-Ordner: python3 scripts/app-icon.py [--nativ]   (braucht rsvg-convert und Pillow)
"""
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image

GRUND = '#F0FFA6'
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
quelle = open(os.path.join(root, 'assets', 'marke', 'bildmarke.svg')).read()
m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', quelle)
W, H = float(m.group(1)), float(m.group(2))
pfade = ''.join(re.findall(r'<path [^>]*/>', quelle, re.S))
tmp = tempfile.mkdtemp()


def png(svg, groesse, ziel, rgb=False):
    p = os.path.join(tmp, 'x.svg')
    open(p, 'w').write(svg)
    q = os.path.join(tmp, 'x.png')
    subprocess.run(['rsvg-convert', '-w', str(groesse), '-h', str(groesse), p, '-o', q], check=True)
    im = Image.open(q).convert('RGBA')
    if rgb:
        grund = Image.new('RGBA', im.size, GRUND)
        grund.alpha_composite(im)
        im = grund.convert('RGB')
    os.makedirs(os.path.dirname(os.path.join(root, ziel)), exist_ok=True)
    im.save(os.path.join(root, ziel), optimize=True)
    print(ziel)


# Quadratisch, ohne Kreis: Der Grund hat dieselbe Farbe wie der Kreis der Bildmarke
quadrat = f'<svg viewBox="0 0 {W:g} {H:g}" xmlns="http://www.w3.org/2000/svg"><rect width="{W:g}" height="{H:g}" fill="{GRUND}"/>{pfade}</svg>'
ziele = [(180, 'public/apple-touch-icon.png'), (192, 'public/icon-192.png'), (512, 'public/icon-512.png')]
if os.path.isdir(os.path.join(root, '..', 'store-grafiken')):
    ziele.append((512, '../store-grafiken/app-icon-512.png'))
for groesse, ziel in ziele:
    png(quadrat, groesse, ziel, rgb=True)

# Favicon: die Bildmarke, wie sie ist (Kreis, Ecken durchsichtig)
for ziel in ['assets/favicon.png', 'website/favicon.png']:
    png(quelle, 48, ziel)

if '--nativ' in sys.argv:
    png(quadrat, 1024, 'assets/icon.png', rgb=True)
    # Android: Fläche 108, sichtbar ist die Mitte (72). Kater auf 76,5 breit, unten bis 96, damit er über den Maskenrand reicht.
    s = 76.5 / W
    vorn = (f'<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">'
            f'<g transform="translate(15.75 19.5) scale({s:.6f})">{pfade}</g></svg>')
    png(vorn, 512, 'assets/android-icon-foreground.png')
    png(f'<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg"><rect width="108" height="108" fill="{GRUND}"/></svg>',
        512, 'assets/android-icon-background.png', rgb=True)
    # Monochrom: nur die Deckkraft zählt. Kater weiß, Brille, Mund und Schnurrhaare ausgespart, Herzen wieder weiß.
    teile = re.findall(r'<path [^>]*/>', quelle, re.S)
    farbe = lambda p, f: re.sub(r'fill="#[0-9A-Fa-f]{6}"', f'fill="{f}"', p)
    linien = [p for p in teile if '#000027' in p]
    rest = [p for p in teile if '#000027' not in p]
    # Die dunkle Fläche liegt als ganzer Umriss unter dem Kater: schwarz zuerst, darüber der Kater weiß.
    # So bleibt Schwarz nur, wo die dunkle Fläche hervorschaut (Brille, Mund, Schnurrhaare).
    maske = ''.join(farbe(p, '#000000') for p in linien) + ''.join(farbe(p, '#FFFFFF') for p in rest)
    weiss = (f'<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg"><defs><mask id="m" maskUnits="userSpaceOnUse" '
             f'x="0" y="0" width="108" height="108"><g transform="translate(15.75 19.5) scale({s:.6f})">{maske}</g></mask></defs>'
             f'<rect width="108" height="108" fill="#FFFFFF" mask="url(#m)"/></svg>')
    png(weiss, 512, 'assets/android-icon-monochrome.png')
else:
    print('Android und iOS: mit --nativ, zusammen mit dem nächsten nativen Build (siehe oben).')
