import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Alert, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCardSwipe } from '../lib/cardSwipe';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { Button } from './Button';
import { KaterCard, KaterRund } from './Content';
import { handShapePath } from './handShape';
import { ReminderExtrasRow } from './ReminderExtras';
import { ManageButton } from './ShowcaseManage';
import { Text } from './T';
import { addToMyCalendar, eventDate, eventTime, type CalendarEvent } from '../data/calendar';
import { dayName, goalText, katerFocus, katerLine, katerMood, weekdayShort, whenText, type KaterMood } from '../data/katerRoutine';
import { addDays, capitalize, dueAt, goalOf, isoWeekday, kindOf, loadRoutineDays, localDate, weekStart, type Reminder, type ReminderEnd, type RoutineDays } from '../data/reminders';
import { asSingleEvent, eventWhen, saveEvent, type ShowcaseEvent } from '../data/showcase';
import { localeTag, t, useTexts } from '../data/texts';
import { color, font, radius, space, text } from '../theme/tokens';

/**
 * Routine im Kiez-Look (Daria, 2026-11-12), nach der Vorlage „ListEasy“: oben der Kalender, darunter drei Gruppen
 * mit farbigen Karten, jede Gruppe waagerecht scrollbar, die Seite senkrecht.
 * Lila und Gelbgrün bleiben der Bedienung vorbehalten, die Karten haben eigene Farben.
 * Der Kater rechts oben zeigt den Stand; später als kurzes Video (wartet, freut sich, sauer …).
 * Entwürfe: Projektordner routine-karte/2026-11-12_*.png
 */

/** Kartenfarben (Daria, 2026-11-12): Senf, Olive hell, Puder, als Rollen in tokens.ts (color.routine) */
const SENF = color.routine.task;
const OLIVE = color.routine.fixed;
const PUDER = color.routine.saved;
/** Schrift und Buttons auf den Karten */
const INK = color.routine.ink;
const INK_SOFT = color.routine.inkSoft;
const INK_TRACK = color.routine.inkTrack;
/** Kalender: Tage ohne Eintrag und die Schraffur für ausgefallene */
const DAY = color.routine.day;
const HATCH = color.routine.hatch;
const CARD_MIN = 260;
const CARD_MAX = 480;
const GUTTER = space[20];

type Saved = ShowcaseEvent & { showcase: string };

export function RoutineList({
  list,
  events,
  saved,
  onDone,
  onEnd,
  onNew,
  onEdit,
  onCopy,
  onChanged,
  onDragLock,
}: {
  list: Reminder[];
  events: CalendarEvent[];
  saved: Saved[];
  onDone: (r: Reminder) => void;
  /** Aufgeben oder abbrechen, mit Rückfrage (Daria, 2026-11-13) */
  onEnd: (r: Reminder, how: ReminderEnd) => void;
  onNew: () => void;
  /** Bearbeiten über „•••“ oder Tippen auf Titel oder Zeit (Daria, 2026-11-13) */
  onEdit: (r: Reminder) => void;
  /** Kopie über „Neue Erinnerung“, vorausgefüllt (Daria, 2026-11-13) */
  onCopy: (r: Reminder) => void;
  onChanged: () => void;
  /** Karte angehoben: Seite nicht scrollen (Daria, 2026-11-13) */
  onDragLock?: (on: boolean) => void;
}) {
  const focus = list.length ? katerFocus(list) : undefined;
  const now = useNow();
  const { later, snooze } = useLater();
  // Sortiert nach Dringlichkeit (Daria, 2026-11-13): fällige nach Uhrzeit, dann ohne Uhrzeit, dann „später“, Erledigte zuletzt
  const sorted = sortByUrgency(list, now, later);
  const urgentOf = (r: Reminder) => isUrgent(r, now, later);
  // Aufgaben: wiederkehrende und einmalige „bis“; Termine: einmalige „um“ (Daria, 2026-11-10)
  const tasks = sorted.filter((r) => kindOf(r) !== 'termin');
  const termine = sorted.filter((r) => kindOf(r) === 'termin');
  const fixed = termine.filter((r) => r.required !== false);
  const optional = termine.filter((r) => r.required === false);
  const calendar = events.slice(0, 20);

  return (
    <PageLock.Provider value={onDragLock ?? noLock}>
      {/* Kater spricht wie im Feed als Sprechblase (Daria, 2026-11-11) */}
      {focus ? <KaterCard>{katerLine(focus)}</KaterCard> : null}
      <RoutineCalendar list={list} events={events} saved={saved} />
      {tasks.length ? (
        <Group title="Aufgaben" count={tasks.length}>
          {tasks.map((r) => (
            <TaskCard key={r.id} reminder={r} onDone={() => onDone(r)} onGiveUp={() => onEnd(r, 'given_up')} onCancel={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} />
          ))}
        </Group>
      ) : null}
      {fixed.length || calendar.length ? (
        <Group title="Feste Termine" count={fixed.length + calendar.length}>
          {fixed.map((r) => (
            <TerminCard key={r.id} reminder={r} bg={OLIVE} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} />
          ))}
          {calendar.map((e) => (
            <CalendarCard key={e.id} event={e} />
          ))}
        </Group>
      ) : null}
      {optional.length || saved.length ? (
        <Group title="Das hast Du Dir vorgemerkt" count={optional.length + saved.length}>
          {optional.map((r) => (
            <TerminCard key={r.id} reminder={r} bg={PUDER} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} />
          ))}
          {saved.map((e) => (
            <SavedCard key={e.id} event={e} onChanged={onChanged} />
          ))}
        </Group>
      ) : null}
      <View style={styles.create}>
        <Button label="Neue Erinnerung" icon="plus" onPress={onNew} />
      </View>
    </PageLock.Provider>
  );
}

