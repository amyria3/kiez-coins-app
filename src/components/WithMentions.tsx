import type { Challenge } from '../data/types';
import { weChallengeText } from '../data/weChallenge';
import { color, font } from '../theme/tokens';
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
  // Post nur mit Text: keine Marke, der Text steht auf den Blättern
  if (challenge.type !== 'photo' || challenge.pages?.length) return own;
  return own ? `${PHOTO_TAG} ${own}` : PHOTO_TAG;
}

const TAGS = ['#vorher', '#nachher', PHOTO_TAG];

/** @-Namen in color/accent/signal und die Marken #vorher/#nachher/#InDiesemMoment in color/accent/primary hervorheben (verschachteltes Text). */
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
          // Hashtags in Lila (Daria, 2026-11-07), in der Schrift der Texte über dem Bild wie Ort und Titel (Daria, 2026-11-08)
          <Text key={i} noTranslate style={{ color: color.accent.primary, fontFamily: font.onPhoto }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}
