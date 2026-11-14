// Übersetzungen mit DeepL (Daria, 31.10.2026 und 10.11.2026). Füllt nur Lücken.
//
//   DEEPL_API_KEY=… node scripts/i18n-auto.mjs              übersetzt fehlende App-Texte
//   node scripts/i18n-auto.mjs --dry                         zeigt nur, was übersetzt würde (ohne Schlüssel)
//
// Schutz für Übersetzungen von Hand:
// - Das Skript schreibt nur in src/i18n/auto/<sprache>.json. Die geprüften Dateien src/i18n/<sprache>.json,
//   die Geschlechter-Dateien (<sprache>.<er|sie|person>.json, auch Deutsch) und die Tabelle app_texts fasst es nie an.
// - Es übersetzt nur Texte, die weder in src/i18n/<sprache>.json noch in app_texts (Spalte der Sprache) stehen.
//   Vorhandene DeepL-Texte bleiben, es löscht nichts.
// - In der App gilt: app_texts → Geschlecht → src/i18n/<sprache>.json → DeepL → Deutsch (src/data/texts.ts).
//   Eine spätere Korrektur von Hand (im Texte-Editor oder in <sprache>.json) gewinnt also immer.
// - Hat Daria den deutschen Text im Texte-Editor geändert, übersetzt DeepL ihre Fassung, nicht das Original.
// - Texte mit Mehrzahlformen gehen nicht an DeepL. Platzhalter wie {name} und feste Namen (KiezCoins,
//   Me-Challenge, We-Challenge) werden geschützt; fehlt danach einer, wird der Text nicht übernommen.
//
// Glossar (Daria, 2026-11-14): src/i18n/glossar.json legt Begriffe je Sprache fest (Karten = cards, nicht maps).
// Das Skript legt daraus je Sprache ein DeepL-Glossar an, sofern DeepL das Sprachpaar kennt, und ersetzt es, wenn
// sich die Datei ändert. Ohne Glossar-Unterstützung übersetzt es wie bisher.
//
// Rückweg: den Ordner src/i18n/auto leeren (Dateien mit {} stehen lassen).
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { collectKeys } from './text-keys.mjs';

const root = new URL('..', import.meta.url).pathname;
const dry = process.argv.includes('--dry');
const KEY = process.env.DEEPL_API_KEY ?? '';
const MAX_CHARS = Number(process.env.I18N_MAX_CHARS ?? 150000); // pro Lauf, Gratiskontingent: 500.000 im Monat
const SUPABASE_URL = 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0'; // öffentlicher Schlüssel, nur Lesen

const LANGS = { en: 'EN-GB', fr: 'FR', uk: 'UK', ru: 'RU', ar: 'AR', he: 'HE' };
// Bleiben in jeder Sprache gleich: KiezCoins, Me-Challenge, We-Challenge
const FIXED_RE = /KiezCoins|KiezKoinz|[WM]e-Challenges?/g;
// Keine sichtbaren Texte oder Namen, die gleich bleiben: SVG, CSS, Schriften, Marken, interne Namen
const SKIP = new Set([
  'X', 'A', 'KiezCoins', 'BlueSky', 'Mastodon', 'Instagram', 'Facebook', 'Maria Arkadieff',
  'Redaction', 'Rubik', 'Barriecito', 'Nothing You Could Do', 'Playwrite', 'Mono',
  'Welcome', 'Greedy', 'Worried', 'Proud', 'Curious', 'Lazy', 'right bottom', 'left bottom',
]);
const isTechnical = (k) => SKIP.has(k) || /^[<(*-]|rgba?\(|\dpx\b|-webkit-|backdrop-filter/.test(k);

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {});
const summary = [];
const say = (line) => {
  console.log(line);
  summary.push(line);
};

const keys = [...(await collectKeys()).keys()];

// Texte-Editor: Darias deutsche Fassung und Übersetzungen von Hand
let cms = [];
try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_texts?select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (res.ok) cms = await res.json();
  else say(`Hinweis: app_texts nicht lesbar (${res.status}), es gilt nur der Code.`);
} catch {
  say('Hinweis: app_texts nicht erreichbar, es gilt nur der Code.');
}
const cmsByKey = new Map(cms.map((r) => [norm(r.original ?? ''), r]));
const sourceOf = (key) => {
  const own = cmsByKey.get(key)?.text;
  return own && norm(own) ? norm(own) : key;
};

