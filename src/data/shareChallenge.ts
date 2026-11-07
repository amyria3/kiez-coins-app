import { shareText } from '../lib/share';
import { shareImageFiles, sheetImageFiles } from '../lib/sheetImages';
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

/**
 * Teilen-Knopf an einem Post. Eigene Posts teilt er mit Link zur öffentlichen Seite, damit Menschen ohne
 * KiezCoins Foto und Text sehen. Fremde Posts und die Demo teilen wie bisher nur den Titel.
 */
export function useShareChallenge(): (challenge: Challenge) => Promise<void> {
  const { currentUserId, mode } = useStore();
  return async (challenge) => {
    const title = challenge.title.trim() ? t('{title} – KiezCoins', { title: challenge.title }) : 'KiezCoins';
    // Text-Post: die Blätter als Bilder teilen, nicht den Text (Daria, 07.11.2026). Vor allem Warten zeichnen.
    const slides = challenge.pages?.length ? sheetImageFiles(challenge.pages, challenge.title, challenge.sheetFont) : null;
    if (slides && (await shareImageFiles(slides))) return;
    if (mode === 'live' && canSharePublicly(challenge, currentUserId)) {
      try {
        await shareChallengePublicly(challenge.id);
        return shareText(`${title}\n${sharePageUrl(challenge.id)}`);
      } catch {
        // Ohne Migration oder bei einem Fehler: Titel ohne Link teilen
      }
    }
    return shareText(title);
  };
}
