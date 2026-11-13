import { isInKiez, useHere } from '../data/nearby';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/T';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KaterCard, SectionBlock, SectionLabel } from '../components/Content';
import { Cat, CrownIcon } from '../components/icons/Brand';
import { Icon } from '../components/icons/Icon';
import { Button } from '../components/Button';
import { Segments } from '../components/FeedHeader';
import { GroupBar, GroupsEmpty } from '../components/GroupBar';
import { GroupRanking } from '../components/GroupRanking';
import { useModes, type Mode } from '../data/features';
import { TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { anrede } from '../data/format';
import { groupProgress, quests } from '../data/erfolge';
import { Geschafft, usePraise } from '../components/Geschafft';
import { Quests } from '../components/Quests';
import { BadgeOverview } from '../components/BadgeOverview';
import { useFriends } from '../data/friends';
import { catVariant, reiseEntries, reiseMood, reiseMoodText, type ReiseEntry } from '../data/reise';
import { useStore } from '../data/store';
import { color, radius, size, space, text } from '../theme/tokens';
import { SchiffWellen } from '../components/SchiffWellen';
import { getLanguage, t } from '../data/texts';
import { useGoBack } from '../lib/goBack';
import { FinanceOverview } from '../components/FinanceOverview';

/** Was in der Karte „Du bist dran“ als Aufgabe steht. */
function taskLabel({ challenge, role }: ReiseEntry): string {
  if (role === 'author' && challenge.status === 'reported') return 'Erledigung prüfen';
  if (role === 'author' && challenge.status === 'payment_open') return 'Coins bezahlen';
  if (role === 'assignee' && challenge.status === 'paid_marked') return 'Coins bestätigen';
  return 'Erledigt melden';
}

/**
 * Route `me` (Tab „Was Du so machst“ in der Tab-Leiste, Tipp auf den Kater im Feed oder „Was Du so machst“ im Konto).
 * Upgrade „Nachtschicht“: Kater mit Sprechblase und Aufgaben „Du bist dran“. Darunter der Umschalter „Privat / Gruppe / Kiez“
 * wie im Feed (UX-Audit, Daria, 27.10.2026): Im Kiez stehen Bilanz und Verlauf, in Gruppen die Gruppenauswahl,
 * Dein Platz in der Rangliste und der Verlauf der gewählten Gruppe.
 */
export default function ReiseRoute() {
  return <Reise />;
}

function Reise() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { challenges, currentUserId, profile, groups } = useStore();
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
  // Kein Hinweis unter dem Umschalter (Daria, 2026-11-01; vorher wie im Feed)
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
  const praise = usePraise();

  const toFeed = () => (goBack());

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}>
        {/* Krone als Zeichen für „Was Du so machst“ links vor dem Titel; für das Schiffchen reicht der Platz nicht (Daria, 02.11.2026).
            Krone in der Farbe des Titels (Daria, 11.11.2026) */}
        <View style={styles.titleRow}>
          {<CrownIcon height={30} fill={color.text.primary} />}
          <Text style={[styles.title, styles.flex1]} accessibilityRole="header">
            Was Du so machst
          </Text>
        </View>

        {/* Tipp auf den Kater: zu seiner Seite mit Sprüchen */}
        <Pressable accessibilityRole="button" accessibilityLabel={t('Cat The Käptn Hallo sagen')} onPress={() => router.push('/cat')}>
          <KaterCard mood={catVariant(mood)}>{reiseMoodText(mood, anrede(profile))}</KaterCard>
        </Pressable>

        {/* Überschriften für die Abschnitte (Daria, 2026-11-10) */}
        {tasks.length ? (
        <SectionBlock label="Du bist dran">
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
        </SectionBlock>
        ) : null}

        {/* Ziele mit Geschenk, für das ganze Konto (Daria, 29.10.2026) */}
        <Quests quests={goals} label="Deine Ziele" />

        {/* Icons zwischen den Wörtern: Herz Diese Community Daumen braucht Schiffchen Dich Krone (Daria, 02.11.2026).
            In anderen Sprachen stehen die Icons vor dem übersetzten Satz, da die Wortfolge dort eine andere ist. */}
        {getLanguage() === 'de' ? (
          <View style={styles.community} accessible accessibilityLabel="Diese Community braucht Dich">
            {/* Jedes Wort und Icon einzeln: Die Zeile bricht erst um, wenn wirklich kein Platz mehr ist (Daria, 08.11.2026) */}
            <Icon name="heart" size={18} color={COMMUNITY} />
            <Text noTranslate style={styles.communityText}>Diese</Text>
            <Text noTranslate style={styles.communityText}>Community</Text>
            <Icon name="thumbs-up" size={18} color={COMMUNITY} />
            <Text noTranslate style={styles.communityText}>braucht</Text>
            <SchiffWellen farbe={COMMUNITY} />
            <Text noTranslate style={styles.communityText}>Dich</Text>
            <CrownIcon height={21} />
          </View>
        ) : (
          <View style={styles.community}>
            <View style={styles.communityIcons}>
              <Icon name="heart" size={18} color={COMMUNITY} />
              <Icon name="thumbs-up" size={18} color={COMMUNITY} />
              <SchiffWellen farbe={COMMUNITY} />
              <CrownIcon height={21} />
            </View>
            <Text style={styles.communityText}>Diese Community braucht Dich</Text>
          </View>
        )}

        {/* Erhaltene und offene Abzeichen (Daria, 2026-11-01) */}
        <BadgeOverview />

        <View style={styles.reiseHead}>
          {/* Nicht „Geschafft“: So heißt schon die Fotoreihe darunter */}
          <SectionLabel>Deine Bilanz</SectionLabel>
          {reiseTabs.length > 1 ? <Segments tabs={reiseTabs} selectedKey={tab} onChange={setTab} /> : null}
        </View>

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
                onOpen={(id) => router.push(`/groups/${id}`)}
                onCreate={() => router.push('/groups/new')}
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
            <GroupsEmpty onCreate={() => router.push('/groups/new')} onJoin={() => router.push('/groups/join')} />
          </View>
        )}

        {/* Finanzierung ganz unten: Text, Balken, Punkte, Link für Details (Daria, 08.11.2026), ohne Karte unter eigener Überschrift (2026-11-10) */}
        <SectionBlock label="Modell KiezCoins">
          <FinanceOverview />
        </SectionBlock>
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