const noLock = () => {};

/** Uhrzeit für Dringlichkeit und Sortierung; jede Minute neu */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * „Später“ (Daria, 2026-11-13): Karte nach oben ziehen schiebt sie für eine Stunde ans Ende ihrer Gruppe, und sie
 * wackelt so lange nicht. Gilt nur auf diesem Gerät.
 */
const LATER_KEY = 'routine-spaeter';
const LATER_MS = 60 * 60 * 1000;
function useLater() {
  const [later, setLater] = useState<Record<string, number>>({});
  useEffect(() => {
    AsyncStorage.getItem(LATER_KEY).then(
      (v) => v && setLater(JSON.parse(v) as Record<string, number>),
      () => {},
    );
  }, []);
  const snooze = (id: string) =>
    setLater((all) => {
      const next = Object.fromEntries(Object.entries(all).filter(([, until]) => until > Date.now()));
      next[id] = Date.now() + LATER_MS;
      AsyncStorage.setItem(LATER_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  return { later, snooze };
}

const restingOf = (r: Reminder) => r.doneToday || (!r.onDate && r.doneThisWeek >= goalOf(r));
const isLater = (r: Reminder, now: Date, later: Record<string, number>) => (later[r.id] ?? 0) > now.getTime();

/** Dringend (Daria, 2026-11-13): offen, nicht „später“ und in höchstens einer Stunde fällig oder schon vorbei */
function isUrgent(r: Reminder, now: Date, later: Record<string, number>): boolean {
  if (restingOf(r) || isLater(r, now, later)) return false;
  const due = dueAt(r, now);
  return !!due && due.getTime() - now.getTime() <= 60 * 60 * 1000;
}

function sortByUrgency(list: Reminder[], now: Date, later: Record<string, number>): Reminder[] {
  const rank = (r: Reminder) => (restingOf(r) ? 3 : isLater(r, now, later) ? 2 : dueAt(r, now) ? 0 : 1);
  const time = (r: Reminder) => dueAt(r, now)?.getTime() ?? 0;
  return [...list].sort((a, b) => rank(a) - rank(b) || time(a) - time(b));
}

/**
 * Karten anheben und ziehen (Daria, 2026-11-13): Kurz halten hebt die Karte an wie einen Zettel. Dann nach rechts
 * ziehen erledigt, nach links abbrechen, nach oben später. Normales Wischen blättert weiter durch die Karten.
 * Vorher ging Wischen nur bei der einzigen Karte einer Gruppe, und langes Drücken brach ab.
 */
const DRAG_AT = 88;
const LIFT_MS = 350;
/** Solange eine Karte angehoben ist, scrollen weder die Reihe noch die Seite */
const DragLock = createContext<(on: boolean) => void>(() => {});
const PageLock = createContext<(on: boolean) => void>(() => {});

/** Leichte, unregelmäßige Schräge je Karte (Daria, 2026-11-13); fest an der id, damit nichts springt */
const TILTS = [-1.4, 0.9, -0.5, 1.6, -1.1, 0.4, 1.2, -0.8];
function tiltOf(key: string): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TILTS[Math.abs(h) % TILTS.length];
}

/** Wer in den Systemeinstellungen weniger Bewegung wählt, bekommt kein Wackeln */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/** Überschrift mit Anzahl, darunter die Karten nebeneinander zum Wischen */
function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const { width: screen } = useWindowDimensions();
  const page = useContext(PageLock);
  const [locked, setLocked] = useState(false);
  const lock = useCallback(
    (on: boolean) => {
      setLocked(on);
      page(on);
    },
    [page],
  );
  // Breite der Spalte; im Browser ist die App schmaler als das Fenster
  const [width, setWidth] = useState(screen - GUTTER * 2);
  // Länglich, so breit es geht (Daria, 2026-11-12); die nächste Karte schaut rechts ein Stück herein
  const cards = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  // Nur eine Karte: über die ganze Breite (Daria, 2026-11-12)
  const cardWidth = cards.length === 1 ? width : Math.max(CARD_MIN, Math.min(CARD_MAX, width - 36));
  return (
    <View style={styles.group} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.groupHead}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {title}
        </Text>
        <Text noTranslate style={styles.groupCount}>
          {count}
        </Text>
      </View>
      {/* Seitliches Wischen hier bewegt nur die Karten, nicht die Reiter im Feed (Daria, 2026-11-12) */}
      <View onStartShouldSetResponderCapture={markCardSwipe} onTouchEnd={() => locked && lock(false)} onTouchCancel={() => locked && lock(false)}>
        <DragLock.Provider value={lock}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={cards.length > 1 && !locked}
            snapToInterval={cardWidth + space[12]}
            decelerationRate="fast"
            style={styles.rowScroll}
            contentContainerStyle={styles.row}
          >
            {cards.map((c, i) => (
              <View key={i} style={{ width: cardWidth }}>
                {c}
              </View>
            ))}
          </ScrollView>
        </DragLock.Provider>
      </View>
    </View>
  );
}

