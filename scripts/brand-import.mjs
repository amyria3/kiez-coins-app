// Übernimmt Wortbildmarken und Kater-Stimmungen nach src/components/icons/brandArt.ts.
//   node scripts/brand-import.mjs
// Dateien: die Wortbildmarken unten aus assets/marke/ und alle assets/kater/kater-<stimmung>.svg.
// Die Bildmarke (assets/marke/bildmarke.svg) steckt im Kater-Avatar (katerAvatarSvg.ts) und in den App-Icons (app-icon.py).
// IDs bekommen ein Präfix je Datei, damit sich mehrere Grafiken auf einer Seite nicht stören.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const clean = (name, svg) => {
  const p = `kc-${name}-`;
  return svg
    .replace(/<\?xml[^>]*>\s*/, '')
    .replace(/<!DOCTYPE[^>]*>\s*/, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\bid="([^"]+)"/g, `id="${p}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
    .replace(/(xlink:)?href="#([^"]+)"/g, (_, x, id) => `${x ?? ''}href="#${p}${id}"`)
    .trim();
};
const size = (svg) => ({ w: Number(svg.match(/width="([\d.]+)"/)[1]), h: Number(svg.match(/height="([\d.]+)"/)[1]) });
// Nur die Wortbildmarken, die App oder Website zeigen. So bleiben die übrigen Varianten aus dem Bundle.
const MARKEN = ['wortbildmarke'];
const files = [
  ...MARKEN.map((name) => join(root, 'assets/marke', `${name}.svg`)),
  ...readdirSync(join(root, 'assets/kater'))
    .filter((f) => /^kater-[a-z]+\.svg$/.test(f))
    .sort()
    .map((f) => join(root, 'assets/kater', f)),
];
const entries = [];
for (const path of files) {
  const file = path.split('/').pop();
  const name = file.slice(0, -4);
  const svg = clean(name, readFileSync(path, 'utf8'));
  const { w, h } = size(svg);
  entries.push(`  '${name}': { width: ${w}, height: ${h}, svg: ${JSON.stringify(svg)} },`);
  console.log(`${name}: ${w}×${h}`);
}
writeFileSync(
  join(root, 'src/components/icons/brandArt.ts'),
  `// Erzeugt von scripts/brand-import.mjs aus assets/marke/ und assets/kater/. Nicht von Hand ändern.\n\nexport const brandArt: Record<string, { width: number; height: number; svg: string }> = {\n${entries.join('\n')}\n};\n`,
);