/** Platzhalter und feste Namen durch <x i="n"/> ersetzen (Hebräisch: ⟦n⟧, weil DeepL dort keine Tags kennt) */
function protect(text, tags) {
  const kept = [];
  const mark = (s) => {
    kept.push(s);
    return tags ? `<x i="${kept.length - 1}"/>` : `⟦${kept.length - 1}⟧`;
  };
  let out = tags ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : text;
  out = out.replace(/\{[A-Za-z_][\w]*\}/g, mark);
  out = out.replace(FIXED_RE, mark);
  return { out, kept };
}
function restore(text, kept, tags) {
  let out = text;
  for (let i = 0; i < kept.length; i++) {
    const re = tags ? new RegExp(`<x i="${i}"\\s*(/>|></x>)`) : new RegExp(`⟦\\s*${i}\\s*⟧`);
    if (!re.test(out)) return null; // Platzhalter verloren: lieber keine Übersetzung
    out = out.replace(re, () => kept[i]);
  }
  if (/<x i=|⟦|⟧/.test(out)) return null;
  if (tags) out = out.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return out;
}

const host = KEY.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
const auth = { Authorization: `DeepL-Auth-Key ${KEY}` };

/** Glossar-Einträge je Sprache aus src/i18n/glossar.json als TSV (DeepL-Format) */
function glossaryTsv(lang) {
  const all = readJson(join(root, 'src/i18n/glossar.json'));
  return Object.entries(all)
    .filter(([term, v]) => !term.startsWith('_') && v && typeof v === 'object' && v[lang]?.trim())
    .map(([term, v]) => `${term.replace(/\t/g, ' ')}\t${v[lang].replace(/\t/g, ' ')}`)
    .join('\n');
}
const hashOf = (s) => {
  let h = 5381;
  for (const c of s) h = (h * 33 + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};

/**
 * id des DeepL-Glossars für eine Sprache, `undefined` ohne Einträge oder ohne Unterstützung. Der Name enthält eine
 * Prüfsumme der Einträge: Ändert sich glossar.json, entsteht ein neues Glossar und das alte wird gelöscht.
 */
let glossaryList = null;
let glossaryPairs = null;
async function glossaryFor(lang) {
  const tsv = glossaryTsv(lang);
  if (!tsv) return undefined;
  try {
    if (!glossaryPairs) {
      const res = await fetch(`${host}/v2/glossary-language-pairs`, { headers: auth });
      glossaryPairs = res.ok ? (await res.json()).supported_languages ?? [] : [];
    }
    if (!glossaryPairs.some((p) => p.source_lang === 'de' && p.target_lang === lang)) {
      say(`${lang}: DeepL kennt für diese Sprache kein Glossar, übersetzt ohne.`);
      return undefined;
    }
    if (!glossaryList) {
      const res = await fetch(`${host}/v2/glossaries`, { headers: auth });
      glossaryList = res.ok ? (await res.json()).glossaries ?? [] : [];
    }
    const prefix = `KiezCoins ${lang} `;
    const name = prefix + hashOf(tsv);
    const found = glossaryList.find((g) => g.name === name);
    for (const old of glossaryList.filter((g) => g.name.startsWith(prefix) && g.name !== name)) {
      await fetch(`${host}/v2/glossaries/${old.glossary_id}`, { method: 'DELETE', headers: auth }).catch(() => {});
    }
    if (found) return found.glossary_id;
    const res = await fetch(`${host}/v2/glossaries`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, source_lang: 'de', target_lang: lang, entries: tsv, entries_format: 'tsv' }),
    });
    if (!res.ok) {
      say(`${lang}: Glossar ließ sich nicht anlegen (${res.status}), übersetzt ohne.`);
      return undefined;
    }
    const id = (await res.json()).glossary_id;
    say(`${lang}: Glossar angelegt (${tsv.split('\n').length} Begriffe).`);
    return id;
  } catch {
    say(`${lang}: Glossar nicht erreichbar, übersetzt ohne.`);
    return undefined;
  }
}

