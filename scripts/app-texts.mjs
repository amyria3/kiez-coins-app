// Sammelt Button-Beschriftungen und Kater-Texte aus dem Code und erzeugt SQL für die Tabelle app_texts.
//
//   node scripts/app-texts.mjs > /tmp/app-texts.sql
//
// Den Inhalt im Supabase-SQL-Editor ausführen. Neue Texte kommen dazu, schon geänderte Fassungen
// (Spalte `text`) bleiben unverändert. Nur die Spalte `ort` wird aktualisiert.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(name) ? [p] : [];
  });
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const unescape = (s) => s.replace(/\\(['"`\\])/g, '$1');

/** String-Literale in einem Code-Ausschnitt ('…', "…", `…` ohne ${}) */
function literals(code) {
  const out = [];
  const re = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\$])*)`/g;
  let m;
  while ((m = re.exec(code))) out.push(unescape(m[1] ?? m[2] ?? m[3]));
  return out;
}

const texts = new Map(); // original → Set(ort)
function add(text, file, kind) {
  const t = norm(text);
  if (t.length < 2 || !/[A-Za-zÄÖÜäöüß]/.test(t)) return;
  if (/^[a-z][a-zA-Z]*$/.test(t)) return; // Bezeichner wie 'secondary'
  const ort = `${relative(root, file)} (${kind})`;
  if (!texts.has(t)) texts.set(t, new Set());
  texts.get(t).add(ort);
}

for (const file of walk(src)) {
  if (file.endsWith('data/texts.ts')) continue;
  const code = readFileSync(file, 'utf8');
  let m;

  // t('…') und t(\n '…', …)
  const tCall = /\bt\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g;
  while ((m = tCall.exec(code))) add(unescape(m[1].slice(1, -1)), file, 'Text');

  // <Button … label="…" /> und label={…}
  const button = /<Button\b([\s\S]*?)\/>/g;
  while ((m = button.exec(code))) {
    const attrs = m[1];
    const plain = /label="([^"]*)"/.exec(attrs);
    if (plain) add(plain[1], file, 'Button');
    const expr = /label=\{([\s\S]*?)\}\s*(?:\w+=|$)/.exec(attrs);
    if (expr) literals(expr[1]).forEach((l) => add(l, file, 'Button'));
  }

  // <KaterBubble>…</KaterBubble>, <KaterCard title="…">…</KaterCard>
  const kater = /<(KaterBubble|KaterCard)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  while ((m = kater.exec(code))) {
    const title = /title="([^"]*)"/.exec(m[2]);
    if (title) add(title[1], file, 'Kater, Überschrift');
    const body = m[3];
    if (!body.includes('{')) add(body, file, 'Kater');
    // Mit t(…) gebaute Texte erfasst schon die Suche nach t(); deren Platzhalter-Werte nicht mitnehmen
    else if (!/\bt\(/.test(body)) literals(body).forEach((l) => add(l, file, 'Kater'));
  }

  // Leere Zustände, die der Kater spricht
  const empty = /<(GroupsEmpty|PlannedHint)\b([\s\S]*?)\/>/g;
  while ((m = empty.exec(code))) {
    for (const attr of ['title', 'message']) {
      const a = new RegExp(`${attr}="([^"]*)"`).exec(m[2]);
      if (a) add(a[1], file, 'Kater');
    }
  }

  // Geplante Features (src/data/features.ts)
  const planned = /planned(?:Title|Hint):\s*('(?:\\.|[^'\\])*')/g;
  while ((m = planned.exec(code))) add(unescape(m[1].slice(1, -1)), file, 'Kater');
}

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const rows = [...texts.entries()]
  .sort(([a], [b]) => a.localeCompare(b, 'de'))
  .map(([text, orte]) => `  (${q(text)}, ${q(text)}, ${q([...orte].join(', '))})`);

console.log(`-- ${rows.length} Texte aus dem Code (scripts/app-texts.mjs)`);
console.log('insert into public.app_texts (original, text, ort) values');
console.log(rows.join(',\n'));
console.log('on conflict (original) do update set ort = excluded.ort;');
