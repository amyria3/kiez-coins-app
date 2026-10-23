"""Zerlegt scripts/site/blumen.webp in einzelne Pflanzen für die animierte Spenden-Karte.

Jede freistehende Fläche mit mehr als 800 deckenden Pixeln wird ein eigenes Bild. Kleine Splitter
und der halbtransparente Rand gehen an die nächstgelegene Pflanze. Ausgabe:
scripts/site/blumen/NN.webp und scripts/site/blumen/teile.json (Lage in Prozent des Originals).
Aufruf: python3 scripts/blumen-zerlegen.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

root = Path(__file__).resolve().parent / 'site'
src = Image.open(root / 'blumen.webp').convert('RGBA')
px = np.array(src)
W, H = src.size
alpha = px[:, :, 3]

# Nur Pflanzen, die sich nirgends berühren, werden getrennt; Erodieren zerschneidet Stiele.
kern = alpha > 40
lab, n = nd.label(kern, structure=np.ones((3, 3)))
dicht = nd.sum(kern, lab, range(1, n + 1))
gross = [i + 1 for i in range(n) if dicht[i] > 800]

# Splitter der nächstgelegenen großen Fläche zuordnen
maske = np.isin(lab, gross)
_, (iy, ix) = nd.distance_transform_edt(~maske, return_indices=True)
ziel = lab[iy, ix]
ziel[alpha == 0] = 0

out = root / 'blumen'
out.mkdir(exist_ok=True)
for alt in out.glob('*.webp'):
    alt.unlink()

teile = []
for k, g in enumerate(sorted(gross, key=lambda g: nd.find_objects((ziel == g).astype(int))[0][1].start)):
    sel = ziel == g
    ys, xs = np.nonzero(sel)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    stueck = px[y0:y1, x0:x1].copy()
    stueck[~sel[y0:y1, x0:x1], 3] = 0
    name = f'{k + 1:02d}.webp'
    Image.fromarray(stueck).save(out / name, 'WEBP', quality=86, method=6)
    teile.append({'datei': name,
                  'x': round(x0 / W * 100, 3), 'y': round(y0 / H * 100, 3),
                  'b': round((x1 - x0) / W * 100, 3), 'h': round((y1 - y0) / H * 100, 3)})

(out / 'teile.json').write_text(json.dumps({'breite': W, 'hoehe': H, 'teile': teile}, indent=2) + '\n')
print(len(teile), 'Teile')
