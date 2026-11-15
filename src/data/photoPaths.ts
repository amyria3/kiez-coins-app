/**
 * Dateinamen der Fotos in den zwei Speichern (Migration 20261116000100_private_fotos). Reine Funktionen, ohne Supabase.
 * Öffentliche Fotos heißen `<user-id>/<datei>`, private `<user-id>/p_<datei>`.
 */
export const PHOTO_BUCKET = 'photos';
export const PRIVATE_BUCKET = 'photos-private';
const PRIVATE_MARK = 'p_';

/** Liegt das Foto im privaten Speicher? */
export const isPrivatePath = (path: string) => (path.split('/')[1] ?? '').startsWith(PRIVATE_MARK);

export const bucketOf = (path: string) => (isPrivatePath(path) ? PRIVATE_BUCKET : PHOTO_BUCKET);

/** Fotos eines privaten Posts oder einer Gruppe kommen in den privaten Speicher */
export const isPrivateAudience = (a: { private?: boolean; groupId?: string | null }) => !!a.private || !!a.groupId;

/** Neuer Dateiname im eigenen Ordner, mit `p_` für den privaten Speicher */
export const newPhotoPath = (userId: string, isPrivate: boolean, now = Date.now()) =>
  `${userId}/${isPrivate ? PRIVATE_MARK : ''}${now}-${Math.random().toString(36).slice(2, 8)}.jpg`;

/** Gleiches Foto im anderen Speicher: `p_` dazu oder weg. Gleiche Regel wie `photo_name_for` in der Datenbank. */
export const otherPhotoName = (path: string) => {
  const [folder, file = ''] = path.split('/');
  return `${folder}/${isPrivatePath(path) ? file.slice(PRIVATE_MARK.length) : PRIVATE_MARK + file}`;
};
