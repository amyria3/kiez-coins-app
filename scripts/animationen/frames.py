import os as _os
REPO = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), '..', '..')) + '/'
AUSORDNER = _os.environ.get('AUS', _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'aus')) + '/'
_os.makedirs(AUSORDNER + 'video', exist_ok=True)
import asyncio, os
from playwright.async_api import async_playwright
S = AUSORDNER
import sys
NAME=sys.argv[1]; OUT=sys.argv[2]
svg=open(NAME).read().replace('<svg width="870" height="819"','<svg width="435" height="410"',1)
html=f'<html><body style="margin:0;background:#1F2123">{svg}</body></html>'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':436,'height':410})
        await pg.set_content(html); await pg.wait_for_timeout(500)
        os.makedirs(OUT,exist_ok=True)
        fps=20; dur=int(sys.argv[3]) if len(sys.argv)>3 else 14
        for i in range(fps*dur):
            await pg.evaluate(f"document.getAnimations().forEach(a=>{{a.pause(); a.currentTime={i*1000/fps};}}); document.querySelectorAll('svg').forEach(s=>{{s.pauseAnimations(); s.setCurrentTime({i/fps});}})")
            await pg.screenshot(path=f'{OUT}/{i:04d}.png')
        await b.close()
asyncio.run(main())