async function deepl(texts, target, glossaryId) {
  const tags = target !== 'HE';
  const body = {
    text: texts,
    source_lang: 'DE',
    target_lang: target,
    formality: 'prefer_less', // Du-Form, wo es die Sprache kennt
    preserve_formatting: true,
    ...(tags ? { tag_handling: 'xml', ignore_tags: ['x'] } : {}),
    ...(glossaryId ? { glossary_id: glossaryId } : {}),
  };
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()).translations.map((t) => t.text);
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    if (res.status === 456) throw new Error('DeepL: Monatskontingent aufgebraucht');
    throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  }
}

if (!dry && !KEY) {
  say('Kein DEEPL_API_KEY gesetzt, nichts übersetzt.');
  process.exit(0);
}

let used = 0;
const skippedPlural = new Set();
for (const [lang, target] of Object.entries(LANGS)) {
  const manual = readJson(join(root, 'src/i18n', `${lang}.json`));
  const autoPath = join(root, 'src/i18n/auto', `${lang}.json`);
  const auto = readJson(autoPath);
  const todo = keys.filter((k) => {
    if (k in manual || k in auto) return false;
    if (isTechnical(k)) return false;
    if (cmsByKey.get(k)?.[lang]?.trim()) return false; // von Hand im Texte-Editor
    if (/\{\w+\s*,\s*plural/.test(k)) {
      skippedPlural.add(k);
      return false;
    }
    return true;
  });
  const tags = target !== 'HE';
  const batch = [];
  for (const key of todo) {
    const src = sourceOf(key);
    if (used + src.length > MAX_CHARS) break;
    used += src.length;
    batch.push({ key, ...protect(src, tags) });
  }
  if (dry) {
    say(`${lang}: ${todo.length} fehlen, ${batch.length} würden übersetzt`);
    continue;
  }
  let added = 0;
  const lost = [];
  // Auch ohne neue Texte: So legt der erste Lauf nach einer Änderung an glossar.json das Glossar gleich an
  const glossaryId = await glossaryFor(lang);
  for (let i = 0; i < batch.length; i += 50) {
    const part = batch.slice(i, i + 50);
    const result = await deepl(part.map((p) => p.out), target, glossaryId);
    part.forEach((p, j) => {
      const text = restore(result[j], p.kept, tags);
      if (text == null) lost.push(p.key);
      else {
        auto[p.key] = text;
        added++;
      }
    });
  }
  mkdirSync(join(root, 'src/i18n/auto'), { recursive: true });
  const sorted = Object.fromEntries(Object.keys(auto).sort().map((k) => [k, auto[k]]));
  writeFileSync(autoPath, JSON.stringify(sorted, null, 2) + '\n');
  say(`${lang}: ${added} neu übersetzt${todo.length > batch.length ? `, ${todo.length - batch.length} warten auf den nächsten Lauf (Zeichenlimit)` : ''}`);
  for (const k of lost) say(`  ${lang}: Platzhalter verloren, bitte von Hand: „${k}“`);
}
if (skippedPlural.size) {
  say(`Mit Mehrzahlformen, nicht an DeepL gegeben (${skippedPlural.size}):`);
  for (const k of skippedPlural) say(`  „${k}“`);
}
say(`Zeichen an DeepL: ${used}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n');
