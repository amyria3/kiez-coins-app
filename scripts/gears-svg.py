# Zerlegt assets/animations/gears-moving.svg in einzelne Zahnräder für src/components/icons/gearsSvgs.ts.
# Aufruf: python3 scripts/gears-svg.py
import re, json, math
src = open('assets/animations/gears-moving.svg').read()
style = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
body = re.sub(r'<style>.*?</style>', '', src, flags=re.S)

def num(s): return float(s.replace('px', ''))

gears = []
for m in re.finditer(r'#(\S+) \{\s*transform-origin: [^;]*;\s*animation: (\S+) (\S+) ', style):
    gid, name, dur = m.groups()
    kf = re.search(r'@keyframes ' + re.escape(name) + r' \{(.*?)\n\}', style, re.S).group(1)
    last = re.findall(r'transform: ([^;]*);', kf)[-1]
    cx, cy = map(num, re.search(r'translate\(([-\d.]+)px, ([-\d.]+)px\) rotate', last).groups())
    turn = float(re.search(r'rotate\(([-\d.]+)rad\)', last).group(1))
    # Gruppe mit dieser id und ihren Inhalt bis zur passenden schließenden </g>
    start = re.search(r'<g id="' + re.escape(gid) + r'"([^>]*)>', body)
    ox, oy = map(float, re.search(r'translate\(([-\d.]+) ([-\d.]+)\)', start.group(1)).groups())
    i, depth = start.end(), 1
    while depth:
        nxt = re.search(r'<g\b|</g>', body[i:])
        depth += 1 if nxt.group(0) == '<g' else -1
        i += nxt.end()
    inner = body[start.end(): i - 4]
    # Eltern-Gruppe mit der Position im Bild
    parent = body[:start.start()].rfind('<g ')
    px, py = map(float, re.search(r'translate\(([-\d.]+) ([-\d.]+)\)', body[parent:start.start()]).groups())
    w, h = 2 * cx, 2 * cy
    inner = re.sub(r'\s+', ' ', inner).replace('#F0F0F0', '${c}').strip()
    gears.append({
        'x': round(px + ox, 3), 'y': round(py + oy, 3), 'w': round(w, 3), 'h': round(h, 3),
        'turnDeg': round(math.degrees(turn), 2),
        'svg': f'<svg width="{w:.3f}" height="{h:.3f}" viewBox="0 0 {w:.3f} {h:.3f}" fill="none" xmlns="http://www.w3.org/2000/svg">{inner}</svg>',
    })

vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', src).groups()
out = ['// Aus assets/animations/gears-moving.svg erzeugt (scripts/gears-svg.py). Nicht von Hand ändern.',
       '// Je Zahnrad: Lage im Bild, Größe und Drehung in Grad pro Durchlauf (6 s). Farbe zur Laufzeit (`c`).',
       f'export const GEARS_VIEWBOX = {{ width: {vb[0]}, height: {vb[1]} }};',
       f'export const GEARS_DURATION = 6000;',
       'export const gears: { x: number; y: number; w: number; h: number; turnDeg: number; svg: (c: string) => string }[] = [']
for g in gears:
    out.append(f"  {{ x: {g['x']}, y: {g['y']}, w: {g['w']}, h: {g['h']}, turnDeg: {g['turnDeg']}, svg: (c) => `{g['svg']}` }},")
out.append('];')
open('src/components/icons/gearsSvgs.ts', 'w').write('\n'.join(out) + '\n')
for g in gears: print(g['x'], g['y'], g['w'], g['h'], g['turnDeg'], len(g['svg']))
