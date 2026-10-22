import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/T';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBadge } from '../components/Badges';
import { KaterCard } from '../components/Content';
import { Cat } from '../components/icons/Brand';
import { Icon } from '../components/icons/Icon';
import { TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { anrede, formatBountyShort, formatRelative } from '../data/format';
import { catVariant, reiseEntries, reiseMood, reiseMoodText, type ReiseEntry } from '../data/reise';
import { useStore } from '../data/store';
import { color, font, radius, size, space, stroke, text } from '../theme/tokens';
import { t } from '../data/texts';

/** Was in der Karte „Du bist dran“ als Aufgabe steht. */
function taskLabel({ challenge, role }: ReiseEntry): string {
  if (role === 'author' && challenge.status === 'reported') return 'Erledigung prüfen';
  if (role === 'author' && challenge.status === 'payment_open') return 'Coins bezahlen';
  if (role === 'assignee' && challenge.status === 'paid_marked') return 'Coins bestätigen';
  return 'Erledigt melden';
}

/**
 * Route `reise` (Tab „Your Pleasure“ in der Tab-Leiste, Tipp auf den Kater im Feed oder „Your Pleasure“ im Konto).
 * Upgrade „Nachtschicht“: Kater mit Sprechblase, Aufgaben „Du bist dran“, Bilanz, Deine Gruppen und Verlauf,
 * getrennt nach öffentlichen Challenges und Gruppenaufgaben.
 */
export default function Reise() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenges, currentUserId, profile, groups } = useStore();
  const entries = useMemo(() => reiseEntries(challenges, currentUserId), [challenges, currentUserId]);
  const mood = reiseMood(entries);
  const tasks = entries.filter((e) => e.needsAction);
  const history = entries.filter((e) => !e.needsAction);
  const publicHistory = history.filter((e) => !e.challenge.groupId);
  const groupHistory = history.filter((e) => !!e.challenge.groupId);
  // Selbst gegründete Gruppen zuerst
  const ownGroups = [...groups].sort(
    (a, b) => Number(b.founderId === currentUserId) - Number(a.founderId === currentUserId),
  );
  const created = entries.filter((e) => e.role === 'author').length;
  const accepted = entries.filter((e) => e.role === 'assignee').length;
  const earned = entries
    .filter((e) => e.role === 'assignee' && e.challenge.status === 'paid')
    .reduce((sum, e) => sum + (e.challenge.bountyAmount ?? 0), 0);

  const toFeed = () => (router.canGoBack() ? router.back() : router.replace('/feed'));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}>
        <Text style={styles.title} accessibilityRole="header">
          Your Pleasure
        </Text>

        <KaterCard mood={catVariant(mood)}>{reiseMoodText(mood, anrede(profile))}</KaterCard>

        {tasks.map((entry) => (
          <Pressable
            key={entry.challenge.id}
            accessibilityRole="button"
            accessibilityLabel={t('Du bist dran: {entry}, {label}', { entry: taskLabel(entry), label: entry.label })}
            onPress={() => router.push(entry.href)}
            style={({ pressed }) => [styles.task, pressed && styles.pressed]}
          >
            <Thumb entry={entry} size={64} />
            <View style={styles.flex}>
              <Text style={styles.taskKicker}>Du bist dran</Text>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {taskLabel(entry)}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {entry.label}
              </Text>
            </View>
            <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
          </Pressable>
        ))}

        {entries.length > 0 ? (
          <View style={styles.stats}>
            <Stat value={String(created)} label="erstellt" />
            <Stat value={String(accepted)} label="angenommen" />
            <Stat value={formatBountyShort(earned)} label="verdient" signal />
          </View>
        ) : null}

        {/* Öffentlicher Verlauf zuerst, darunter Gruppen (Daria, 22.10.2026) */}
        <History title="Verlauf" entries={publicHistory} onOpen={(entry) => router.push(entry.href)} />

        {ownGroups.length > 0 ? (
          <View style={styles.historyBlock}>
            <Text style={styles.sectionLabel}>{ownGroups.length === 1 ? 'Deine Gruppe' : 'Deine Gruppen'}</Text>
            <View style={styles.list}>
              {ownGroups.map((group, i) => (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('Gruppe {name} öffnen', { name: group.name })}
                  onPress={() => router.dismissTo({ pathname: '/feed', params: { gruppe: group.id } })}
                  style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.pressed]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {group.founderId === currentUserId ? 'Von Dir gegründet' : 'Mitglied'} ·{' '}
                      {group.members.length === 1 ? '1 Person' : t('{members} Personen', { members: group.members.length })}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <History
          title="Verlauf Gruppen"
          entries={groupHistory}
          groupName={(id) => groups.find((g) => g.id === id)?.name}
          onOpen={(entry) => router.push(entry.href)}
        />
      </ScrollView>
      <TabBar
        active="reise"
        hasTasks={tasks.length > 0}
        onFeedPress={toFeed}
        onReisePress={() => {}}
        onMenuPress={() => router.push('/account')}
      />
    </View>
  );
}

/** Verlauf als Liste. Bei Gruppenaufgaben steht der Gruppenname in der Unterzeile. */
function History({
  title,
  entries,
  groupName,
  onOpen,
}: {
  title: string;
  entries: ReiseEntry[];
  groupName?: (id: string) => string | undefined;
  onOpen: (entry: ReiseEntry) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <View style={styles.historyBlock}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.list}>
        {entries.map((entry, i) => {
          const group = entry.challenge.groupId ? groupName?.(entry.challenge.groupId) : undefined;
          return (
            <Pressable
              key={entry.challenge.id}
              accessibilityRole="button"
              accessibilityLabel={entry.label}
              onPress={() => onOpen(entry)}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.pressed]}
            >
              <Thumb entry={entry} size={44} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {entry.label}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {[group, entry.role === 'author' ? 'Erstellt' : 'Angenommen', formatRelative(entry.lastActivity)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <StatusBadge status={entry.challenge.status} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Thumb({ entry, size: side }: { entry: ReiseEntry; size: number }) {
  const { challenge } = entry;
  const image = challenge.image ?? challenge.imageAfter ?? challenge.report?.photo;
  const box = { width: side, height: side, borderRadius: side >= 60 ? radius.lg : radius.md };
  if (image) return <Image source={image} style={box} contentFit="cover" />;
  return (
    <View style={[box, styles.thumbFallback]}>
      <Cat height={side * 0.55} />
    </View>
  );
}

function Stat({ value, label, signal }: { value: string; label: string; signal?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, signal && styles.signal]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  content: { paddingTop: space[24], paddingHorizontal: space[20], gap: space[16] },
  flex: { flex: 1, gap: space[2] },
  pressed: { opacity: 0.8 },
  title: { ...text.display, color: color.text.primary },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    borderRadius: radius.xl + 4,
    backgroundColor: color.bg.surface,
    borderWidth: stroke.thin,
    borderColor: color.accent.signal,
  },
  taskKicker: { ...text.caption, fontFamily: font.medium, color: color.accent.signal },
  taskTitle: { ...text.cardTitle, fontSize: 17, lineHeight: 21, color: color.text.primary },
  sub: { ...text.caption, fontSize: 12, color: color.text.secondary },
  stats: { flexDirection: 'row', gap: space[8] },
  stat: { flex: 1, gap: space[4], padding: space[12], borderRadius: radius.lg, backgroundColor: color.bg.surface },
  statValue: { ...text.metric, fontSize: 24, lineHeight: 28, color: color.text.primary },
  statLabel: { ...text.caption, color: color.text.secondary },
  signal: { color: color.accent.signal },
  historyBlock: { gap: space[8] },
  sectionLabel: { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary },
  list: { borderRadius: radius.xl + 2, backgroundColor: color.bg.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12], paddingHorizontal: space[12] },
  rowDivider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  rowTitle: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: color.text.primary },
  thumbFallback: { backgroundColor: color.bg.screen, alignItems: 'center', justifyContent: 'center' },
});
