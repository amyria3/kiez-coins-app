import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from './Button';
import { Icon } from './icons/Icon';
import { Text } from './T';
import { addToMyCalendar } from '../data/calendar';
import {
  asSingleEvent,
  cancelEvent,
  eventSaveCount,
  eventWhen,
  likedEvents,
  likeEvent,
  rememberLike,
  saveEvent,
  type ShowcaseEvent,
} from '../data/showcase';
import { t } from '../data/texts';
import { color, font, radius, size, space, text } from '../theme/tokens';

/**
 * Termin aus einem Schaufenster (Daria, 2026-11-10): „Speichern“ legt ihn in Routine ab, „In meine anderen Kalender“
 * gibt eine Kalenderdatei. Das Team sieht, wie viele ihn gespeichert haben (ohne Namen), und kann ihn absagen.
 */
export function ShowcaseEventCard({
  event: e,
  showcase,
  team = false,
  onChanged,
}: {
  event: ShowcaseEvent;
  /** Name des Schaufensters, z. B. in Routine */
  showcase?: string;
  team?: boolean;
  onChanged?: () => void;
}) {
  const [saved, setSaved] = useState(e.saved);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => setSaved(e.saved), [e.saved]);
  // Herz: einfacher Zähler, das Gerät merkt sich, ob es geliked hat (Daria, 2026-11-10)
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(e.likes);
  useEffect(() => setLikes(e.likes), [e.likes]);
  useEffect(() => {
    likedEvents().then((set) => setLiked(set.has(e.id)));
  }, [e.id]);

  const like = async () => {
    const on = !liked;
    setLiked(on);
    setLikes((n) => Math.max(0, n + (on ? 1 : -1)));
    const count = await likeEvent(e.id, on);
    if (count === null) {
      setLiked(!on);
      setLikes((n) => Math.max(0, n + (on ? -1 : 1)));
      return;
    }
    setLikes(count);
    rememberLike(e.id, on);
  };
  useEffect(() => {
    if (team) eventSaveCount(e.id).then(setCount);
  }, [team, e.id]);

  const when = eventWhen(e);
  const past = new Date(e.endsAt ?? e.startsAt).getTime() < Date.now();

  const toggle = async () => {
    setBusy(true);
    const ok = await saveEvent(e.id, !saved);
    setBusy(false);
    if (ok) {
      setSaved(!saved);
      onChanged?.();
    }
  };

  const toCalendar = async () => {
    const ok = await addToMyCalendar(asSingleEvent(e, showcase));
    if (!ok) Alert.alert(t('Hat nicht geklappt'), t('Der Kalender ließ sich gerade nicht öffnen.'));
  };

  const cancel = () =>
    Alert.alert(t('Termin absagen?'), t('Alle, die „{title}“ gespeichert haben, sehen die Absage in Routine.', { title: e.title }), [
      { text: t('Abbrechen'), style: 'cancel' },
      { text: t('Absagen'), style: 'destructive', onPress: () => cancelEvent(e.id).then((ok) => ok && onChanged?.()) },
    ]);

  return (
    <View style={styles.card}>
      {e.image ? <Image source={e.image} style={styles.image} contentFit="cover" /> : null}
      <View style={styles.body}>
        <Text style={[styles.kicker, e.cancelled && styles.kickerCancelled]}>{e.cancelled ? 'Abgesagt' : 'Termin'}</Text>
        <Text noTranslate style={[styles.title, e.cancelled && styles.struck]}>
          {e.title}
        </Text>
        <Text style={styles.sub}>{showcase ? `${when} · ${showcase}` : when}</Text>
        {e.location ? (
          <Text noTranslate style={styles.sub}>
            {e.location}
          </Text>
        ) : null}
        {e.body ? (
          <Text noTranslate style={styles.text}>
            {e.body}
          </Text>
        ) : null}
        {team && count !== null ? (
          <Text style={styles.sub}>{count === 1 ? t('1 Mensch hat den Termin gespeichert.') : t('{n} Menschen haben den Termin gespeichert.', { n: count })}</Text>
        ) : null}
      </View>
      <View style={styles.likeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: liked, disabled: e.cancelled }}
          accessibilityLabel={likes ? t('Gefällt mir, {likeCount} Likes', { likeCount: likes }) : t('Gefällt mir')}
          disabled={e.cancelled}
          onPress={like}
          hitSlop={8}
          style={({ pressed }) => [styles.like, pressed && styles.pressed]}
        >
          <Icon name="heart" size={size.icon} color={liked ? color.accent.affection : color.text.primary} />
          {likes > 0 ? <Text style={styles.likeCount}>{likes}</Text> : null}
        </Pressable>
      </View>
      {!e.cancelled && !past ? (
        <View style={styles.actions}>
          <Button label={saved ? 'Gespeichert' : 'Speichern'} variant="secondary" icon={saved ? 'check' : undefined} busy={busy} onPress={toggle} />
          <Button label="In meine anderen Kalender" variant="ghost" onPress={toCalendar} />
          {team ? (
            <Pressable onPress={cancel} hitSlop={8} accessibilityRole="button" style={styles.cancel}>
              <Text style={styles.cancelText}>Termin absagen</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Wenig Rundung wie die Posts im Feed (Daria, 2026-11-10)
  card: { borderRadius: radius.post, backgroundColor: color.bg.surface, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 9 },
  body: { gap: space[4], padding: space[16], paddingBottom: space[12] },
  kicker: { ...text.caption, fontFamily: font.medium, color: color.accent.primary },
  kickerCancelled: { color: color.accent.error },
  title: { ...text.cardTitle, color: color.text.primary },
  struck: { textDecorationLine: 'line-through', color: color.text.secondary },
  sub: { ...text.caption, color: color.text.secondary },
  text: { ...text.body, color: color.text.primary, marginTop: space[4] },
  likeRow: { flexDirection: 'row', paddingHorizontal: space[16], paddingBottom: space[12] },
  like: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  pressed: { opacity: 0.6 },
  likeCount: { ...text.body, fontFamily: font.medium, color: color.text.primary },
  actions: { gap: space[8], paddingHorizontal: space[16], paddingBottom: space[16] },
  cancel: { alignSelf: 'center', paddingVertical: space[4] },
  cancelText: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
});
