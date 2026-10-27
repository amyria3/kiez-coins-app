import type { Challenge } from '../data/types';
import { weChallengeText } from '../data/weChallenge';
import { color, font, isFashionable } from '../theme/tokens';
import { Text } from './T';

/**
 * Feste Marke vor jedem Beitrag „Bild“ (Daria, 27.10.2026). Wie #vorher und #nachher in allen Sprachen gleich.
 * Sie steht nicht im gespeicherten Text, die App setzt sie beim Anzeigen davor. So tragen auch ältere Bilder sie.
 */
export const PHOTO_TAG = '#InDiesemMoment';

/**
 * Text eines Beitrags zum Anzeigen: bei „Bild“ mit #InDiesemMoment vorn, auch ohne eigenen Text.
 * We-Challenge: #vorher vor der Beschreibung, nach dem Bestätigen #nachher vor der Notiz (Daria, 27.10.2026).
 */
export function postText(challenge: Challenge): string {
  if (challenge.type === 'individual') return weChallengeText(challenge);
  const own = challenge.text?.trim() ?? '';
  if (challenge.type !== 'photo') return own;
  return own ? `${PHOTO_TAG} ${own}` : PHOTO_TAG;
}

const TAGS = ['#vorher', '#nachher', PHOTO_TAG];

/** @-Namen und die Marken #vorher/#nachher/#InDiesemMoment in color/accent/signal hervorheben (verschachteltes Text). */
export function WithMentions({ value }: { value: string }) {
  const parts = value.split(/(@[\p{L}\p{N}_]+|#vorher\b|#nachher\b|#InDiesemMoment\b)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={{ color: color.accent.signal }}>
            {part}
          </Text>
        ) : TAGS.includes(part) ? (
          <Text key={i} noTranslate style={{ color: color.accent.signal, fontFamily: isFashionable ? font.semiBold : font.medium }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}
