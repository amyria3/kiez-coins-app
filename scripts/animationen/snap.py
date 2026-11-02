import asyncio, sys
from playwright.async_api import async_playwright
from PIL import Image
NAME, OUT = sys.argv[1], sys.argv[2]; TS = [float(x) for x in sys.argv[3].split(',')]
svg = open(NAME).read().replace('<svg width="870" height="819"', '<svg width="435" height="410"', 1)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 436, 'height': 410})
        await pg.set_content(f'<html><body style="margin:0;background:#191716">{svg}</body></html>'); await pg.wait_for_timeout(400)
        ims = []
        for i, t in enumerate(TS):
            await pg.evaluate(f"document.getAnimations().forEach(a=>{{a.pause(); a.currentTime={t*1000};}}); document.querySelectorAll('svg').forEach(s=>{{s.pauseAnimations(); s.setCurrentTime({t});}})")
            await pg.screenshot(path=f'{OUT}_{i}.png'); ims.append(Image.open(f'{OUT}_{i}.png'))
        cols = 4; rows = (len(ims) + 3) // 4; W, H = ims[0].size
        sheet = Image.new('RGB', (W * cols, H * rows))
        for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * W, (i // cols) * H))
        sheet.save(OUT); await b.close()
asyncio.run(main())
