import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { KaterCard, Notice, SectionBlock } from '../../components/Content';
import { KaterMessage } from '../../components/KaterMessage';
import { NavigationBar } from '../../components/NavigationBar';
import { Text } from '../../components/T';
import { goalText, katerFocus, katerLine } from '../../data/katerRoutine';
import { archiveReminder, capitalize, goalOf, loadReminders, type Reminder } from '../../data/reminders';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { color, font, radius, space, text } from '../../theme/tokens';

/**
 * Route `routine` (Daria, 2026-11-09/10): Deine Erinnerungen mit Fortschritt der Woche, oben der Kater.
 * Erreichbar über den Knopf „Routine“ links neben den Reitern im Feed, vorerst nur für Moderatorinnen.
 * Antworten auf die Fragen: Übergabe/2026-11-07_offen_erinnerungen.md.
 */
export default function Routine() {
  const goBack = useGoBack();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Reminder[] | null | undefined>(undefined);

  const reload = useCallback(() => {
    loadReminders().then(setList, () => setList(null));
  }, []);
  // Neu laden, wenn man vom Anlegen oder Erledigen zurückkommt
  useFocusEffect(reload);

  const focus = list?.length ? katerFocus(list) : undefined;

  const end = (r: Reminder) =>
    Alert.alert(t('Erinnerung beenden?'), t('„Ich will {want}“ verschwindet aus der Liste. Was Du geschafft hast, bleibt.', { want: r.want }), [
      { text: t('Abbrechen'), style: 'cancel' },
      { text: t('Beenden'), style: 'destructive', onPress: () => archiveReminder(r.id).then(reload) },
    ]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title="Routine" variant="back" onLeadingPress={goBack} />
      {list === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.text.secondary} />
        </View>
      ) : list === null ? (
        <View style={styles.content}>
          <Notice variant="warning" message="Erinnerungen laden gerade nicht. Fehlt noch die Migration 20261110000100_erinnerungen?" />
        </View>
      ) : list.length === 0 ? (
        <View style={[styles.center, { paddingBottom: insets.bottom + space[24] }]}>
          <KaterMessage
            title="Was willst Du Dir angewöhnen?"
            body="Sag mir, was Du vorhast. Ich erinnere Dich, ganz ohne Druck. Na gut, mit ein bisschen."
            action={<Button label="Neue Erinnerung" icon="plus" onPress={() => router.push('/routine/new')} />}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[24] }]}>
          {focus ? <KaterCard>{katerLine(focus)}</KaterCard> : null}
          <SectionBlock label="Deine Erinnerungen">
            <View style={styles.list}>
              {list.map((r) => (
                <ReminderCard key={r.id} reminder={r} onDone={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })} onEnd={() => end(r)} />
              ))}
            </View>
          </SectionBlock>
          <Button label="Neue Erinnerung" icon="plus" variant="secondary" onPress={() => router.push('/routine/new')} />
        </ScrollView>
      )}
    </View>
  );
}

function ReminderCard({ reminder: r, onDone, onEnd }: { reminder: Reminder; onDone: () => void; onEnd: () => void }) {
  const goal = goalOf(r);
  return (
    <Pressable onLongPress={onEnd} accessibilityHint={t('Lange drücken zum Beenden')} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text noTranslate style={styles.title}>
            {capitalize(r.want)}
          </Text>
          <Text style={styles.sub}>{goalText(r)}</Text>
        </View>
        <Text noTranslate style={[styles.count, r.doneThisWeek >= goal && styles.countDone]}>
          {Math.min(r.doneThisWeek, goal)}/{goal}
        </Text>
      </View>
      <View style={styles.bar} accessible accessibilityLabel={t('{done} von {goal} diese Woche', { done: Math.min(r.doneThisWeek, goal), goal })}>
        {Array.from({ length: goal }, (_, i) => (
          <View key={i} style={[styles.segment, i < r.doneThisWeek && styles.segmentDone]} />
        ))}
      </View>
      <View style={styles.foot}>
        <Pressable onPress={onEnd} hitSlop={8} accessibilityRole="button">
          <Text style={styles.endText}>Beenden</Text>
        </Pressable>
        {r.doneToday ? (
          <Text style={styles.doneToday}>Heute erledigt</Text>
        ) : (
          <Button label="Erledigt" variant="secondary" onPress={onDone} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  center: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: space[20], paddingTop: space[16], gap: space[24] },
  list: { gap: space[12] },
  card: { gap: space[12], padding: space[16], borderRadius: radius.xl, backgroundColor: color.bg.surface },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  flex: { flex: 1, gap: space[4] },
  title: { ...text.cardTitle, color: color.text.primary },
  sub: { ...text.caption, color: color.text.secondary },
  count: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 20, color: color.text.secondary },
  countDone: { color: color.accent.confirmation },
  bar: { flexDirection: 'row', gap: space[6] },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.bg.screen },
  segmentDone: { backgroundColor: color.accent.confirmation },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12] },
  endText: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
  doneToday: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: color.accent.confirmation },
});
