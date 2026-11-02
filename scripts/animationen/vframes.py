import asyncio, os, sys
from playwright.async_api import async_playwright
NAME, OUT, T0, N, FPS = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), 25
svg = open(NAME).read().replace('<svg width="870" height="819"', '<svg width="540" height="508" preserveAspectRatio="none"', 1)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 540, 'height': 508})
        await pg.set_content(f'<html><body style="margin:0;background:#000;overflow:hidden">{svg}</body></html>'); await pg.wait_for_timeout(500)
        os.makedirs(OUT, exist_ok=True)
        for i in range(N):
            t = T0 + i / FPS
            await pg.evaluate(f"document.getAnimations().forEach(a=>{{a.pause(); a.currentTime={t*1000};}}); document.querySelectorAll('svg').forEach(s=>{{s.pauseAnimations(); s.setCurrentTime({t});}})")
            await pg.screenshot(path=f'{OUT}/{i:04d}.png')
        await b.close()
asyncio.run(main())
