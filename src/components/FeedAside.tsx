import { Pressable, StyleSheet, View } from 'react-native';

import { eventWhen } from '../data/showcase';
import type { FeedEvent, TodayOwn } from '../data/feedSummary';
import { eventTime } from '../data/calendar';
import { formatEuro, formatRemainingShort } from '../data/format';
import { t } from '../data/texts';
import type { Challenge } from '../data/types';
import { color, radius, size, space, stroke, text } from '../theme/tokens';
import { KaterCard } from './Content';
import { Icon } from './icons/Icon';
import { Text } from './T';

/** So viele offene Challenges stehen höchstens in der Spalte */
const OPEN_MAX = 5;

/**
 * Rechte Spalte neben dem Feed am Desktop (Daria, 2026-11-28): fasst den gewählten Feed zusammen, mit seinen Terminen
 * und offenen Challenges. Eigene Termine stehen nur als eine graue Zeile darüber, ein Klick führt in die Routine.
 */
export function FeedAside({
  greeting,
  onKater,
  title,
  events,
  open,
  own,
  onEvent,
  onChallenge,
  onOwn,
}: {
  /** Gruß des Katers: Am Desktop steht er hier statt über dem Feed */
  greeting: { title: string; sub: string };
  /** Tipp auf den Kater: „Was Du so machst“ */
  onKater: () => void;
  /** Welcher Feed, z. B. „Im Kiez Neukölln“ oder der Name der Gruppe */
  title: string;
  /** `null`, solange die Termine laden; `undefined`: Dieser Feed hat keine Termine (Me & Myself) */
  events: FeedEvent[] | null | undefined;
  open: Challenge[];
  own: TodayOwn | null;
  onEvent: (e: FeedEvent) => void;
  onChallenge: (id: string) => void;
  onOwn: () => void;
}) {
  const shownOpen = open.slice(0, OPEN_MAX);
  const more = open.length - shownOpen.length;
  const nothing = !!events && events.length === 0 && open.length === 0;
  return (
    <View style={styles.wrap}>
      <KaterCard title={greeting.title} onPress={onKater} accessibilityHint={t('Was Du so machst')}>
        {greeting.sub || t('Schön, dass Du da bist.')}
      </KaterCard>
      {own && own.count > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onOwn}
          style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.own, hovered && styles.ownHover]}
        >
          <Icon name="calendar" size={size.icon * 0.8} color={color.text.secondary} />
          <Text style={styles.ownText}>
            {own.next
              ? t('{n, plural, one {Heute steht bei Dir # Termin an, um {zeit}.} other {Heute stehen bei Dir # Termine an, der nächste um {zeit}.}}', {
                  n: own.count,
                  zeit: eventTime(own.next),
                })
              : t('{n, plural, one {Heute steht bei Dir # Termin an.} other {Heute stehen bei Dir # Termine an.}}', { n: own.count })}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {events && events.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>{t('Termine')}</Text>
            {events.map((e) => (
              <Row key={e.id} onPress={() => onEvent(e)}>
                <Text style={styles.when}>{eventWhen(e)}</Text>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {e.title}
                </Text>
                <Text style={styles.meta} numberOfLines={1} noTranslate>
                  {e.showcase}
                </Text>
              </Row>
            ))}
          </View>
        ) : null}
        {shownOpen.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>{t('Offene Challenges')}</Text>
            {shownOpen.map((c) => (
              <Row key={c.id} onPress={() => onChallenge(c.id)}>
                <View style={styles.line}>
                  <Text style={[styles.rowTitle, styles.grow]} numberOfLines={2} noTranslate>
                    {c.title}
                  </Text>
                  {c.bountyAmount ? <Text style={styles.reward}>{formatEuro(c.bountyAmount)}</Text> : null}
                  {!c.bountyAmount && c.edensteine ? (
                    <Text style={styles.reward}>{t('{edensteine} Edensteine', { edensteine: c.edensteine })}</Text>
                  ) : null}
                </View>
                {c.deadline ? <Text style={styles.meta}>{formatRemainingShort(c.deadline)}</Text> : null}
              </Row>
            ))}
            {more > 0 ? <Text style={styles.meta}>{t('{n, plural, one {und # weitere} other {und # weitere}}', { n: more })}</Text> : null}
          </View>
        ) : null}
        {nothing ? <Text style={styles.empty}>{t('Gerade steht hier nichts an.')}</Text> : null}
      </View>
    </View>
  );
}

function Row({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [styles.row, hovered && styles.rowHover, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Beginnt auf der Linie der ersten Reihe Posts: 48 px Schalter plus 48 px Abstand unter der Oberkante der Spalte
  wrap: { gap: space[12], paddingTop: space[48] + space[48] },
  own: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingHorizontal: space[12],
    paddingVertical: space[8],
    borderRadius: radius.md,
  },
  ownHover: { backgroundColor: color.bg.surface },
  ownText: { ...text.small, color: color.text.secondary, flex: 1 },
  card: {
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
    padding: space[16],
    gap: space[16],
  },
  title: { ...text.cardTitleCompact, color: color.text.primary },
  section: { gap: space[2] },
  heading: { ...text.caption, color: color.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: space[4] },
  row: { marginHorizontal: -space[8], paddingHorizontal: space[8], paddingVertical: space[8], borderRadius: radius.sm, gap: space[2] },
  rowHover: { backgroundColor: color.bg.surface },
  pressed: { opacity: 0.6 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[8] },
  grow: { flex: 1 },
  when: { ...text.small, color: color.text.secondary },
  rowTitle: { ...text.bodyStrong, color: color.text.primary },
  reward: { ...text.bodyStrong, color: color.text.primary },
  meta: { ...text.small, color: color.text.secondary },
  empty: { ...text.body, color: color.text.secondary },
});
