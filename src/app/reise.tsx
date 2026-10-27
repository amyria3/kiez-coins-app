import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/T';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBadge } from '../components/Badges';
import { KaterCard } from '../components/Content';
import { Cat } from '../components/icons/Brand';
import { Icon } from '../components/icons/Icon';
import { Button } from '../components/Button';
import { Segments } from '../components/FeedHeader';
import { GroupBar, GroupsEmpty } from '../components/GroupBar';
import { GroupRanking } from '../components/GroupRanking';
import { useModes, type Mode } from '../data/features';
import { TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { anrede, formatBountyShort, formatRelative } from '../data/format';
import { catVariant, reiseEntries, reiseMood, reiseMoodText, type ReiseEntry } from '../data/reise';
import { useStore } from '../data/store';
import { color, font, isFashionable, radius, size, space, stroke, text } from '../theme/tokens';
import { FashionProfile } from '../components/FashionProfile';
import { t } from '../data/texts';
import { useGoBack } from '../lib/goBack';

/** Was in der Karte „Du bist dran“ als Aufgabe steht. */
function taskLabel({ challenge, role }: ReiseEntry): string {
  if (role === 'author' && challenge.status === 'reported') return 'Erledigung prüfen';
  if (role === 'author' && challenge.status === 'payment_open') return 'Coins bezahlen';
  if (role === 'assignee' && challenge.status === 'paid_marked') return 'Coins bestätigen';
  return 'Erledigt melden';
}

/**
 * Route `reise` (Tab „Was Du so machst“ in der Tab-Leiste, Tipp auf den Kater im Feed oder „Was Du so machst“ im Konto).
 * Upgrade „Nachtschicht“: Kater mit Sprechblase und Aufgaben „Du bist dran“. Darunter der Umschalter „Privat / Gruppe / Kiez“
 * wie im Feed (UX-Audit, Daria, 27.10.2026): Im Kiez stehen Bilanz und Verlauf, in Gruppen die Gruppenauswahl,
 * Dein Platz in der Rangliste und der Verlauf der gewählten Gruppe.
 */
export default function ReiseRoute() {
  // Fashionable Look: Profilansicht wie bei großen Foto-Apps (Daria, 23.10.2026)
  return isFashionable ? <FashionProfile /> : <Reise />;
}

function Reise() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { challenges, currentUserId, profile, groups } = useStore();
  const entries = useMemo(() => reiseEntries(challenges, currentUserId), [challenges, currentUserId]);
  const mood = reiseMood(entries);
  const tasks = entries.filter((e) => e.needsAction);
  const history = entries.filter((e) => !e.needsAction);
  const publicHistory = history.filter((e) => !e.challenge.groupId && !e.challenge.private);
  const privateHistory = history.filter((e) => !!e.challenge.private);
  // Modi wie im Feed: Privat, Gruppe, Kiez, ohne eigene Wahl der Standard (Daria, 27.10.2026)
  const modes = useModes();
  const [chosenTab, setTab] = useState<Mode>();
  const tab: Mode = chosenTab && modes.isVisible(chosenTab) ? chosenTab : modes.standard;
  const reiseTabs = REISE_TABS.filter((r) => modes.isVisible(r.key));
  const [groupChoice, setGroupChoice] = useState<string>();
  const group = groups.find((g) => g.id === groupChoice) ?? groups[0];
  const groupHistory = history.filter((e) => !!group && e.challenge.groupId === group.id);
  const created = entries.filter((e) => e.role === 'author' && !e.challenge.groupId && !e.challenge.private).length;
  const accepted = entries.filter((e) => e.role === 'assignee' && !e.challenge.groupId).length;
  const earned = entries
    .filter((e) => e.role === 'assignee' && e.challenge.status === 'paid')
    .reduce((sum, e) => sum + (e.challenge.bountyAmount ?? 0), 0);

  const toFeed = () => (goBack());

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}>
        <Text style={styles.title} accessibilityRole="header">
          Was Du so machst
        </Text>

        {/* Tipp auf den Kater: zu seiner Seite mit Sprüchen */}
        <Pressable accessibilityRole="button" accessibilityLabel={t('Cat The Käptn Hallo sagen')} onPress={() => router.push('/kater')}>
          <KaterCard mood={catVariant(mood)}>{reiseMoodText(mood, anrede(profile))}</KaterCard>
        </Pressable>

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

        {reiseTabs.length > 1 ? <Segments tabs={reiseTabs} selectedKey={tab} onChange={setTab} /> : null}

        {tab === 'private' ? (
          <History title="Verlauf" entries={privateHistory} onOpen={(entry) => router.push(entry.href)} />
        ) : tab === 'kiez' ? (
          <>
            {created + accepted > 0 ? (
              <View style={styles.stats}>
                <Stat value={String(created)} label="erstellt" />
                <Stat value={String(accepted)} label="angenommen" />
                <Stat value={formatBountyShort(earned)} label="verdient" signal />
              </View>
            ) : null}
            <History title="Verlauf" entries={publicHistory} onOpen={(entry) => router.push(entry.href)} />
          </>
        ) : group ? (
          <>
            <View style={styles.bleed}>
              <GroupBar
                groups={groups}
                selectedId={group.id}
                onSelect={setGroupChoice}
                onOpen={(id) => router.push(`/gruppen/${id}`)}
                onCreate={() => router.push('/gruppen/neu')}
              />
            </View>
            <GroupRanking group={group} />
            <History title="Verlauf" entries={groupHistory} onOpen={(entry) => router.push(entry.href)} />
            {/* Daria, 27.10.2026: „Aufgaben ansehen“ steht unter dem Verlauf, nicht mehr direkt unter der Rangliste */}
            <Button
              label="Aufgaben ansehen"
              variant="secondary"
              onPress={() => router.dismissTo({ pathname: '/feed', params: { gruppe: group.id } })}
            />
          </>
        ) : (
          <View style={styles.bleed}>
            <GroupsEmpty onCreate={() => router.push('/gruppen/neu')} onJoin={() => router.push('/gruppen/beitreten')} />
          </View>
        )}
      </ScrollView>
      <TabBar
        active="reise"
        onFeedPress={toFeed}
        onMenuPress={() => router.push('/account')}
      />
    </View>
  );
}

/** Reihenfolge Privat, Gruppe, Kiez wie im Feed (Daria, 27.10.2026) */
const REISE_TABS: { key: Mode; label: string }[] = [
  { key: 'private', label: 'Privat' },
  { key: 'groups', label: 'Gruppe' },
  { key: 'kiez', label: 'Kiez' },
];

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
              <StatusBadge status={entry.challenge.status} challenge={entry.challenge} />
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
  // GroupBar und GroupsEmpty bringen 16 pt Rand mit; hier steht schon der Rand der Seite
  bleed: { marginHorizontal: -space[16] },
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
