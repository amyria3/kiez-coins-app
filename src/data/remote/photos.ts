import { supabase } from '../../lib/supabase';

import type { ImageSource } from '../types';
import { bucketOf, isPrivatePath, newPhotoPath, otherPhotoName, PHOTO_BUCKET, PRIVATE_BUCKET } from '../photoPaths';
import type { ChallengeRow } from './rows';

export { bucketOf, isPrivateAudience, isPrivatePath, newPhotoPath, PRIVATE_BUCKET } from '../photoPaths';

// ---------------------------------------------------------------------------
// Zwei Speicher für Fotos (Migration 20261116000100_private_fotos)
// ---------------------------------------------------------------------------
//
// Öffentliche Fotos (Kiez, Überall, Schaufenster, Profilbilder) liegen in `photos` und laden über ihre feste URL.
// Fotos in privaten Posts und in Gruppen liegen in `photos-private`. Die App holt dafür kurzlebige Links, die nur
// bekommt, wer den Post lesen darf. Den Speicher erkennt die App am Dateinamen: `<user-id>/p_<datei>` ist privat.

/** Gültigkeit eines Links. Die App lädt ihre Daten beim Start und beim Zurückkehren neu und holt dabei neue Links. */
const SIGN_SECONDS = 24 * 60 * 60;
/** Links mit weniger Restzeit holt die App beim nächsten Laden neu */
const RENEW_MS = 6 * 60 * 60 * 1000;

const signed = new Map<string, { url: string; until: number }>();

/**
 * Bildquelle zu einem Pfad. Öffentliche Fotos haben eine feste URL. Private Fotos brauchen vorher `signPhotos`,
 * sonst gibt es (noch) kein Bild.
 */
export function photoUrl(path: string | null | undefined): ImageSource | undefined {
  if (!path) return undefined;
  if (!isPrivatePath(path)) return { uri: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
  const hit = signed.get(path);
  return hit && hit.until > Date.now() ? { uri: hit.url } : undefined;
}

/** Holt Links für private Fotos, die noch keinen oder einen bald ablaufenden haben. Fehler lassen nur das Bild weg. */
export async function signPhotos(paths: Iterable<string | null | undefined>): Promise<void> {
  const now = Date.now();
  const todo = [...new Set([...paths].filter((p): p is string => !!p && isPrivatePath(p)))].filter((p) => {
    const hit = signed.get(p);
    return !hit || hit.until - now < RENEW_MS;
  });
  for (let i = 0; i < todo.length; i += 100) {
    const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrls(todo.slice(i, i + 100), SIGN_SECONDS);
    if (error) {
      console.warn('Private Fotos ohne Link', error.message);
      continue;
    }
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, { url: item.signedUrl, until: now + SIGN_SECONDS * 1000 });
    }
  }
}

/** Alle Fotos eines Posts samt Kommentarbildern */
export const challengePhotoPaths = (row: Partial<ChallengeRow>) => [
  row.image_path,
  row.image_before_path,
  row.image_after_path,
  row.report_photo_path,
  ...(row.extra_image_paths ?? []),
  ...(row.comments ?? []).map((c) => c.image_path),
];

export const signChallengePhotos = (rows: Partial<ChallengeRow>[]) => signPhotos(rows.flatMap(challengePhotoPaths));

/** Fotos löschen, jedes im richtigen Speicher */
export async function removePhotos(paths: string[]): Promise<void> {
  const groups = new Map<string, string[]>();
  for (const p of paths) groups.set(bucketOf(p), [...(groups.get(bucketOf(p)) ?? []), p]);
  for (const [bucket, list] of groups) {
    const { error } = await supabase.storage.from(bucket).remove(list);
    if (error) throw error;
  }
}

/** Gehören die Fotos dieses Posts in den privaten Speicher? Privat, Gruppe oder sehr privat. */
const wantsPrivate = (row: { visibility?: string | null; group_id?: string | null; very_private?: boolean | null }) =>
  row.visibility === 'private' || !!row.group_id || !!row.very_private;

/** Ist der Post privat, sehr privat oder in einer Gruppe? Für Uploads zu einem Post, der schon existiert. */
export async function isPrivateChallenge(id: string): Promise<boolean> {
  // `*`: So klappt es auch, solange die Spalte very_private fehlt (Migration 20261116000200)
  const { data } = await supabase.from('challenges').select('*').eq('id', id).maybeSingle();
  return data ? wantsPrivate(data as ChallengeRow) : false;
}

const uriOf = (source: ImageSource | undefined) =>
  source && typeof source === 'object' && 'uri' in source ? source.uri : undefined;

/** Kopiert ein eigenes Foto an eine neue Stelle (anderer Speicher oder neuer Name). Eine vorhandene Kopie zählt als erledigt. */
async function copyPhoto(path: string, target: string): Promise<void> {
  let url = uriOf(photoUrl(path));
  if (!url) {
    await signPhotos([path]);
    url = uriOf(photoUrl(path));
  }
  if (!url) throw new Error(`Foto nicht lesbar: ${path}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Foto nicht lesbar: ${response.status}`);
  const body = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from(bucketOf(target))
    .upload(target, body, { contentType: response.headers.get('content-type') ?? 'image/jpeg', upsert: false });
  if (error && !/exists|duplicate/i.test(error.message)) throw error;
}

/**
 * Eigene Fotos eines Posts in den passenden Speicher bringen, nach einem Wechsel zwischen Privat und Kiez/Überall
 * oder nach „Sehr privat“. Erst kopieren, dann die Pfade in der Datenbank umstellen, zuletzt die alten Dateien löschen.
 * Bricht etwas ab, zeigen die Pfade weiter auf die alten Dateien, und die Fotos bleiben sichtbar.
 * `fresh` (beim Einschalten von „Sehr privat“): Alle eigenen Fotos bekommen neue Namen. So funktionieren schon
 * verschickte Links sofort nicht mehr, auch die Links mit 24 Stunden Gültigkeit.
 */
export async function syncChallengePhotos(id: string, userId: string, fresh = false): Promise<void> {
  const { data, error } = await supabase.from('challenges').select('*').eq('id', id).maybeSingle();
  if (error || !data) return;
  const row = data as ChallengeRow;
  const wantPrivate = wantsPrivate(row);
  const own = [row.image_path, row.image_before_path, row.image_after_path, ...(row.extra_image_paths ?? [])].filter(
    (p): p is string => !!p && p.startsWith(`${userId}/`) && (fresh || isPrivatePath(p) !== wantPrivate),
  );
  const moving = [...new Set(own)];
  if (!moving.length) return;
  if (fresh) {
    const targets = moving.map(() => newPhotoPath(userId, wantPrivate));
    for (let i = 0; i < moving.length; i++) await copyPhoto(moving[i], targets[i]);
    const { error: rpcError } = await supabase.rpc('rename_challenge_photos', { p_challenge_id: id, p_old: moving, p_new: targets });
    if (rpcError) throw rpcError;
  } else {
    for (const path of moving) await copyPhoto(path, otherPhotoName(path));
    const { error: rpcError } = await supabase.rpc('sync_challenge_photo_names', { p_challenge_id: id });
    if (rpcError) throw rpcError;
  }
  await removePhotos(moving).catch((e) => console.warn('Alte Fotos nicht gelöscht', e));
}
