import { Platform } from 'react-native';

import { shareText } from '../lib/share';
import { shareImageFiles, sheetImageFiles } from '../lib/sheetImages';
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

/**
 * Teilen-Knopf an einem Post: Bild und Link zusammen (Daria, 07.11.2026). Bilder sind die Fotos des Posts oder bei
 * einem Text-Post die Blätter als Slides. Einen Link gibt es bei eigenen öffentlichen Posts, er führt zur
 * öffentlichen Seite, damit Menschen ohne KiezCoins Foto und Text sehen. Sonst steht nur der Titel dabei.
 * Bilder gehen nur im Browser mit; in der App bleibt es bei Titel und Link.
 */
export function useShareChallenge(): (challenge: Challenge) => Promise<void> {
  const { currentUserId, mode, users } = useStore();
  return async (challenge) => {
    const title = challenge.title.trim() ? t('{title} – KiezCoins', { title: challenge.title }) : 'KiezCoins';
    // Blätter vor allem Warten zeichnen
    const slides = challenge.pages?.length ? sheetImageFiles(
          challenge.pages,
          challenge.title,
          challenge.sheetFont,
          users.find((u) => u.id === challenge.authorId)?.name,
        ) : null;
    // Link zum Post immer dabei (Daria, 07.11.2026): öffentliche Seite, wenn es eine geben darf, sonst der Post in der
    // Web-App (sehen kann ihn dort nur, wer ihn auch in der App sieht)
    let message = mode === 'live' ? `${title}\n${WEB_APP_URL}/challenge/${challenge.id}` : title;
    if (mode === 'live' && canSharePublicly(challenge, currentUserId)) {
      try {
        await shareChallengePublicly(challenge.id);
        message = `${title}\n${sharePageUrl(challenge.id)}`;
      } catch {
        // Ohne Migration oder bei einem Fehler: Titel ohne Link teilen
      }
    }
    const files = slides ?? (await photoFiles(challenge));
    if (files.length) {
      const result = await shareImageFiles(files, message);
      if (result === 'shared') return;
      // Heruntergeladen (Browser ohne Teilen-Menü): Titel und Link zusätzlich in die Zwischenablage
      if (result === 'downloaded') return shareText(message);
    }
    return shareText(message);
  };
}