/** „Diese Community braucht Dich“ in einer Farbe, Text wie Icons (Daria, 08.11.2026) */
const COMMUNITY = color.icon.large;

const styles = StyleSheet.create({
  // GroupBar und GroupsEmpty bringen 16 pt Rand mit; hier steht schon der Rand der Seite
  bleed: { marginHorizontal: -space[16] },
  screen: { flex: 1, backgroundColor: color.bg.screen },
  // Mehr Luft zwischen den Abschnitten (Daria, 29.10.2026)
  content: { paddingTop: space[24], paddingHorizontal: space[20], gap: space[24] },
  tasks: { gap: space[8] },
  reiseHead: { gap: space[8] },
  flex: { flex: 1, gap: space[2] },
  pressed: { opacity: 0.8 },
  title: { ...text.display, color: color.text.primary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  community: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 3, rowGap: space[8] },
  communityIcons: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  communityText: { ...text.label, color: COMMUNITY },
  flex1: { flex: 1 },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    borderRadius: radius.xl + 4,
    // Ohne orangen Rahmen (Daria, 2026-11-13)
    backgroundColor: color.bg.surface,
  },
  // „Du bist dran“ in Gelb (color.accent.turn, Daria, 2026-11-13)
  taskKicker: { ...text.captionStrong, color: color.accent.turn },
  taskTitle: { ...text.cardTitleCompact, color: color.text.primary },
  sub: { ...text.small, color: color.text.secondary },
  thumbFallback: { backgroundColor: color.bg.screen, alignItems: 'center', justifyContent: 'center' },
});