/** Stand des Katers auf der Karte, bis die Videos da sind als Wort am Avatar */
type Mood = KaterMood;
const moodOf = (r: Reminder) => katerMood(r);

/**
 * Ab dieser Kartenbreite steht der Kater neben Titel und Wochentagen (Daria, 2026-11-12).
 * Seit 2026-11-13 immer daneben, damit die Karten deutlich flacher sind (Daria).
 */
const SIDE_BY_SIDE = 0;

type DragActions = { right?: () => void; left?: () => void; up?: () => void };

/** Anheben nach kurzem Halten, dann folgt die Karte dem Finger; ab `DRAG_AT` löst das Loslassen aus */
function useLiftDrag(actions: DragActions) {
  const lock = useContext(DragLock);
  const native = Platform.OS !== 'web';
  const pos = useRef(new Animated.ValueXY()).current;
  const lift = useRef(new Animated.Value(0)).current;
  const [lifted, setLifted] = useState(false);
  const state = useRef({ lifted: false, dragging: false, skipPress: false, timer: null as ReturnType<typeof setTimeout> | null });
  const now = useRef(actions);
  useEffect(() => {
    now.current = actions;
  });
  const on = !!(actions.right || actions.left || actions.up);

  const drop = () => {
    state.current.lifted = false;
    setLifted(false);
    lock(false);
    Animated.parallel([
      Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: native, bounciness: 4 }),
      Animated.spring(lift, { toValue: 0, useNativeDriver: native, bounciness: 4 }),
    ]).start();
  };
  // Nie mit gesperrter Seite zurückbleiben, auch wenn die Karte verschwindet
  useEffect(
    () => () => {
      if (state.current.timer) clearTimeout(state.current.timer);
      if (state.current.lifted) lock(false);
    },
    [lock],
  );
  const pressIn = () => {
    state.current.skipPress = false;
    if (!on) return;
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = setTimeout(() => {
      state.current.lifted = true;
      setLifted(true);
      lock(true);
      Animated.spring(lift, { toValue: 1, useNativeDriver: native, bounciness: 6 }).start();
    }, LIFT_MS);
  };
  const pressOut = () => {
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = null;
    if (!state.current.lifted) return;
    // Angehoben: Das Tippen zählt nicht. Ohne Ziehen wieder ablegen. Erst nach dem Ereignis prüfen, denn beim
    // Ziehen endet das Tippen, bevor das Ziehen beginnt.
    state.current.skipPress = true;
    setTimeout(() => {
      if (state.current.lifted && !state.current.dragging) drop();
    }, 0);
  };
  /** Finger weg, egal wo: Zeitgeber stoppen und eine angehobene, nicht gezogene Karte ablegen (Sicherung, Daria 2026-11-13) */
  const touchEnd = () => {
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = null;
    if (state.current.lifted && !state.current.dragging) drop();
  };
  /** Tippen nach dem Ablegen nicht als Tippen werten */
  const press = (onPress?: () => void) => () => {
    if (state.current.skipPress) {
      state.current.skipPress = false;
      return;
    }
    onPress?.();
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => state.current.lifted,
      onPanResponderGrant: () => {
        state.current.dragging = true;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        const a = now.current;
        // Ohne Ziel in dieser Richtung gibt die Karte nur wenig nach; nach oben nur ein Stück, sonst schneidet die Reihe ab
        const x = (g.dx > 0 ? a.right : a.left) ? g.dx : g.dx / 6;
        const y = g.dy < 0 && a.up ? g.dy * 0.4 : g.dy / 6;
        pos.setValue({ x, y });
      },
      onPanResponderRelease: (_e, g) => {
        state.current.dragging = false;
        const a = now.current;
        drop();
        const across = Math.abs(g.dx) >= Math.abs(g.dy);
        if (across && g.dx >= DRAG_AT) a.right?.();
        else if (across && g.dx <= -DRAG_AT) a.left?.();
        else if (!across && g.dy <= -DRAG_AT) a.up?.();
      },
      onPanResponderTerminate: () => {
        state.current.dragging = false;
        drop();
      },
    }),
  ).current;
  return { on, pos, lift, lifted, pressIn, pressOut, press, touchEnd, handlers: pan.panHandlers };
}

