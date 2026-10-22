// Übernimmt SVG-Icons aus assets/icons/ in src/components/icons/svgs.ts.
//   node scripts/icons-import.mjs            alle .svg in assets/icons/
//   node scripts/icons-import.mjs camera     nur bestimmte Icons
// Der Dateiname ist der Icon-Name. Die Füllfarbe #F0F0F0 wird zur Laufzeitfarbe `c`, Zahlen werden auf zwei Stellen gerundet.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dir = join(root, 'assets/icons');
const target = join(root, 'src/components/icons/svgs.ts');
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.svg') && (!only.length || only.includes(f.slice(0, -4))));

let ts = readFileSync(target, 'utf8');
for (const file of files) {
  const name = file.slice(0, -4);
  let svg = readFileSync(join(dir, file), 'utf8').replace(/\s*\n\s*/g, ' ').replace(/>\s+</g, '><').trim();
  const w = Number(svg.match(/width="([\d.]+)"/)[1]);
  const h = Number(svg.match(/height="([\d.]+)"/)[1]);
  svg = svg
    .replace(/-?\d+\.\d{3,}/g, (n) => Number(n).toFixed(2))
    .replace(/fill="#F0F0F0"/gi, 'fill="${c}"')
    .replace(/stroke="#F0F0F0"/gi, 'stroke="${c}"')
    // eindeutige IDs, damit mehrere Icons auf einer Web-Seite sich nicht stören
    .replace(/id="([^"]+)"/g, `id="kc-${name}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#kc-${name}-$1)`);
  // Die Krone hat eine eigene Datei (crownSvg.ts), weil Brand.tsx und die Website sie ohne IconName nutzen
  if (name === 'crown') {
    const head = '// Krone aus assets/icons/crown.svg (übernommen mit scripts/icons-import.mjs). Farbe zur Laufzeit (`c`).\n\n';
    writeFileSync(join(root, 'src/components/icons/crownSvg.ts'), `${head}export const crownSvg = {\n  width: ${w},\n  height: ${h},\n  svg: (c: string) =>\n    \`${svg}\`,\n};\n`);
    console.log(`crown: ${w}×${h} (crownSvg.ts)`);
    continue;
  }
  const key = /^[a-z]+$/.test(name) ? name : `'${name}'`;
  const entry = `  ${key}: {\n    width: ${w},\n    height: ${h},\n    svg: (c) =>\n      \`${svg}\`,\n  },\n`;
  const re = new RegExp(`  ${key.replace(/[-']/g, (m) => '\\' + m)}: \\{\\n[\\s\\S]*?\\n  \\},\\n`);
  if (re.test(ts)) ts = ts.replace(re, entry);
  else {
    // Eintrag ans Ende von iconSvgs, Name an den Typ IconName anhängen
    const start = ts.indexOf('export const iconSvgs');
    const end = ts.indexOf('\n};', start);
    ts = ts.slice(0, end + 1) + entry + ts.slice(end + 1);
    ts = ts.replace(/(\n  \| '[^']+');/, (m, last) => `${last}\n  | '${name}';`);
    console.log(`Neues Icon: ${name}`);
  }
  console.log(`${name}: ${w}×${h}`);
}
writeFileSync(target, ts);
