// Übersetzungen: sammelt alle Texte aus dem Code und zeigt, was in src/i18n/<sprache>.json fehlt.
//
//   node scripts/i18n.mjs            Übersicht je Sprache
//   node scripts/i18n.mjs --missing  fehlende Texte als JSON (scripts/.i18n-missing.json), zum Übersetzen
//   node scripts/i18n.mjs --prune    entfernt Übersetzungen, deren deutscher Text nicht mehr im Code steht
//
// Schlüssel ist der deutsche Text mit zusammengefasstem Leerraum, so wie t() ihn sucht (src/data/texts.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectKeys } from './text-keys.mjs';

const root = new URL('..', import.meta.url).pathname;
const langs = ['en', 'fr', 'uk', 'ar', 'he'];
const keys = await collectKeys();

const args = process.argv.slice(2);
const all = [...keys.keys()];
const missing = {};
for (const l of langs) {
  const path = join(root, 'src/i18n', `${l}.json`);
  const dict = JSON.parse(readFileSync(path, 'utf8'));
  missing[l] = all.filter((k) => !(k in dict));
  if (args.includes('--prune')) {
    const pruned = Object.fromEntries(Object.entries(dict).filter(([k]) => keys.has(k)));
    writeFileSync(path, JSON.stringify(pruned, null, 2) + '\n');
  }
  console.log(`${l}: ${all.length - missing[l].length} von ${all.length} übersetzt, ${missing[l].length} fehlen`);
}
if (args.includes('--missing')) {
  writeFileSync(join(root, 'scripts/.i18n-missing.json'), JSON.stringify(Object.fromEntries(all.filter((k) => langs.some((l) => missing[l].includes(k))).map((k) => [k, keys.get(k)])), null, 1));
  console.log('Fehlende Texte: scripts/.i18n-missing.json');
}
