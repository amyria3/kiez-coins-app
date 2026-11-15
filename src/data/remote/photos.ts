import { supabase } from '../../lib/supabase';

import type { ImageSource } from '../types';
import { bucketOf, isPrivatePath, otherPhotoName, PHOTO_BUCKET, PRIVATE_BUCKET } from '../photoPaths';
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

/** Ist der Post privat oder in einer Gruppe? Für Uploads zu einem Post, der schon existiert. */
export async function isPrivateChallenge(id: string): Promise<boolean> {
  const { data } = await supabase.from('challenges').select('visibility, group_id').eq('id', id).maybeSingle();
  const row = data as { visibility?: string; group_id?: string | null } | null;
  return row?.visibility === 'private' || !!row?.group_id;
}

/** Kopiert ein eigenes Foto in den anderen Speicher. Eine schon vorhandene Kopie zählt als erledigt. */
const uriOf = (source: ImageSource | undefined) =>
  source && typeof source === 'object' && 'uri' in source ? source.uri : undefined;

async function copyToOtherBucket(path: string): Promise<void> {
  let url = uriOf(photoUrl(path));
  if (!url) {
    await signPhotos([path]);
    url = uriOf(photoUrl(path));
  }
  if (!url) throw new Error(`Foto nicht lesbar: ${path}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Foto nicht lesbar: ${response.status}`);
  const body = await response.arrayBuffer();
  const target = otherPhotoName(path);
  const { error } = await supabase.storage
    .from(bucketOf(target))
    .upload(target, body, { contentType: response.headers.get('content-type') ?? 'image/jpeg', upsert: false });
  if (error && !/exists|duplicate/i.test(error.message)) throw error;
}

/**
 * Nach einem Wechsel zwischen Privat und Kiez/Überall: eigene Fotos in den passenden Speicher bringen.
 * Erst kopieren, dann die Pfade in der Datenbank umstellen, zuletzt die alten Dateien löschen. Bricht etwas ab,
 * zeigen die Pfade weiter auf die alten Dateien, und die Fotos bleiben sichtbar.
 */
export async function syncChallengePhotos(id: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('challenges')
    .select('visibility, group_id, image_path, image_before_path, image_after_path, extra_image_paths')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return;
  const row = data as Partial<ChallengeRow> & { visibility?: string; group_id?: string | null };
  const wantPrivate = row.visibility === 'private' || !!row.group_id;
  const own = [row.image_path, row.image_before_path, row.image_after_path, ...(row.extra_image_paths ?? [])].filter(
    (p): p is string => !!p && p.startsWith(`${userId}/`) && isPrivatePath(p) !== wantPrivate,
  );
  const moving = [...new Set(own)];
  if (!moving.length) return;
  for (const path of moving) await copyToOtherBucket(path);
  const { error: rpcError } = await supabase.rpc('sync_challenge_photo_names', { p_challenge_id: id });
  if (rpcError) throw rpcError;
  await removePhotos(moving).catch((e) => console.warn('Alte Fotos nicht gelöscht', e));
}
