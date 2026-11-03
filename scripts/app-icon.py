#!/usr/bin/env python3
"""
Baut alle App-Icons aus Darias Logo (Übergabe/KiezKatz Portrait Logo.svg, Daria 2026-11-03).

iOS, Web und Favicon: das Logo quadratisch, der Kater reicht bis an den unteren Rand, Grund #1E1E1E.
Android (adaptives Icon): Kater auf durchsichtigem Grund, Hintergrund #1E1E1E, Monochrom in Weiß.
Aufruf im Repo-Ordner: python3 scripts/app-icon.py   (braucht rsvg-convert und Pillow)
"""
import os
import re
import subprocess
import tempfile

from PIL import Image

GRUND = '#1E1E1E'
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
quelle = open(os.path.join(root, 'Übergabe', 'KiezKatz Portrait Logo.svg')).read()
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
    im.save(os.path.join(root, ziel), optimize=True)


# Quadratisch, ohne Kreis: Der Grund hat dieselbe Farbe wie der Kreis im Logo
quadrat = f'<svg viewBox="0 0 85 85" xmlns="http://www.w3.org/2000/svg"><rect width="85" height="85" fill="{GRUND}"/>{pfade}</svg>'
for groesse, ziel in [
    (1024, 'assets/icon.png'),
    (48, 'assets/favicon.png'),
    (48, 'website/favicon.png'),
    (180, 'public/apple-touch-icon.png'),
    (192, 'public/icon-192.png'),
    (512, 'public/icon-512.png'),
]:
    png(quadrat, groesse, ziel, rgb=True)

# Android: Fläche 108, sichtbar ist die Mitte (72). Kater auf 90 %, unten bis 96, damit er über den Maskenrand reicht.
vorn = (f'<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">'
        f'<g transform="translate(15.75 19.5) scale(0.9)">{pfade}</g></svg>')
png(vorn, 512, 'assets/android-icon-foreground.png')
png(f'<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg"><rect width="108" height="108" fill="{GRUND}"/></svg>',
    512, 'assets/android-icon-background.png', rgb=True)
weiss = re.sub(r'fill="#[0-9A-Fa-f]{6}"', 'fill="#FFFFFF"', vorn)
png(weiss, 512, 'assets/android-icon-monochrome.png')
print('fertig')
