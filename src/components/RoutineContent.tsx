import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from './Button';
import { Notice } from './Content';
import { KaterMessage } from './KaterMessage';
import { upcomingCalendarEvents, type CalendarEvent } from '../data/calendar';
import { useHiddenEvents } from '../data/hiddenEvents';
import { savedEvents, type ShowcaseEvent } from '../data/showcase';
import { useCalendarEnabled } from '../data/routine';
import { useStore } from '../data/store';
import { RoutineList } from './RoutineList';
import { publishRoutineData } from '../data/routineView';
import { archiveReminder, capitalize, kindOf, loadReminders, undoReminderDone, type Reminder, type ReminderEnd } from '../data/reminders';
import { t } from '../data/texts';
import { color, space } from '../theme/tokens';

/**
 * Inhalt der Routine (Daria, 2026-11-09/10): Deine Erinnerungen mit Fortschritt der Woche, oben der Kater.
 * Steht im Feed als Reiter „Routine“ links neben den anderen und als eigene Seite `routine`.
 * Antworten auf die Fragen: Documentation, kiez-coins/offen/2026-11-07_offen_erinnerungen.md.
 */
/** `topPad`: Abstand oben, im Feed derselbe wie bei den anderen Reitern unter dem Umschalter */
export function RoutineContent({
  topPad = space[16],
  bottomPad,
  floatBottom,
  onScroll,
  calendarInList = true,
  onNewButtonShown,
}: {
  topPad?: number;
  bottomPad: number;
  /** Abstand des schwebenden „Neue Erinnerung“ vom unteren Rand: direkt über der Leiste (Daria, 2026-11-16) */
  floatBottom: number;
  /** Im Feed `false`: Dort liegt der Kalender hinter den Umschaltern (Daria, 2026-11-14) */
  calendarInList?: boolean;
  /** Lage der Liste, z. B. damit der Feed erkennt, ob man ganz oben weiter nach oben zieht */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Ist „Neue Erinnerung“ ganz zu sehen? Dann blendet der Feed den Plus-Knopf in der Leiste aus (Daria, 2026-11-23) */
  onNewButtonShown?: (shown: boolean) => void;
}) {
  const router = useRouter();
  const [list, setList] = useState<Reminder[] | null | undefined>(undefined);
  // Termine aus verbundenen Kalendern, als Termine angezeigt (Daria, 2026-11-10)
  const [allEvents, setEvents] = useState<CalendarEvent[]>([]);
  // Einzeln ausgeblendete Termine fehlen in der Liste und im Kalender oben (Daria, 2026-11-14)
  const hiddenEvents = useHiddenEvents();
  const events = useMemo(() => allEvents.filter((e) => !hiddenEvents.has(e.id)), [allEvents, hiddenEvents]);
  // Gespeicherte Termine aus Schaufenstern (Daria, 2026-11-10); Änderungen und Absagen kommen hier an
  const [saved, setSaved] = useState<(ShowcaseEvent & { showcase: string })[]>([]);
  // Angehobene Karte: Die Seite scrollt nicht, damit Ziehen nach oben „später“ bedeutet (Daria, 2026-11-13)
  const [dragging, setDragging] = useState(false);
  // Nur bei echter Änderung neu rendern; jedes Loslassen ruft die Sperre auf (Daria, 2026-11-13: „flackert“)
  const draggingNow = useRef(false);
  const lockPage = useCallback((on: boolean) => {
    if (draggingNow.current === on) return;
    draggingNow.current = on;
    setDragging(on);
  }, []);
  const { currentUserId } = useStore();
  // Kalender aus (Einstellungen › Kalender, Daria, 2026-11-10): keine Termine aus Deinen Kalendern
  const calendarOn = useCalendarEnabled();

  // Für den Kalender im Feed-Kopf melden, was die Routine zeigt
  useEffect(() => {
    publishRoutineData(list ? { list, events, saved } : null);
  }, [list, events, saved]);

  const reload = useCallback(() => {
    loadReminders().then(setList, () => setList(null));
    // 60 Tage (Daria, 2026-11-14: Termin am 5. Dezember fehlte), so viel liefert die Edge Function höchstens.
    // Der Kalender zeigt alle, die Liste nur die nächsten 7 Tage.
    if (calendarOn) upcomingCalendarEvents(60).then(setEvents, () => setEvents([]));
    else setEvents([]);
    savedEvents(currentUserId).then(setSaved, () => setSaved([]));
  }, [currentUserId, calendarOn]);
  // Neu laden, wenn man vom Anlegen oder Erledigen zurückkommt
  useFocusEffect(reload);


  // Aufgeben oder abbrechen (Daria, 2026-11-13): beides beendet die Erinnerung und zählt, mit Rückfrage
  const end = useCallback((r: Reminder, how: ReminderEnd, confirm = true) => {
    // Beim Ziehen ohne Rückfrage: Die Karte hat schon gezeigt, was passiert (Daria, 2026-11-13)
    if (!confirm) {
      archiveReminder(r.id, how).then(reload);
      return;
    }
    // Termine sagt man ab (Daria, 2026-11-13); der rote Knopf heißt nie nur „Abbrechen“, das klänge nach „Dialog schließen“
    const event = kindOf(r) === 'termin' && how === 'cancelled';
    Alert.alert(
      how === 'given_up' ? t('Aufgeben?') : how === 'deleted' ? t('Löschen?') : event ? t('Termin absagen?') : t('Das hier abbrechen?'),
      how === 'given_up'
        ? t('„Ich will {want}“ verschwindet aus der Liste und zählt als aufgegeben. Was Du geschafft hast, bleibt.', { want: r.want })
        : how === 'deleted'
          ? kindOf(r) === 'termin'
            ? t('„{want}“ verschwindet aus der Liste. Im Kalender bleibt er als erledigt stehen.', { want: capitalize(r.want) })
            : t('„Ich will {want}“ verschwindet aus der Liste. Was Du erledigt hast, bleibt im Kalender.', { want: r.want })
          : event
            ? t('„{want}“ verschwindet aus der Liste und zählt als abgesagt.', { want: capitalize(r.want) })
            : t('„Ich will {want}“ verschwindet aus der Liste und zählt als abgebrochen. Was Du geschafft hast, bleibt.', { want: r.want }),
      [
        { text: t('Zurück'), style: 'cancel' },
        {
          text: how === 'given_up' ? t('Aufgeben') : how === 'deleted' ? t('Löschen') : event ? t('Absagen') : t('Ja, abbrechen'),
          style: 'destructive',
          onPress: () => archiveReminder(r.id, how).then(reload),
        },
      ],
    );
  }, [reload]);
  // Gleichbleibende Funktionen, damit RoutineList (memo) beim Sperren der Seite nicht neu rendert
  const onDone = useCallback((r: Reminder) => router.push({ pathname: '/routine/[id]', params: { id: r.id } }), [router]);
  const onNew = useCallback(() => router.push('/routine/new'), [router]);
  const onEdit = useCallback((r: Reminder) => router.push({ pathname: '/routine/bearbeiten', params: { id: r.id } }), [router]);
  const onCopy = useCallback((r: Reminder) => router.push({ pathname: '/routine/new', params: { von: r.id } }), [router]);
  // Haken zurücknehmen (Daria, 2026-11-18, „Untick“): ohne Rückfrage, neu abhaken geht jederzeit
  // Die Karte springt sofort zurück, das Neuladen holt danach den echten Stand.
  const onUndo = useCallback((r: Reminder) => {
    setList((l) => l?.map((x) => (x.id === r.id ? { ...x, doneToday: false, doneThisWeek: Math.max(0, x.doneThisWeek - 1) } : x)));
    undoReminderDone(r.id).then(reload, reload);
  }, [reload]);

  // „Neue Erinnerung“ (Daria, 2026-11-23): Passt alles auf den Bildschirm, steht der Knopf fest über der Leiste. Sonst
  // steht er nur am Ende der Liste, nie halb hinter der Leiste (das Hervorfahren beim Scrollen wirkte unruhig). Ist er
  // ganz zu sehen, fehlt dafür das Plus in der Leiste; sonst übernimmt das Plus.
  const box = useRef({ view: 0, content: 0, inlineY: 0, inlineH: 0, y: 0 });
  const [fits, setFits] = useState(true);
  const [inlineShown, setInlineShown] = useState(false);
  const measure = () => {
    const b = box.current;
    setFits(b.content <= b.view + 1);
    checkInline();
  };
  // Ganz zu sehen: Unterkante des Knopfs über der Oberkante der Leiste (floatBottom liegt space[8] darüber)
  const checkInline = () => {
    const b = box.current;
    setInlineShown(b.inlineH > 0 && b.inlineY + b.inlineH <= b.y + b.view - (floatBottom - space[8]));
  };
  const scrolled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    box.current.y = e.nativeEvent.contentOffset.y;
    checkInline();
    onScroll?.(e);
  };
  const empty = !!list && list.length === 0 && events.length === 0 && saved.length === 0;
  const newShown = !!list && (empty || fits || inlineShown);
  useEffect(() => {
    onNewButtonShown?.(newShown);
  }, [newShown, onNewButtonShown]);
  useEffect(() => () => onNewButtonShown?.(false), [onNewButtonShown]);
  const newButton = <Button label="Neue Erinnerung" icon="plus" onPress={onNew} />;

  return (
    <View style={styles.screen}>
      {list === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.text.secondary} />
        </View>
      ) : list === null ? (
        <View style={[styles.content, { paddingTop: topPad }]}>
          <Notice variant="warning" message="Erinnerungen laden gerade nicht. Versuche es gleich noch mal." />
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
          onTouchEnd={() => lockPage(false)}
          onTouchCancel={() => lockPage(false)}
          onScroll={scrolled}
          scrollEventThrottle={16}
          onLayout={(e) => {
            box.current.view = e.nativeEvent.layout.height;
            measure();
          }}
          onContentSizeChange={(_, h) => {
            box.current.content = h;
            measure();
          }}
          contentContainerStyle={[styles.content, styles.contentFlat, { paddingTop: topPad, paddingBottom: 0 }]}>
          <RoutineList
            list={list}
            events={events}
            saved={saved}
            onDone={onDone}
            onEnd={end}
            onEdit={onEdit}
            onCopy={onCopy}
            onUndo={onUndo}
            onChanged={reload}
            onDragLock={lockPage}
            showCalendar={calendarInList}
          />
          {/* Passt alles auf den Bildschirm, ist dieser hier unsichtbar (Platz bleibt, damit nichts springt) */}
          <View
            style={fits ? styles.hidden : undefined}
            pointerEvents={fits ? 'none' : 'auto'}
            onLayout={(e) => {
              box.current.inlineY = e.nativeEvent.layout.y;
              box.current.inlineH = e.nativeEvent.layout.height;
              checkInline();
            }}>
            {newButton}
          </View>
          {/* Platz unter „Neue Erinnerung“ als eigenes Element statt Polsterung: Safari ließ die Polsterung unten in
              der scrollbaren Fläche weg, der Button lag hinter der Leiste (Daria, 2026-11-13) */}
          <View style={{ height: Math.max(0, bottomPad - space[32]) }} />
        </ScrollView>
      )}
      {list && !empty && fits ? (
        <View pointerEvents="box-none" style={[styles.float, { bottom: floatBottom }]}>
          {newButton}
        </View>
      ) : null}
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
  hidden: { opacity: 0 },
  float: { position: 'absolute', left: space[20], right: space[20] },
});
