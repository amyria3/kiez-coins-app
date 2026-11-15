// Einmaliger Umzug der Fotos aus privaten Posts und Gruppen in den privaten Speicher (Migration 20261116000100).
//
// Vorher: Migration 20261116000100_private_fotos.sql im SQL Editor ausführen.
// Den geheimen Schlüssel gibt es in Supabase unter Project Settings › API Keys › Secret keys. Er bleibt im Terminal.
//
//   SUPABASE_SECRET_KEY=… node scripts/fotos-privat-umziehen.mjs          zeigt nur, was passieren würde
//   SUPABASE_SECRET_KEY=… node scripts/fotos-privat-umziehen.mjs --los    zieht um
//
// Für jedes Foto: in `photos-private` als `<ordner>/p_<datei>` ablegen, Pfad in der Datenbank umstellen, dann das
// alte Foto in `photos` löschen. Ein Foto, auf das auch ein öffentlicher Post zeigt, bleibt zusätzlich öffentlich.
// Läuft auch mehrfach ohne Fehler: Schon umgezogene Fotos fallen heraus.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOS = process.argv.includes('--los');
if (!KEY) {
  console.error('SUPABASE_SECRET_KEY fehlt (Supabase › Project Settings › API Keys › Secret keys).');
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const isPrivatePath = (p) => (p.split('/')[1] ?? '').startsWith('p_');
const privateName = (p) => {
  const [folder, file] = p.split('/');
  return `${folder}/p_${file}`;
};
const COLUMNS = ['image_path', 'image_before_path', 'image_after_path', 'report_photo_path'];

async function all(table, columns, filter = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(columns)).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const challenges = await all('challenges', `id, visibility, group_id, extra_image_paths, ${COLUMNS.join(', ')}`);
const comments = await all('comments', 'id, challenge_id, image_path', (q) => q.not('image_path', 'is', null));
const privateIds = new Set(challenges.filter((c) => c.visibility === 'private' || c.group_id).map((c) => c.id));
const pathsOf = (c) => [...COLUMNS.map((k) => c[k]), ...(c.extra_image_paths ?? [])].filter(Boolean);

// Fotos, auf die etwas Öffentliches zeigt, bleiben (auch) öffentlich
const publicPaths = new Set([
  ...challenges.filter((c) => !privateIds.has(c.id)).flatMap(pathsOf),
  ...comments.filter((k) => !privateIds.has(k.challenge_id)).map((k) => k.image_path),
]);
const moving = new Set([
  ...challenges.filter((c) => privateIds.has(c.id)).flatMap(pathsOf),
  ...comments.filter((k) => privateIds.has(k.challenge_id)).map((k) => k.image_path),
].filter((p) => !isPrivatePath(p)));

console.log(`${privateIds.size} private Posts und Gruppenposts, ${moving.size} Fotos noch im öffentlichen Speicher.`);
if (!LOS) {
  console.log('Nur angezeigt. Zum Umziehen mit --los starten.');
  process.exit(0);
}

const moved = new Map();
let failed = 0;
for (const path of moving) {
  const target = privateName(path);
  const { data: file, error } = await db.storage.from('photos').download(path);
  if (error) {
    console.warn(`Fehlt oder nicht lesbar, bleibt: ${path} (${error.message})`);
    failed++;
    continue;
  }
  const { error: upError } = await db.storage
    .from('photos-private')
    .upload(target, await file.arrayBuffer(), { contentType: file.type || 'image/jpeg', upsert: true });
  if (upError) {
    console.warn(`Nicht hochgeladen, bleibt: ${path} (${upError.message})`);
    failed++;
    continue;
  }
  moved.set(path, target);
}

const map = (p) => (p && moved.has(p) ? moved.get(p) : p);
let rowsChanged = 0;
for (const c of challenges.filter((x) => privateIds.has(x.id))) {
  const patch = {};
  for (const k of COLUMNS) if (c[k] && moved.has(c[k])) patch[k] = map(c[k]);
  if ((c.extra_image_paths ?? []).some((p) => moved.has(p))) patch.extra_image_paths = c.extra_image_paths.map(map);
  if (!Object.keys(patch).length) continue;
  const { error } = await db.from('challenges').update(patch).eq('id', c.id);
  if (error) throw error;
  rowsChanged++;
}
for (const k of comments.filter((x) => privateIds.has(x.challenge_id) && moved.has(x.image_path))) {
  const { error } = await db.from('comments').update({ image_path: map(k.image_path) }).eq('id', k.id);
  if (error) throw error;
  rowsChanged++;
}

const removable = [...moved.keys()].filter((p) => !publicPaths.has(p));
for (let i = 0; i < removable.length; i += 100) {
  const { error } = await db.storage.from('photos').remove(removable.slice(i, i + 100));
  if (error) console.warn(`Alte Fotos nicht gelöscht: ${error.message}`);
}

console.log(`Umgezogen: ${moved.size} Fotos, ${rowsChanged} Einträge angepasst, ${removable.length} alte Dateien gelöscht, ${failed} übersprungen.`);
