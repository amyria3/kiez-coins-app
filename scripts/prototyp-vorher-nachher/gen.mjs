// Baut die Test-Screens „Vorher-Nachher“ als eine selbsttragende HTML-Seite.
// Aufruf: node scripts/prototyp-vorher-nachher/gen.mjs $PWD /tmp/vn  → /tmp/vn/vorher-nachher.html (danach als Artifact veröffentlichen)
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const root = process.argv[2];
const out = process.argv[3];
const require = createRequire(join(root, 'package.json'));
const ts = require('typescript');

async function loadTs(rel) {
  const src = readFileSync(join(root, rel), 'utf8').replace(/^import type .*$/gm, '').replace(/^import .*$/gm, '');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 } }).outputText;
  const tmp = join(out, rel.replace(/\W/g, '_') + '.mjs');
  writeFileSync(tmp, js);
  return import(tmp);
}

mkdirSync(out, { recursive: true });
const { iconSvgs } = await loadTs('src/components/icons/svgs.ts');
const { instagramSvgs } = await loadTs('src/components/icons/instagramSvgs.ts');
const { brandArt } = await loadTs('src/components/icons/brandArt.ts');

const names = ['heart', 'comment', 'send', 'settings', 'camera', 'clock', 'close', 'plus', 'behausung', 'message', 'burger'];
const icons = { kiez: {}, instagram: {} };
for (const n of names) {
  if (iconSvgs[n]) icons.kiez[n] = { w: iconSvgs[n].width, h: iconSvgs[n].height, svg: iconSvgs[n].svg('currentColor') };
  const l = instagramSvgs[n] ?? iconSvgs[n];
  if (l) icons.instagram[n] = { w: l.width, h: l.height, svg: l.svg('currentColor') };
}

const b64 = (p) => readFileSync(join(root, p)).toString('base64');
const font = (fam, weight, file) =>
  `@font-face{font-family:'${fam}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/ttf;base64,${b64(file)}) format('truetype')}`;
const fonts = [
  font('Inter', 300, 'node_modules/@expo-google-fonts/inter/300Light/Inter_300Light.ttf'),
  font('Inter', 400, 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  font('Inter', 500, 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  font('Inter', 600, 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  font('Inter Tight', 600, 'node_modules/@expo-google-fonts/inter-tight/600SemiBold/InterTight_600SemiBold.ttf'),
].join('\n');
const photo = (f) => `data:image/jpeg;base64,${b64('scripts/site/fotos/' + f)}`;
const photos = { vorher: photo('rasen.jpg'), nachher: photo('garten.jpg'), igel: photo('igel.jpg') };
const kater = brandArt['kater-normal'].svg;

const tpl = readFileSync(new URL('./page.html', import.meta.url), 'utf8');
const html = tpl
  .replace('/*FONTS*/', fonts)
  .replace('/*DATA*/', `const ICONS=${JSON.stringify(icons)};const PHOTOS=${JSON.stringify(photos)};const KATER=${JSON.stringify(kater)};`);
// Umlaute als Escapes, damit die Seite bei jeder Zeichenkodierung stimmt
const asciiSafe = (src) => src.split(/(<script>[\s\S]*?<\/script>)/).map((part, i) =>
  i % 2 ? part.replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
        : part.replace(/[^\x00-\x7f]/gu, (c) => '&#x' + c.codePointAt(0).toString(16) + ';')).join('');
writeFileSync(join(out, 'vorher-nachher.html'), asciiSafe(html));
console.log('ok', Math.round(html.length / 1024), 'KB');
