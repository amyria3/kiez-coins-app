import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from './Button';
import { Icon } from './icons/Icon';
import { Text } from './T';
import { HandButton } from './routine/cards';
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
import { color, radius, size, space, text } from '../theme/tokens';

/**
 * Termin aus einem Schaufenster (Daria, 2026-11-10): „Speichern“ legt ihn in Routine ab, „In meine anderen Kalender“
 * gibt eine Kalenderdatei. Das Team sieht, wie viele ihn gespeichert haben (ohne Namen), und kann ihn absagen.
 */
export function ShowcaseEventCard({
  event: e,
  showcase,
  team = false,
  onChanged,
  compact = false,
}: {
  event: ShowcaseEvent;
  /**
   * Karte in der Reihe „Termine“ im Schaufenster (Daria, 2026-11-17): Leuchtgelb mit Schrift in Tinte, Datum als Pille,
   * Knöpfe mit handgezeichnetem Rand wie in Routine.
   */
  compact?: boolean;
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

  if (compact) {
    const ink = color.showcaseCards.ink;
    return (
      <View style={[styles.compact, e.cancelled && styles.compactCancelled]}>
        {e.image ? <Image source={e.image} style={styles.compactImage} contentFit="cover" /> : null}
        <View style={styles.compactBody}>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>{e.cancelled ? t('Abgesagt') : when}</Text>
          </View>
          <Text noTranslate style={[styles.compactTitle, e.cancelled && styles.struck]} numberOfLines={3}>
            {e.title}
          </Text>
          {e.location ? (
            <Text noTranslate selectable style={styles.compactSub}>
              {e.location}
            </Text>
          ) : null}
          {e.body ? (
            <Text noTranslate style={styles.compactText} numberOfLines={4}>
              {e.body}
            </Text>
          ) : null}
          {team && count !== null ? (
            <Text style={styles.compactSub}>
              {count === 1 ? t('1 Mensch hat den Termin gespeichert.') : t('{n} Menschen haben den Termin gespeichert.', { n: count })}
            </Text>
          ) : null}
          <View style={styles.compactActions}>
            {!e.cancelled && !past ? (
              <HandButton label={saved ? 'Gemerkt' : 'Merken'} filled bg={color.showcaseCards.event} disabled={busy} onPress={toggle} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: liked, disabled: e.cancelled }}
              accessibilityLabel={likes ? t('Gefällt mir, {likeCount} Likes', { likeCount: likes }) : t('Gefällt mir')}
              disabled={e.cancelled}
              onPress={like}
              hitSlop={8}
              style={({ pressed }) => [styles.like, pressed && styles.pressed]}
            >
              <Icon name="heart" size={size.icon} color={liked ? color.accent.affection : ink} />
              {likes > 0 ? <Text style={[styles.likeCount, { color: ink }]}>{likes}</Text> : null}
            </Pressable>
          </View>
          {!e.cancelled && !past ? (
            <View style={styles.compactLinks}>
              <Pressable onPress={toCalendar} hitSlop={6} accessibilityRole="button">
                <Text style={styles.compactLink}>In meine anderen Kalender</Text>
              </Pressable>
              {team ? (
                <Pressable onPress={cancel} hitSlop={6} accessibilityRole="button">
                  <Text style={styles.compactLink}>Termin absagen</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

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
  kicker: { ...text.captionStrong, color: color.accent.primary },
  kickerCancelled: { color: color.accent.error },
  title: { ...text.cardTitle, color: color.text.primary },
  struck: { textDecorationLine: 'line-through', color: color.text.secondary },
  sub: { ...text.caption, color: color.text.secondary },
  text: { ...text.body, color: color.text.primary, marginTop: space[4] },
  likeRow: { flexDirection: 'row', paddingHorizontal: space[16], paddingBottom: space[12] },
  like: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  pressed: { opacity: 0.6 },
  likeCount: { ...text.label, color: color.text.primary },
  actions: { gap: space[8], paddingHorizontal: space[16], paddingBottom: space[16] },
  cancel: { alignSelf: 'center', paddingVertical: space[4] },
  cancelText: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
  compact: { flex: 1, borderRadius: radius.md, backgroundColor: color.showcaseCards.event, overflow: 'hidden' },
  compactCancelled: { opacity: 0.7 },
  compactImage: { width: '100%', aspectRatio: 16 / 9 },
  compactBody: { gap: space[6], padding: space[16] },
  datePill: { alignSelf: 'flex-start', borderRadius: radius.full, backgroundColor: color.showcaseCards.ink, paddingVertical: 3, paddingHorizontal: space[8] + 2 },
  dateText: { ...text.captionStrong, color: color.showcaseCards.event },
  compactTitle: { ...text.cardTitle, color: color.showcaseCards.ink },
  compactSub: { ...text.bodySm, color: color.showcaseCards.inkSoft },
  compactText: { ...text.bodySm, color: color.showcaseCards.ink },
  compactActions: { flexDirection: 'row', alignItems: 'center', gap: space[16], marginTop: space[6] },
  compactLinks: { flexDirection: 'row', gap: space[16], marginTop: space[2] },
  compactLink: { ...text.caption, color: color.showcaseCards.inkSoft, textDecorationLine: 'underline' },
});
