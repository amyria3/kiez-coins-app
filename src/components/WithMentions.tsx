import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

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

/** @-Namen in color/text/mention; die Marken #vorher/#nachher/#InDiesemMoment in color/accent/primary hervorheben (verschachteltes Text). */
export function WithMentions({ value }: { value: string }) {
  const parts = value.split(/(@[\p{L}\p{N}_]+|#vorher\b|#nachher\b|#InDiesemMoment\b)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={{ color: color.text.mention }}>
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

/** Höchstens so viele Zeilen Text unter einer Me- oder We-Challenge im Feed, #vorher und #nachher zusammen (Daria, 2026-11-09) */
const VORHER_NACHHER_ZEILEN = 3;

/**
 * Text unter einer Me- oder We-Challenge im Feed: #vorher mit Text und, sobald es ihn gibt, #nachher mit Text, zusammen
 * höchstens drei Zeilen. #nachher beginnt immer auf einer eigenen Zeile und bleibt sichtbar: Der Vorher-Text bekommt
 * eine oder zwei Zeilen, je nachdem wie lang er ist, der Nachher-Text den Rest.
 */
export function BeforeAfterText({ value, style }: { value: string; style: StyleProp<TextStyle> }) {
  const [breite, setBreite] = useState(0);
  const match = /(^|\s)#nachher\b/.exec(value);
  const vorher = (match ? value.slice(0, match.index) : value).trim();
  const nachher = match ? value.slice(match.index).trim() : '';
  if (!nachher) {
    return (
      <Text style={style} numberOfLines={VORHER_NACHHER_ZEILEN}>
        <WithMentions value={vorher} />
      </Text>
    );
  }
  // Grobe Schätzung der Zeilen für den Vorher-Text: Zeichen pro Zeile aus Breite und Schriftgröße
  const schrift = StyleSheet.flatten(style)?.fontSize ?? 14;
  const proZeile = breite ? Math.max(10, Math.floor(breite / (schrift * 0.52))) : 40;
  const vorherZeilen = vorher ? Math.min(VORHER_NACHHER_ZEILEN - 1, Math.max(1, Math.ceil(vorher.length / proZeile))) : 0;
  return (
    <View onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
      {vorher ? (
        <Text style={style} numberOfLines={vorherZeilen}>
          <WithMentions value={vorher} />
        </Text>
      ) : null}
      <Text style={style} numberOfLines={VORHER_NACHHER_ZEILEN - vorherZeilen}>
        <WithMentions value={nachher} />
      </Text>
    </View>
  );
}
