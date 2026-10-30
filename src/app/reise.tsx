import { isInKiez, useHere } from '../data/nearby';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/T';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KaterCard } from '../components/Content';
import { Cat } from '../components/icons/Brand';
import { Icon } from '../components/icons/Icon';
import { Button } from '../components/Button';
import { Segments } from '../components/FeedHeader';
import { AudienceHint, useAudienceHint } from '../components/AudienceHint';
import { GroupBar, GroupsEmpty } from '../components/GroupBar';
import { GroupRanking } from '../components/GroupRanking';
import { useModes, type Mode } from '../data/features';
import { TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { anrede, formatBountyShort, formatHoursMinutes } from '../data/format';
import { donePhoto, erfolge, groupProgress, quests } from '../data/erfolge';
import { Quests } from '../components/Quests';
import { useFriends } from '../data/friends';
import { loadPraise } from '../data/remote';
import { Avatar } from '../components/AuthorRow';
import { useAppDimensions } from '../theme/layout';
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
  const { challenges, currentUserId, profile, groups, mode } = useStore();
  const entries = useMemo(() => reiseEntries(challenges, currentUserId), [challenges, currentUserId]);
  const mood = reiseMood(entries);
  const tasks = entries.filter((e) => e.needsAction);
  // Kiez nur bis 5 km, Überall alles Öffentliche (Daria, 29.10.2026)
  const here = useHere();
  // Modi wie im Feed: Privat, Gruppe, Kiez, Überall, ohne eigene Wahl der Standard (Daria, 27.10.2026)
  const modes = useModes();
  const [chosenTab, setTab] = useState<Mode>();
  const tab: Mode = chosenTab && modes.isVisible(chosenTab) ? chosenTab : modes.standard;
  const reiseTabs = REISE_TABS.filter((r) => modes.isVisible(r.key));
  // Derselbe Hinweis wie im Feed unter dem Umschalter (Daria, 29.10.2026)
  const [audienceHint, closeAudienceHint] = useAudienceHint(tab);
  const [groupChoice, setGroupChoice] = useState<string>();
  const group = groups.find((g) => g.id === groupChoice) ?? groups[0];
  const privateEntries = entries.filter((e) => !!e.challenge.private);
  const publicEntries = entries.filter(
    (e) =>
      !e.challenge.groupId &&
      !e.challenge.private &&
      (tab !== 'kiez' || isInKiez(e.challenge, here, profile.kiez, currentUserId)),
  );
  const friends = useFriends();
  // Gruppen-Ziele nur, wenn Gruppen nicht ausgeschaltet sind (Daria, 29.10.2026)
  const groupsOn = modes.isVisible('groups');
  const goals = useMemo(
    () => quests(entries, friends?.friends.length ?? 0, groupsOn ? groupProgress(groups, currentUserId) : undefined),
    [entries, friends, groupsOn, groups, currentUserId],
  );
  const groupEntries = entries.filter((e) => !!group && e.challenge.groupId === group.id);
  // Lob für Dich (Migration für Lob nötig, sonst keine Zahl)
  const [praise, setPraise] = useState<number | null>(null);
  useEffect(() => {
    if (mode !== 'live' || !currentUserId) return;
    let active = true;
    loadPraise(currentUserId, currentUserId).then((p) => active && setPraise(p?.count ?? null)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [mode, currentUserId]);

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

        {tasks.length ? (
        <View style={styles.tasks}>
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
        </View>
        ) : null}

        {/* Ziele mit Geschenk, für das ganze Konto (Daria, 29.10.2026) */}
        <Quests quests={goals} />

        {reiseTabs.length > 1 ? <Segments tabs={reiseTabs} selectedKey={tab} onChange={setTab} /> : null}
        {audienceHint ? (
          <View style={styles.bleed}>
            <AudienceHint audience={tab} onClose={closeAudienceHint} />
          </View>
        ) : null}

        {/* Kein Verlauf mehr: Hier steht nur, was geschafft ist (Daria, 29.10.2026) */}
        {tab === 'private' ? (
          <Geschafft entries={privateEntries} me={currentUserId} praise={null} onOpen={(entry) => router.push(entry.href)} />
        ) : tab === 'kiez' || tab === 'everywhere' ? (
          <Geschafft entries={publicEntries} me={currentUserId} praise={praise} onOpen={(entry) => router.push(entry.href)} />
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
            <Geschafft entries={groupEntries} me={currentUserId} praise={null} onOpen={(entry) => router.push(entry.href)} />
            <Button
              label="Feed ansehen"
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
  { key: 'everywhere', label: 'Überall' },
];

/**
 * Geschafft (Daria, 29.10.2026): Zahlen, die nur wachsen (erst ab 1), Meilensteine (nur erreichte), Danke von anderen
 * und eine Wand mit Fotos von allem, was erledigt ist.
 */
function Geschafft({
  entries,
  me,
  praise,
  onOpen,
}: {
  entries: ReiseEntry[];
  me: string;
  praise: number | null;
  onOpen: (entry: ReiseEntry) => void;
}) {
  const { users } = useStore();
  const { width } = useAppDimensions();
  const e = useMemo(() => erfolge(entries, me), [entries, me]);
  const stats: { value: string; label: string; signal?: boolean }[] = [];
  if (e.helped) stats.push({ value: String(e.helped), label: t('Mal geholfen') });
  if (e.meDone) stats.push({ value: String(e.meDone), label: t('Me-Challenges') });
  if (e.meTime >= 60000) stats.push({ value: formatHoursMinutes(e.meTime), label: t('für Dich') });
  if (e.gotHelp) stats.push({ value: String(e.gotHelp), label: t('Hilfe bekommen') });
  if (e.hearts) stats.push({ value: String(e.hearts), label: t('Herzen') });
  if (praise) stats.push({ value: String(praise), label: t('Lob') });
  if (e.edensteine) stats.push({ value: String(e.edensteine), label: t('Edensteine') });
  if (e.coins) stats.push({ value: formatBountyShort(e.coins), label: t('verdient'), signal: true });
  // Drei Fotos pro Reihe, Seitenrand 20, Abstand 4
  const tile = Math.floor((Math.min(width, 640) - 2 * space[20] - 2 * space[4]) / 3);

  if (e.done.length === 0 && stats.length === 0) {
    return <Text style={styles.empty}>{t('Hier sammelt sich, was Du schaffst. Das erste Foto landet hier, sobald etwas erledigt ist.')}</Text>;
  }
  return (
    <>
      {stats.length ? (
        <View style={styles.stats}>
          {stats.slice(0, 6).map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} signal={s.signal} />
          ))}
        </View>
      ) : null}
      {e.thanks.length ? (
        <View style={styles.historyBlock}>
          <Text style={styles.sectionLabel}>{t('Danke von anderen')}</Text>
          <View style={styles.list}>
            {e.thanks.slice(0, 3).map(({ comment, challenge }, i) => {
              const author = users.find((u) => u.id === comment.authorId);
              return (
                <View key={comment.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                  {author ? <Avatar user={author} diameter={32} /> : null}
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {comment.body}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {[author?.name, challenge.title].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      {e.done.length ? (
        <View style={styles.historyBlock}>
          <Text style={styles.sectionLabel}>{t('Geschafft')}</Text>
          <View style={styles.wall}>
            {e.done.map((entry) => {
              const photo = donePhoto(entry.challenge);
              return (
                <Pressable
                  key={entry.challenge.id}
                  accessibilityRole="button"
                  accessibilityLabel={entry.label}
                  onPress={() => onOpen(entry)}
                  style={({ pressed }) => [{ width: tile, height: tile }, styles.tile, pressed && styles.pressed]}
                >
                  {photo ? (
                    <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.thumbFallback]}>
                      <Cat height={tile * 0.5} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
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
  // Mehr Luft zwischen den Abschnitten (Daria, 29.10.2026)
  content: { paddingTop: space[24], paddingHorizontal: space[20], gap: space[24] },
  tasks: { gap: space[8] },
  flex: { flex: 1, gap: space[2] },
  badgeLine: { flexDirection: 'row', marginTop: space[4] },
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
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  stat: { flexGrow: 1, flexBasis: '30%', gap: space[4], padding: space[12], borderRadius: radius.lg, backgroundColor: color.bg.surface },
  statValue: { ...text.metric, fontSize: 24, lineHeight: 28, color: color.text.primary },
  statLabel: { ...text.caption, color: color.text.secondary },
  signal: { color: color.accent.signal },
  historyBlock: { gap: space[8] },
  sectionLabel: { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary },
  list: { borderRadius: radius.xl + 2, backgroundColor: color.bg.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12], paddingHorizontal: space[12] },
  rowDivider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  rowTitle: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: color.text.primary },
  empty: { ...text.body, color: color.text.secondary },
  wall: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.bg.surface },
  thumbFallback: { backgroundColor: color.bg.screen, alignItems: 'center', justifyContent: 'center' },
});
