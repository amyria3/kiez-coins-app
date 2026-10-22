// Übernimmt Logo und Kater-Stimmungen aus assets/brand/ nach src/components/icons/brandArt.ts.
//   node scripts/brand-import.mjs
// Dateien: logo.svg, kater-normal.svg, kater-high.svg, kater-money.svg (weitere kater-<stimmung>.svg werden mitgenommen).
// IDs bekommen ein Präfix je Datei, damit sich mehrere Grafiken auf einer Seite nicht stören.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dir = join(root, 'assets/brand');
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
const entries = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg')).sort()) {
  const name = file.slice(0, -4);
  const svg = clean(name, readFileSync(join(dir, file), 'utf8'));
  const { w, h } = size(svg);
  entries.push(`  '${name}': { width: ${w}, height: ${h}, svg: ${JSON.stringify(svg)} },`);
  console.log(`${name}: ${w}×${h}`);
}
writeFileSync(
  join(root, 'src/components/icons/brandArt.ts'),
  `// Erzeugt von scripts/brand-import.mjs aus assets/brand/. Nicht von Hand ändern.\n\nexport const brandArt: Record<string, { width: number; height: number; svg: string }> = {\n${entries.join('\n')}\n};\n`,
);
