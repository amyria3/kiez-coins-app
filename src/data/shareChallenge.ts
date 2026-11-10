import { Platform } from 'react-native';

import { shareText } from '../lib/share';
import { openShareDialog, type SharePrepared } from '../components/ShareDialog';
import { framePhotoFiles, sheetImageFiles, type SheetAuthor } from '../lib/sheetImages';
import { WEB_APP_URL } from './groups';
import { shareChallengePublicly } from './remote';
import { useStore } from './store';
import { t } from './texts';
import type { Challenge } from './types';

/** Öffentliche Seite eines geteilten Posts (Vercel-Funktion api/c.mjs). */
export const sharePageUrl = (id: string) => `https://kiezcoins.de/c/${id}?von=teilen`;

/**
 * Darf dieser Post eine öffentliche Seite bekommen? Nur eigene, öffentliche Posts ohne Gruppe und ohne
 * 5-km-Grenze (Daria, 03.11.2026). Die Datenbank prüft dasselbe in share_challenge.
 */
export function canSharePublicly(challenge: Challenge, userId: string | undefined): boolean {
  return (
    !!userId &&
    challenge.authorId === userId &&
    !challenge.private &&
    !challenge.groupId &&
    !challenge.localOnly &&
    challenge.status !== 'draft' &&
    challenge.status !== 'deleted'
  );
}

/** Adresse eines Bildes, wenn es eine hat (Fotos aus dem Storage, Demo-Bilder im Browser) */
function imageUri(source: unknown): string | null {
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object' && 'uri' in source && typeof (source as { uri: unknown }).uri === 'string') {
    return (source as { uri: string }).uri;
  }
  return null;
}

/** Name und Profilbild für den Kopf der Blätter */
function sheetAuthor(user?: { name: string; avatar?: unknown }): SheetAuthor | undefined {
  return user?.name ? { name: user.name, avatarUri: imageUri(user.avatar) ?? undefined } : undefined;
}

/** Fotos eines Posts als Dateien zum Teilen, nur im Browser. Fehlt eins oder dauert es zu lange, ohne dieses. */
async function photoFiles(challenge: Challenge): Promise<File[]> {
  if (Platform.OS !== 'web') return [];
  const sources =
    challenge.type === 'before_after'
      ? [challenge.imageBefore, challenge.imageAfter]
      : [challenge.image, ...(challenge.extraImages ?? []).map((e) => e.photo)];
  const uris = sources.map(imageUri).filter((u): u is string => !!u);
  const files = await Promise.all(
    uris.map(async (uri, i) => {
      try {
        const res = await Promise.race([
          fetch(uri),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ]);
        if (!res.ok) return null;
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) return null;
        const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
        return new File([blob], `kiezcoins-${i + 1}.${ext}`, { type: blob.type });
      } catch {
        return null;
      }
    }),
  );
  return files.filter((f): f is File => !!f);
}

/** Schon vorbereitete Bilder und Texte je Post, damit erneutes Teilen sofort geht */
const prepared = new Map<string, Promise<SharePrepared>>();

/**
 * Teilen-Knopf an einem Post: Bild und Link (Daria, 07.11.2026). Bilder sind die Fotos des Posts oder bei einem
 * Text-Post die Blätter als Slides. Der Link führt zur öffentlichen Seite, wenn der Post eine haben darf, sonst
 * zum Post in der Web-App. Im Browser führt ein Dialog durchs Teilen (components/ShareDialog.tsx); in der App
 * bleibt es bei Titel und Link.
 */
export function useShareChallenge(): (challenge: Challenge) => Promise<void> {
  const { currentUserId, mode, users } = useStore();
  return async (challenge) => {
    const title = challenge.title.trim() ? t('{title} – KiezCoins', { title: challenge.title }) : 'KiezCoins';
    const makeMessage = async () => {
      if (mode === 'live' && canSharePublicly(challenge, currentUserId)) {
        try {
          await shareChallengePublicly(challenge.id);
          return `${title}\n${sharePageUrl(challenge.id)}`;
        } catch {
          // Ohne Migration oder bei einem Fehler: Link in die Web-App
        }
      }
      return mode === 'live' ? `${title}\n${WEB_APP_URL}/challenge/${challenge.id}` : title;
    };
    if (Platform.OS !== 'web') return shareText(await makeMessage());

    const author = users.find((u) => u.id === challenge.authorId);
    const key = [challenge.id, author?.name ?? '', imageUri(author?.avatar) ?? '', challenge.title, challenge.sheetFont, ...(challenge.pages ?? [])].join('\u0000');
    let job = prepared.get(key);
    if (!job) {
      // Bilder und Link gleichzeitig vorbereiten
      job = Promise.all([
        challenge.pages?.length
          ? sheetImageFiles(challenge.pages, challenge.title, challenge.sheetFont, sheetAuthor(author)).then(
              (files) => files ?? [],
            )
          : photoFiles(challenge).then(async (raw) => {
              const by = sheetAuthor(author);
              return { files: await framePhotoFiles(raw, by), photos: { raw, author: by } };
            }),
        makeMessage(),
      ]).then(([result, message]) =>
        Array.isArray(result)
          ? { files: result, message, slides: true }
          : { files: result.files, message, slides: false, photos: result.photos },
      );
      prepared.set(key, job);
      job.catch(() => prepared.delete(key));
    }
    if (!openShareDialog(job, (message) => void shareText(message))) return shareText((await job).message);
  };
}
