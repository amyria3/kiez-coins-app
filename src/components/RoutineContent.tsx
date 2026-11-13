import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from './Button';
import { Notice } from './Content';
import { KaterMessage } from './KaterMessage';
import { upcomingCalendarEvents, type CalendarEvent } from '../data/calendar';
import { savedEvents, type ShowcaseEvent } from '../data/showcase';
import { useCalendarEnabled } from '../data/routine';
import { useStore } from '../data/store';
import { RoutineList } from './RoutineList';
import { archiveReminder, capitalize, kindOf, loadReminders, type Reminder, type ReminderEnd } from '../data/reminders';
import { t } from '../data/texts';
import { color, space } from '../theme/tokens';

/**
 * Inhalt der Routine (Daria, 2026-11-09/10): Deine Erinnerungen mit Fortschritt der Woche, oben der Kater.
 * Steht im Feed als Reiter „Routine“ links neben den anderen und als eigene Seite `routine`.
 * Antworten auf die Fragen: Übergabe/2026-11-07_offen_erinnerungen.md.
 */
/** `topPad`: Abstand oben, im Feed derselbe wie bei den anderen Reitern unter dem Umschalter */
export function RoutineContent({
  topPad = space[16],
  bottomPad,
  onScroll,
}: {
  topPad?: number;
  bottomPad: number;
  /** Lage der Liste, z. B. damit der Feed erkennt, ob man ganz oben weiter nach oben zieht */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const router = useRouter();
  const [list, setList] = useState<Reminder[] | null | undefined>(undefined);
  // Termine aus verbundenen Kalendern, als Termine angezeigt (Daria, 2026-11-10)
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Gespeicherte Termine aus Schaufenstern (Daria, 2026-11-10); Änderungen und Absagen kommen hier an
  const [saved, setSaved] = useState<(ShowcaseEvent & { showcase: string })[]>([]);
  // Angehobene Karte: Die Seite scrollt nicht, damit Ziehen nach oben „später“ bedeutet (Daria, 2026-11-13)
  const [dragging, setDragging] = useState(false);
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


  // Aufgeben oder abbrechen (Daria, 2026-11-13): beides beendet die Erinnerung und zählt, mit Rückfrage
  const end = (r: Reminder, how: ReminderEnd, confirm = true) => {
    // Beim Ziehen ohne Rückfrage: Die Karte hat schon gezeigt, was passiert (Daria, 2026-11-13)
    if (!confirm) {
      archiveReminder(r.id, how).then(reload);
      return;
    }
    // Termine sagt man ab (Daria, 2026-11-13); der rote Knopf heißt nie nur „Abbrechen“, das klänge nach „Dialog schließen“
    const termin = kindOf(r) === 'termin' && how === 'cancelled';
    Alert.alert(
      how === 'given_up' ? t('Aufgeben?') : how === 'deleted' ? t('Löschen?') : termin ? t('Termin absagen?') : t('Das hier abbrechen?'),
      how === 'given_up'
        ? t('„Ich will {want}“ verschwindet aus der Liste und zählt als aufgegeben. Was Du geschafft hast, bleibt.', { want: r.want })
        : how === 'deleted'
          ? kindOf(r) === 'termin'
            ? t('„{want}“ verschwindet aus der Liste. Im Kalender bleibt er als erledigt stehen.', { want: capitalize(r.want) })
            : t('„Ich will {want}“ verschwindet aus der Liste. Was Du erledigt hast, bleibt im Kalender.', { want: r.want })
          : termin
            ? t('„{want}“ verschwindet aus der Liste und zählt als abgesagt.', { want: capitalize(r.want) })
            : t('„Ich will {want}“ verschwindet aus der Liste und zählt als abgebrochen. Was Du geschafft hast, bleibt.', { want: r.want }),
      [
        { text: t('Zurück'), style: 'cancel' },
        {
          text: how === 'given_up' ? t('Aufgeben') : how === 'deleted' ? t('Löschen') : termin ? t('Absagen') : t('Ja, abbrechen'),
          style: 'destructive',
          onPress: () => archiveReminder(r.id, how).then(reload),
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      {list === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.text.secondary} />
        </View>
      ) : list === null ? (
        <View style={[styles.content, { paddingTop: topPad }]}>
          <Notice variant="warning" message="Erinnerungen laden gerade nicht. Fehlt noch die Migration 20261110000100_erinnerungen?" />
        </View>
      ) : list.length === 0 && events.length === 0 && saved.length === 0 ? (
        // Scrollbar, damit „Neue Erinnerung“ auf kleinen Bildschirmen nicht hinter der Leiste liegt (Daria, 2026-11-13)
        <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={[styles.centerScroll, { paddingTop: topPad, paddingBottom: bottomPad }]}>
          <KaterMessage
            title="Was willst Du Dir angewöhnen?"
            body="Sag mir, was Du vorhast. Ich erinnere Dich, ganz ohne Druck. Na gut, mit ein bisschen."
            action={<Button label="Neue Erinnerung" icon="plus" onPress={() => router.push('/routine/new')} />}
            more={calendarOn ? <Button label="Kalender verbinden" variant="ghost" onPress={() => router.push({ pathname: '/account/features', params: { abschnitt: 'kalender' } })} /> : undefined}
          />
        </ScrollView>
      ) : (
        <ScrollView
          scrollEnabled={!dragging}
          // Sicherung: Mit dem Finger endet die Sperre immer, damit die Seite nie stehen bleibt (Daria, 2026-11-13)
          onTouchEnd={() => setDragging(false)}
          onTouchCancel={() => setDragging(false)}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, styles.contentFlat, { paddingTop: topPad, paddingBottom: 0 }]}>
          <RoutineList
            list={list}
            events={events}
            saved={saved}
            onDone={(r) => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}
            onEnd={end}
            onNew={() => router.push('/routine/new')}
            onEdit={(r) => router.push({ pathname: '/routine/bearbeiten', params: { id: r.id } })}
            onCopy={(r) => router.push({ pathname: '/routine/new', params: { von: r.id } })}
            onChanged={reload}
            onDragLock={setDragging}
          />
          {/* Platz unter „Neue Erinnerung“ als eigenes Element statt Polsterung: Safari ließ die Polsterung unten in
              der scrollbaren Fläche weg, der Button lag hinter der Leiste (Daria, 2026-11-13) */}
          <View style={{ height: Math.max(0, bottomPad - space[32]) }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  center: { flex: 1, justifyContent: 'center' },
  centerScroll: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingHorizontal: space[20], paddingTop: space[16], gap: space[24] },
  /** Mehr Luft zwischen Kalender und Gruppen */
  contentFlat: { gap: space[32] },
});