function Card({
  bg,
  mood,
  head,
  children,
  tiltKey,
  urgent = false,
  onPress,
  pressHint,
  onDragRight,
  onDragLeft,
  onDragUp,
}: {
  bg: string;
  mood: Mood;
  head: ReactNode;
  children?: ReactNode;
  /** Für die feste Schräge, meist die id */
  tiltKey: string;
  /** Dringend (fällig in einer Stunde oder vorbei): wackelt alle paar Sekunden kurz (Daria, 2026-11-13) */
  urgent?: boolean;
  /** Tippen auf die Karte, z. B. erledigte Karte öffnet ihr Menü (Daria, 2026-11-13) */
  onPress?: () => void;
  pressHint?: string;
  /** Angehoben ziehen: rechts erledigt, links abbrechen, oben später (Daria, 2026-11-13) */
  onDragRight?: () => void;
  onDragLeft?: () => void;
  onDragUp?: () => void;
}) {
  const [wide, setWide] = useState(false);
  const drag = useLiftDrag({ right: onDragRight, left: onDragLeft, up: onDragUp });
  const reduce = useReduceMotion();
  const native = Platform.OS !== 'web';
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!urgent || reduce) return;
    const to = (v: number) => Animated.timing(wobble, { toValue: v, duration: 70, useNativeDriver: native });
    const loop = Animated.loop(Animated.sequence([to(1), to(-1), to(0.7), to(-0.5), to(0), Animated.delay(2800)]));
    loop.start();
    return () => {
      loop.stop();
      wobble.setValue(0);
    };
  }, [urgent, reduce, native, wobble]);
  const tilt = tiltOf(tiltKey);
  // Schräge, beim Anheben etwas mehr, beim Wackeln ±2,5°, beim Ziehen neigt sie sich mit
  const degrees = Animated.add(
    drag.lift.interpolate({ inputRange: [0, 1], outputRange: [tilt, tilt + (tilt >= 0 ? 1.5 : -1.5)] }),
    Animated.add(Animated.multiply(wobble, 2.5), Animated.multiply(drag.pos.x, 0.04)),
  );
  const rotate = degrees.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const scale = drag.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  const kater = (
    // Ring in der Farbe des Grunds (Daria, 2026-11-12)
    <View style={wide && styles.katerSide}>
      <View style={styles.katerRing}>
        <KaterRund size={40} bg={bg} />
      </View>
      {/* Stimmung klebt schräg am Kater wie ein Sticker (Daria, 2026-11-12) */}
      <View style={styles.chip} pointerEvents="none">
        <Text style={styles.chipText} numberOfLines={1}>
          {mood}
        </Text>
      </View>
    </View>
  );
  const card = (
    <Pressable
      onPress={drag.press(onPress)}
      onPressIn={drag.pressIn}
      onPressOut={drag.pressOut}
      onLayout={(e) => setWide(e.nativeEvent.layout.width >= SIDE_BY_SIDE)}
      accessibilityHint={pressHint ? t(pressHint) : drag.on ? t('Halten und ziehen: rechts erledigt, links abbrechen, oben später') : undefined}
      style={[styles.card, !wide && styles.cardTall, drag.lifted && styles.cardLifted, { backgroundColor: bg }]}
    >
      {wide ? null : <View style={styles.cardTop}>{kater}</View>}
      <View style={styles.cardBody}>
        {wide ? (
          <View style={styles.headRow}>
            <View style={styles.head}>{head}</View>
            {kater}
          </View>
        ) : (
          head
        )}
        {children}
      </View>
    </Pressable>
  );
  return (
    <View style={[styles.swipe, drag.lifted && styles.swipeLifted]} onTouchEnd={drag.touchEnd} onTouchCancel={drag.touchEnd}>
      {/* Was das Ziehen auslöst, steht hinter der Karte und erscheint beim Ziehen */}
      {drag.on ? (
        <View style={styles.swipeHints} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={{ opacity: drag.pos.x.interpolate({ inputRange: [0, DRAG_AT], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
            {onDragRight ? <Text style={styles.swipeHint}>Erledigt</Text> : null}
          </Animated.View>
          <Animated.View style={[styles.swipeHintUp, { opacity: drag.pos.y.interpolate({ inputRange: [-DRAG_AT * 0.4, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
            {onDragUp ? <Text style={styles.swipeHint}>Später</Text> : null}
          </Animated.View>
          <Animated.View style={{ opacity: drag.pos.x.interpolate({ inputRange: [-DRAG_AT, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
            {onDragLeft ? <Text style={styles.swipeHint}>Abbrechen</Text> : null}
          </Animated.View>
        </View>
      ) : null}
      <Animated.View
        style={[styles.swipe, { transform: [{ translateX: drag.pos.x }, { translateY: drag.pos.y }, { rotate }, { scale }] }]}
        {...drag.handlers}
      >
        {card}
      </Animated.View>
    </View>
  );
}

/** Auch in der Tour (TourDemo), dort mit Beispieldaten */
export function DemoTaskCard(props: { reminder: Reminder; onDone: () => void; onGiveUp: () => void; onCancel: () => void; onEdit?: () => void }) {
  return <TaskCard {...props} />;
}

function TaskCard({
  reminder: r,
  onDone,
  onGiveUp,
  onCancel,
  onEdit,
  onCopy,
  onDelete,
  onLater,
  urgent,
}: {
  reminder: Reminder;
  onDone: () => void;
  onGiveUp: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onLater?: () => void;
  urgent?: boolean;
}) {
  const goal = goalOf(r);
  const done = Math.min(r.doneThisWeek, goal);
  const resting = r.doneToday || r.doneThisWeek >= goal;
  const cancel = { label: 'Das hier abbrechen', onPress: onCancel };
  const edit = onEdit ? [{ label: 'Bearbeiten', onPress: onEdit }] : [];
  // Erledigte Karte (Daria, 2026-11-13): Tippen öffnet das Menü, dort auch Kopie und Löschen
  const closed = closedItems(onCopy, onDelete);
  const menu = useRef<(() => void) | null>(null);
  return (
    <Card
      bg={SENF}
      mood={moodOf(r)}
      onPress={resting ? () => menu.current?.() : undefined}
      pressHint={resting ? 'Öffnet das Menü' : undefined}
      tiltKey={r.id}
      urgent={urgent}
      onDragRight={resting ? undefined : onDone}
      onDragLeft={onCancel}
      onDragUp={resting ? undefined : onLater}
      head={<CardHead meta={r.onDate ? whenText(r) : goalText(r)} title={capitalize(r.want)} onEdit={onEdit} />}
    >
      <ReminderExtrasRow place={r.place} phone={r.phone} link={r.link} ink={INK} />
      {goal > 1 ? <Text style={styles.sub}>{t('{done} von {goal} diese Woche', { done, goal })}</Text> : null}
      {goal > 1 ? (
        <View
          style={styles.bar}
          accessible
          accessibilityLabel={t('{done} von {goal} diese Woche', {
            done,
            goal,
          })}
        >
          {Array.from({ length: goal }, (_, i) => (
            <View key={i} style={[styles.segment, i < done && styles.segmentDone]} />
          ))}
        </View>
      ) : null}
      {/* Erledigt, Aufgeben und im Menü „Das hier abbrechen“ (Daria, 2026-11-13); alle drei zählen im Kalender.
          Buttons mit festem Abstand beieinander, nur „•••“ rechts (Daria, 2026-11-13) */}
      {resting ? (
        <View style={styles.actions}>
          <Text style={styles.state}>{r.doneToday ? 'Heute erledigt' : 'Ziel erreicht'}</Text>
          <ManageButton
            dots={INK}
            style={styles.more}
            label="Mehr zu dieser Aufgabe"
            openRef={menu}
            items={[...edit, ...closed.copy, { label: 'Aufgeben', onPress: onGiveUp }, cancel, ...closed.remove]}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <HandButton label="Aufgeben" onPress={onGiveUp} />
          <HandButton label="Erledigt" onPress={onDone} filled bg={SENF} />
          <ManageButton dots={INK} style={styles.more} label="Mehr zu dieser Aufgabe" items={[...edit, cancel]} />
        </View>
      )}
    </Card>
  );
}

function TerminCard({
  reminder: r,
  bg,
  onDone,
  onEnd,
  onEdit,
  onCopy,
  onDelete,
  onLater,
  urgent,
}: {
  reminder: Reminder;
  bg: string;
  onDone: () => void;
  onEnd: () => void;
  onEdit: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onLater?: () => void;
  urgent?: boolean;
}) {
  // Jede Karte mit „•••“ und „Bearbeiten“, auch feste Termine (Daria, 2026-11-13); erledigt auch Kopie und Löschen
  const closed = r.doneToday ? closedItems(onCopy, onDelete) : { copy: [], remove: [] };
  const menu = useRef<(() => void) | null>(null);
  const more = (
    <ManageButton
      dots={INK}
      style={styles.more}
      label="Mehr zu diesem Termin"
      openRef={menu}
      items={[{ label: 'Bearbeiten', onPress: onEdit }, ...closed.copy, ...closed.remove]}
    />
  );
  return (
    <Card
      bg={bg}
      mood={moodOf(r)}
      onPress={r.doneToday ? () => menu.current?.() : undefined}
      pressHint={r.doneToday ? 'Öffnet das Menü' : undefined}
      tiltKey={r.id}
      urgent={urgent}
      onDragRight={r.doneToday ? undefined : onDone}
      // Links: absagen; erledigt: löschen (Daria, 2026-11-13)
      onDragLeft={r.doneToday ? onDelete : onEnd}
      onDragUp={r.doneToday ? undefined : onLater}
      head={<CardHead meta={whenText(r)} title={capitalize(r.want)} onEdit={onEdit} />}>
      <ReminderExtrasRow place={r.place} phone={r.phone} link={r.link} ink={INK} />
      {r.doneToday ? (
        <View style={styles.actions}>
          <Text style={styles.state}>Erledigt</Text>
          {more}
        </View>
      ) : (
        <View style={styles.actions}>
          {/* „Absagen“ statt „Beenden“: Ein Termin findet nicht statt, er läuft nicht aus (Daria, 2026-11-13) */}
          <HandButton label="Absagen" onPress={onEnd} />
          <HandButton label="Erledigt" onPress={onDone} filled bg={bg} />
          {more}
        </View>
      )}
    </Card>
  );
}

/** Menüpunkte nur für erledigte Karten: Kopie oben, Löschen ganz unten (Daria, 2026-11-13) */
function closedItems(onCopy?: () => void, onDelete?: () => void) {
  return {
    copy: onCopy ? [{ label: 'Kopie erstellen', onPress: onCopy }] : [],
    remove: onDelete ? [{ label: 'Löschen', onPress: onDelete }] : [],
  };
}

/** Zeit und Titel einer Karte. Mit `onEdit` öffnet ein Tippen darauf das Bearbeiten (Daria, 2026-11-13). */
function CardHead({ meta, title, onEdit }: { meta: string; title: string; onEdit?: () => void }) {
  const content = (
    <>
      <Text style={styles.meta}>{meta}</Text>
      <Text noTranslate style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </>
  );
  if (!onEdit) return content;
  return (
    <Pressable onPress={onEdit} accessibilityRole="button" accessibilityHint={t('Öffnet das Bearbeiten')} style={({ pressed }) => [styles.headPress, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

/** Termin aus einem verbundenen Kalender, nur zum Ansehen */
function CalendarCard({ event: e }: { event: CalendarEvent }) {
  const when = `${dayName(eventDate(e))} ${e.allDay ? t('ganztägig') : t('um {time}', { time: eventTime(e.start) })}`;
  return (
    <Card
      bg={OLIVE}
      tiltKey={e.id}
      mood="chillig"
      head={
        <>
          <Text style={styles.meta}>{when}</Text>
          <Text noTranslate style={styles.title} numberOfLines={2}>
            {e.title}
          </Text>
        </>
      }
    >
      <Text noTranslate style={styles.state}>
        {e.calendar || t('Aus Deinem Kalender')}
      </Text>
    </Card>
  );
}

/** Gespeicherter Termin aus einem Schaufenster: Entfernen oder in den eigenen Kalender */
function SavedCard({ event: e, onChanged }: { event: Saved; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    const ok = await saveEvent(e.id, false);
    setBusy(false);
    if (ok) onChanged();
  };
  const toCalendar = async () => {
    const ok = await addToMyCalendar(asSingleEvent(e, e.showcase));
    if (!ok) Alert.alert(t('Hat nicht geklappt'), t('Der Kalender ließ sich gerade nicht öffnen.'));
  };
  return (
    <Card
      bg={PUDER}
      tiltKey={`s${e.id}`}
      mood={e.cancelled ? 'enttäuscht' : 'neugierig'}
      head={
        <>
          <Text style={styles.meta}>{e.cancelled ? t('Abgesagt') : eventWhen(e)}</Text>
          <Text noTranslate style={[styles.title, e.cancelled && styles.struck]} numberOfLines={2}>
            {e.title}
          </Text>
        </>
      }
    >
      <Text noTranslate style={styles.sub} numberOfLines={1}>
        {e.location ? `${e.showcase} · ${e.location}` : e.showcase}
      </Text>
      <View style={styles.actions}>
        <HandButton label="Entfernen" onPress={remove} disabled={busy} />
        {/* Genau sagen, was passiert (Daria, 2026-11-13, vorher „Kalender“): im Browser eine Kalenderdatei, in der
            Android-App der Kalender des Handys */}
        {e.cancelled ? null : <HandButton label={Platform.OS === 'web' ? 'ICS exportieren' : 'In Handykalender'} onPress={toCalendar} filled bg={PUDER} />}
      </View>
    </Card>
  );
}

/** Button in der Handform: gefüllt in Tinte oder nur mit Kontur */
function HandButton({
  label: original,
  onPress,
  filled,
  bg,
  disabled,
}: {
  label: string;
  onPress: () => void;
  filled?: boolean;
  bg?: string;
  disabled?: boolean;
}) {
  const label = useTexts()(original);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }));
  };
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.hand, filled && styles.handFilled, (pressed || disabled) && styles.pressed]}
    >
      {box ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={handShapePath(box.w, box.h, filled ? 0 : 1)} fill={filled ? INK : 'none'} stroke={filled ? undefined : INK} strokeWidth={filled ? 0 : 1.4} />
        </Svg>
      ) : null}
      <Text noTranslate style={[styles.handLabel, { color: filled ? bg : INK }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Kalender (Daria, 2026-11-12, nach Vorlage): runde Tage, erledigte in Senf, ausgefallene schraffiert, heute mit Ring.
 * Standardmäßig eingeklappt auf die laufende Woche; ein Tipp auf den Monat klappt ihn auf.
 */
function RoutineCalendar({ list, events, saved }: { list: Reminder[]; events: CalendarEvent[]; saved: Saved[] }) {
  const [open, setOpen] = useState(false);
  // Gewählter Tag (Daria, 2026-11-12): darunter steht, was an dem Tag war
  const [picked, setPicked] = useState<string | null>(null);
  const [days, setDays] = useState<RoutineDays | null>(null);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const week = weekStart(now);
  // Laden ab dem früheren von Monatsanfang und Wochenanfang, bis zum späteren Ende
  const from = week < monthStart ? week : monthStart;
  const weekEnd = addDays(6, week);
  const to = weekEnd > monthEnd ? weekEnd : monthEnd;
  const key = `${localDate(from)} ${list.map((r) => `${r.id}:${r.doneThisWeek}`).join(',')}`;
  useEffect(() => {
    loadRoutineDays(from, to).then(setDays, () => setDays(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const today = localDate(now);
  const inMonth = (d: string) => d.slice(0, 7) === today.slice(0, 7);
  const doneCount = days ? [...days.done].filter(inMonth).length : 0;
  const missedCount = days ? [...days.missed].filter(inMonth).length : 0;
  // Aufgegeben und abgebrochen zählen wie geschafft (Daria, 2026-11-13)
  const countIn = (by?: Map<string, string[]>) => (by ? [...by].filter(([d]) => inMonth(d)).reduce((n, [, names]) => n + names.length, 0) : 0);
  const givenUpCount = countIn(days?.givenUpBy);
  const cancelledCount = countIn(days?.cancelledBy);
  const calledOffCount = countIn(days?.calledOffBy);
  const month = new Intl.DateTimeFormat(localeTag(), { month: 'long' }).format(now);

  const cells: (Date | null)[] = open
    ? [...Array.from({ length: isoWeekday(monthStart) - 1 }, () => null), ...Array.from({ length: monthEnd.getDate() }, (_, i) => addDays(i, monthStart))]
    : Array.from({ length: 7 }, (_, i) => addDays(i, week));

  return (
    <View style={styles.cal}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t(open ? 'Kalender einklappen' : 'Ganzen Monat zeigen')}
        style={styles.calHead}
        hitSlop={8}
      >
        <Text noTranslate style={styles.groupTitle}>
          {`${month} ${open ? '▴' : '▾'}`}
        </Text>
        <Text style={styles.groupCount}>
          {t('{done} geschafft · {missed} ausgefallen', {
            done: doneCount,
            missed: missedCount,
          })}
        </Text>
      </Pressable>
      <View style={styles.calGrid}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Text key={`h${d}`} noTranslate style={styles.calWeekday}>
            {weekdayShort(d)}
          </Text>
        ))}
        {cells.map((d, i) =>
          d ? (
            <CalDay
              key={localDate(d)}
              date={d}
              today={today}
              days={days}
              picked={picked === localDate(d)}
              onPress={() => setPicked(picked === localDate(d) ? null : localDate(d))}
            />
          ) : (
            <View key={`e${i}`} style={styles.calCell} />
          ),
        )}
      </View>
      {givenUpCount || cancelledCount || calledOffCount ? (
        <Text style={styles.calEnded}>
          {[
            givenUpCount || cancelledCount ? t('{givenUp} aufgegeben · {cancelled} abgebrochen', { givenUp: givenUpCount, cancelled: cancelledCount }) : '',
            calledOffCount ? t('{n} abgesagt', { n: calledOffCount }) : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      <DayBar day={picked ?? today} today={today} days={days} list={list} events={events} saved={saved} />
    </View>
  );
}

function CalDay({ date, today, days, picked, onPress }: { date: Date; today: string; days: RoutineDays | null; picked: boolean; onPress: () => void }) {
  const [size, setSize] = useState(0);
  const d = localDate(date);
  const done = days?.done.has(d);
  const missed = !done && days?.missed.has(d);
  const isToday = d === today;
  const label = `${date.getDate()}${done ? `, ${t('geschafft')}` : missed ? `, ${t('ausgefallen')}` : ''}${isToday ? `, ${t('heute')}` : ''}`;
  return (
    <Pressable style={styles.calCell} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: picked }} accessibilityLabel={label}>
      <View
        onLayout={(e) => setSize(e.nativeEvent.layout.width)}
        style={[styles.calDay, done && styles.calDayDone, isToday && !done && styles.calDayToday, picked && styles.calDayPicked]}
      >
        {missed && size ? (
          <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <Pattern id={`hatch${d}`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <Line x1={0} y1={0} x2={0} y2={6} stroke={HATCH} strokeWidth={2} />
              </Pattern>
            </Defs>
            <Rect width={size} height={size} rx={size / 2} fill={`url(#hatch${d})`} />
          </Svg>
        ) : null}
        <Text noTranslate style={[styles.calNum, done && styles.calNumDone, missed && styles.calNumMissed]}>
          {date.getDate()}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Schmale Textleiste unter dem Kalender (Daria, 2026-11-12): nur Text, z. B. „Heute · 13:00 Zahnarzt · Klavier
 * spielen“. Gibt einen Überblick über den gewählten Tag, ohne die Karten darunter zu doppeln. Ohne Auswahl: heute.
 */
function DayBar({
  day,
  today,
  days,
  list,
  events,
  saved,
}: {
  day: string;
  today: string;
  days: RoutineDays | null;
  list: Reminder[];
  events: CalendarEvent[];
  saved: Saved[];
}) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const label = day === today ? t('Heute') : new Intl.DateTimeFormat(localeTag(), { weekday: 'short', day: 'numeric', month: 'numeric' }).format(date);
  const done = days?.doneBy.get(day) ?? [];
  const missed = days?.missedBy.get(day) ?? [];
  // Beendete stehen nicht mehr in der Liste: aufgegeben und abgebrochen mit Wort dahinter
  const ended = [
    ...(days?.givenUpBy.get(day) ?? []).map((w) => `${capitalize(w)} (${t('aufgegeben')})`),
    ...(days?.cancelledBy.get(day) ?? []).map((w) => `${capitalize(w)} (${t('abgebrochen')})`),
    ...(days?.calledOffBy.get(day) ?? []).map((w) => `${capitalize(w)} (${t('abgesagt')})`),
  ];
  // Mit Uhrzeit zuerst, nach Zeit sortiert
  const timed: [string, string][] = [
    ...list.filter((r) => r.onDate === day && (r.atTime || r.untilTime)).map((r): [string, string] => [r.atTime ?? r.untilTime ?? '', capitalize(r.want)]),
    ...list.filter((r) => !r.onDate && r.atTime && r.weekdays?.includes(isoWeekday(date))).map((r): [string, string] => [r.atTime ?? '', capitalize(r.want)]),
    ...events.filter((e) => eventDate(e) === day && !e.allDay).map((e): [string, string] => [eventTime(e.start), e.title]),
    ...saved.filter((e) => localDate(new Date(e.startsAt)) === day).map((e): [string, string] => [eventTime(e.startsAt), e.title]),
  ].sort((a, b) => a[0].localeCompare(b[0]));
  const timedNames = new Set(timed.map(([, n]) => n));
  // Ohne Uhrzeit: fällige Aufgaben ab heute, sonst was geschafft oder ausgefallen ist
  const untimed = [
    ...events.filter((e) => eventDate(e) === day && e.allDay).map((e) => e.title),
    ...(day >= today
      ? list
          .filter((r) => (r.onDate ? r.onDate === day : r.weekdays ? r.weekdays.includes(isoWeekday(date)) : day === today))
          .map((r) => capitalize(r.want) + (done.includes(r.want) ? ' ✓' : ''))
      : [...done.map((w) => `${capitalize(w)} ✓`), ...missed.map((w) => `${capitalize(w)} ✗`)]),
  ].filter((n) => !timedNames.has(n.replace(/ [✓✗]$/, '')));
  const items = [...timed.map(([time, name]) => `${time} ${name}`), ...untimed, ...ended];
  return (
    <Text noTranslate style={styles.dayBar} numberOfLines={2} accessibilityLiveRegion="polite">
      {items.length ? [label, ...items].join(' · ') : `${label} · ${t('nichts geplant')}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  calEnded: { ...text.bodySm, color: color.text.secondary, textAlign: 'right' },
  dayBar: { ...text.bodySm, marginTop: space[4], color: color.text.secondary },
  group: { gap: space[12] },
  groupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[12],
  },
  groupTitle: {
    ...text.settingsHeading,
    color: color.text.primary,
  },
  groupCount: {
    ...text.bodyLarge,
    color: color.text.secondary,
  },
  // Platz für Schräge und Anheben: Reihe bekommt oben und unten Luft, ohne dass sich der Abstand ändert
  rowScroll: { marginHorizontal: -GUTTER, marginVertical: -space[12], overflow: 'visible' },
  row: { paddingHorizontal: GUTTER, paddingVertical: space[12], gap: space[12] },
  card: {
    flex: 1,
    // Weniger rund (Daria, 2026-11-12): vorher 30, dann 16, jetzt Maß aller Karten (2026-11-13)
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  cardBody: { flex: 1, justifyContent: 'flex-end', gap: 6 },
  // Neben dem Kater braucht die Karte oben keinen Platz mehr
  cardTall: { minHeight: 260 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  head: { flex: 1, gap: 2 },
  headPress: { gap: 2 },
  // Platz für den Sticker, der links unter dem Kater herausragt
  katerSide: { marginLeft: 28, marginBottom: 8, alignSelf: 'flex-start' },
  chip: {
    position: 'absolute',
    right: 4,
    bottom: -10,
    backgroundColor: color.bg.screen,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: '-8deg' }],
  },
  chipText: {
    ...text.captionStrong,
    color: color.text.primary,
  },
  katerRing: {
    borderRadius: 23,
    borderWidth: 3,
    borderColor: color.bg.screen,
    overflow: 'hidden',
  },
  meta: {
    ...text.labelSm,
    color: INK_SOFT,
  },
  title: {
    ...text.listTitle,
    color: INK,
  },
  struck: { textDecorationLine: 'line-through' },
  sub: {
    ...text.bodySm,
    color: INK_SOFT,
  },
  state: {
    ...text.label,
    color: INK_SOFT,
    paddingVertical: 11,
  },
  bar: { flexDirection: 'row', gap: space[4], marginVertical: 2 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: INK_TRACK },
  segmentDone: { backgroundColor: INK },
  // Buttons mit festem Abstand beieinander; nur „•••“ rückt nach rechts (Daria, 2026-11-13)
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    marginTop: space[4],
  },
  more: { marginLeft: 'auto' },
  // Im Browser markiert Ziehen mit der Maus sonst den Text, und die Karte bleibt stehen
  swipe: { flex: 1, userSelect: 'none' },
  // Angehoben liegt die Karte über den anderen
  swipeLifted: { zIndex: 2, elevation: 8 },
  cardLifted: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  swipeHintUp: { position: 'absolute', left: 0, right: 0, bottom: space[12], alignItems: 'center' },
  swipeHints: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[8],
  },
  swipeHint: { ...text.label, color: color.text.primary },
  hand: {
    height: 34,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[16],
  },
  // Schmaler als vorher (124), damit die drei Punkte daneben passen
  handFilled: { minWidth: 108 },
  handLabel: { ...text.label },
  pressed: { opacity: 0.7 },
  create: { marginTop: space[8] },
  cal: { gap: space[8] },
  calHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[12],
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[6] },
  calWeekday: {
    ...text.small,
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: color.text.secondary,
  },
  calCell: { width: `${100 / 7}%`, alignItems: 'center' },
  calDay: {
    width: '88%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: DAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayDone: { backgroundColor: SENF },
  calDayPicked: { borderWidth: 2, borderColor: color.accent.primary },
  calDayToday: { borderWidth: 1.5, borderColor: color.text.primary },
  calNum: {
    ...text.bodyLarge,
    color: color.text.primary,
  },
  calNumDone: { color: INK, fontFamily: font.medium },
  calNumMissed: { color: color.text.secondary, opacity: 0.6 },
});
