import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { KaterCard, Notice, SectionBlock } from '../../components/Content';
import { KaterMessage } from '../../components/KaterMessage';
import { NavigationBar } from '../../components/NavigationBar';
import { Text } from '../../components/T';
import { eventDate, eventTime, upcomingCalendarEvents, type CalendarEvent } from '../../data/calendar';
import { dayName, goalText, katerFocus, katerLine } from '../../data/katerRoutine';
import { savedEvents, type ShowcaseEvent } from '../../data/showcase';
import { useCalendarEnabled } from '../../data/routine';
import { useStore } from '../../data/store';
import { ShowcaseEventCard } from '../../components/ShowcaseEventCard';
import { archiveReminder, capitalize, goalOf, kindOf, loadReminders, type Reminder } from '../../data/reminders';
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
  // Termine aus verbundenen Kalendern, als Termine angezeigt (Daria, 2026-11-10)
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Gespeicherte Termine aus Schaufenstern (Daria, 2026-11-10); Änderungen und Absagen kommen hier an
  const [saved, setSaved] = useState<(ShowcaseEvent & { showcase: string })[]>([]);
  const { currentUserId } = useStore();
  // Kalender aus (Einstellungen › Kalender, Daria, 2026-11-10): keine Termine aus Deinen Kalendern
  const calendarOn = useCalendarEnabled();

  const reload = useCallback(() => {
    loadReminders().then(setList, () => setList(null));
    if (calendarOn) upcomingCalendarEvents(7).then(setEvents, () => setEvents([]));
    else setEvents([]);
    savedEvents(currentUserId).then(setSaved, () => setSaved([]));
  }, [currentUserId, calendarOn]);
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
      ) : list.length === 0 && events.length === 0 && saved.length === 0 ? (
        <View style={[styles.center, { paddingBottom: insets.bottom + space[24] }]}>
          <KaterMessage
            title="Was willst Du Dir angewöhnen?"
            body="Sag mir, was Du vorhast. Ich erinnere Dich, ganz ohne Druck. Na gut, mit ein bisschen."
            action={<Button label="Neue Erinnerung" icon="plus" onPress={() => router.push('/routine/new')} />}
            more={calendarOn ? <Button label="Kalender verbinden" variant="ghost" onPress={() => router.push('/account/features')} /> : undefined}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[24] }]}>
          {focus ? <KaterCard>{katerLine(focus)}</KaterCard> : null}
          {list.length ? (
            <SectionBlock label="Deine Erinnerungen">
              <View style={styles.list}>
                {list.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onDone={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })} onEnd={() => end(r)} />
                ))}
              </View>
            </SectionBlock>
          ) : null}
          {saved.length ? (
            <SectionBlock label="Gespeicherte Termine">
              <View style={styles.list}>
                {saved.map((e) => (
                  <ShowcaseEventCard key={e.id} event={e} showcase={e.showcase} onChanged={reload} />
                ))}
              </View>
            </SectionBlock>
          ) : null}
          {events.length ? (
            <SectionBlock label="Aus Deinem Kalender">
              <View style={styles.list}>
                {events.slice(0, 20).map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </View>
            </SectionBlock>
          ) : null}
          <View style={styles.buttons}>
            <Button label="Neue Erinnerung" icon="plus" variant="secondary" onPress={() => router.push('/routine/new')} />
            {calendarOn ? <Button label="Kalender" variant="ghost" onPress={() => router.push('/account/features')} /> : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/** Termin aus einem verbundenen Kalender: wie ein Termin aus Routine, nur zum Ansehen */
function EventCard({ event: e }: { event: CalendarEvent }) {
  const when = `${dayName(eventDate(e))} ${e.allDay ? t('ganztägig') : t('um {time}', { time: eventTime(e.start) })}`;
  return (
    <View style={styles.card} accessible accessibilityLabel={`${t('Termin')}: ${e.title}, ${when}`}>
      <View style={styles.flex}>
        <Text style={[styles.kicker, styles.kickerTermin]}>Termin</Text>
        <Text noTranslate style={styles.title}>
          {e.title}
        </Text>
        <Text style={styles.sub}>{e.calendar ? `${when} · ${e.calendar}` : when}</Text>
      </View>
    </View>
  );
}

function ReminderCard({ reminder: r, onDone, onEnd }: { reminder: Reminder; onDone: () => void; onEnd: () => void }) {
  const goal = goalOf(r);
  // „um“: Termin ohne Zähler und Balken; „bis“ und „von … bis“: Aufgabe (Daria, 2026-11-10)
  const kind = kindOf(r);
  const counted = kind !== 'termin';
  return (
    <Pressable onLongPress={onEnd} accessibilityHint={t('Lange drücken zum Beenden')} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          {kind ? <Text style={[styles.kicker, kind === 'termin' ? styles.kickerTermin : styles.kickerAufgabe]}>{kind === 'termin' ? 'Termin' : 'Aufgabe'}</Text> : null}
          <Text noTranslate style={styles.title}>
            {capitalize(r.want)}
          </Text>
          <Text style={styles.sub}>{goalText(r)}</Text>
        </View>
        {counted ? (
          <Text noTranslate style={[styles.count, r.doneThisWeek >= goal && styles.countDone]}>
            {Math.min(r.doneThisWeek, goal)}/{goal}
          </Text>
        ) : null}
      </View>
      {counted ? (
        <View style={styles.bar} accessible accessibilityLabel={t('{done} von {goal} diese Woche', { done: Math.min(r.doneThisWeek, goal), goal })}>
          {Array.from({ length: goal }, (_, i) => (
            <View key={i} style={[styles.segment, i < r.doneThisWeek && styles.segmentDone]} />
          ))}
        </View>
      ) : null}
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
  buttons: { gap: space[8] },
  card: { gap: space[12], padding: space[16], borderRadius: radius.xl, backgroundColor: color.bg.surface },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  flex: { flex: 1, gap: space[4] },
  title: { ...text.cardTitle, color: color.text.primary },
  kicker: { ...text.caption, fontFamily: font.medium },
  kickerTermin: { color: color.accent.primary },
  kickerAufgabe: { color: color.accent.signal },
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
