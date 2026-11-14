import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Alert, Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCardSwipe } from '../lib/cardSwipe';
import { whenUntouched } from '../lib/touching';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { Button } from './Button';
import { Icon } from './icons/Icon';
import { KaterCard, KaterRund } from './Content';
import { handShapePath } from './handShape';
import { ReminderExtrasRow } from './ReminderExtras';
import { ManageButton } from './ShowcaseManage';
import { Text } from './T';
import { useCardMotion } from '../data/features';
import { setCalendarMonth, useCalendarMonth, useCalendarShown, useRoutineData } from '../data/routineView';
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

/**
 * `memo`: Die Seite rendert neu, wenn eine Karte angehoben wird (Scrollen sperren). Die Karten sollen dabei nicht
 * neu rendern (Daria, 2026-11-13: „die App flackert“).
 */
export const RoutineList = memo(function RoutineList({
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
  showCalendar = true,
}: {
  list: Reminder[];
  events: CalendarEvent[];
  saved: Saved[];
  onDone: (r: Reminder) => void;
  /** Aufgeben oder abbrechen, mit Rückfrage (Daria, 2026-11-13) */
  /** `confirm` false beim Ziehen: Die Karte hat die Bedeutung schon gezeigt (Daria, 2026-11-13) */
  onEnd: (r: Reminder, how: ReminderEnd, confirm?: boolean) => void;
  onNew: () => void;
  /** Bearbeiten über das Menü: „•••“ oder Tippen auf die Karte (Daria, 2026-11-13) */
  onEdit: (r: Reminder) => void;
  /** Kopie über „Neue Erinnerung“, vorausgefüllt (Daria, 2026-11-13) */
  onCopy: (r: Reminder) => void;
  onChanged: () => void;
  /** Karte angehoben: Seite nicht scrollen (Daria, 2026-11-13) */
  onDragLock?: (on: boolean) => void;
  /** Kalender in der Liste; im Feed liegt er hinter den Umschaltern (Daria, 2026-11-14) */
  showCalendar?: boolean;
}) {
  const focus = list.length ? katerFocus(list) : undefined;
  const motion = useCardMotion();
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
    <Motion.Provider value={motion}>
    <PageLock.Provider value={onDragLock ?? noLock}>
      {/* Kater spricht wie im Feed als Sprechblase (Daria, 2026-11-11) */}
      {focus ? (
        <AsideWhenCalendar>
          <KaterCard>{katerLine(focus)}</KaterCard>
        </AsideWhenCalendar>
      ) : null}
      {showCalendar ? <RoutineCalendar list={list} events={events} saved={saved} /> : null}
      {tasks.length ? (
        <Group title="Aufgaben" count={tasks.length}>
          {tasks.map((r) => (
            <TaskCard key={r.id} reminder={r} onDone={() => onDone(r)} onGiveUp={() => onEnd(r, 'given_up')} onCancel={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} />
          ))}
        </Group>
      ) : null}
      {fixed.length || calendar.length ? (
        <Group title="Feste Termine" count={fixed.length + calendar.length}>
          {fixed.map((r) => (
            <TerminCard key={r.id} reminder={r} bg={OLIVE} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} />
          ))}
          {calendar.map((e) => (
            <CalendarCard key={e.id} event={e} />
          ))}
        </Group>
      ) : null}
      {optional.length || saved.length ? (
        <Group title="Das hast Du Dir vorgemerkt" count={optional.length + saved.length}>
          {optional.map((r) => (
            <TerminCard key={r.id} reminder={r} bg={PUDER} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} />
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
    </Motion.Provider>
  );
});

const noLock = () => {};

/**
 * Ist der Kalender oben offen, tritt der Kater zur Seite (Daria, 2026-11-14): Er gleitet nach links hinaus, die Zeile
 * schrumpft, danach ist er ganz weg (sonst bliebe der Abstand der Liste stehen). Klappt der Kalender zu, kommt er zurück.
 */
function AsideWhenCalendar({ children }: { children: ReactNode }) {
  const shown = !useCalendarShown();
  const [mounted, setMounted] = useState(shown);
  const [height, setHeight] = useState(0);
  const anim = useRef(new Animated.Value(shown ? 1 : 0)).current;
  useEffect(() => {
    if (shown) setMounted(true);
    anim.stopAnimation();
    Animated.timing(anim, { toValue: shown ? 1 : 0, duration: 380, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start(({ finished }) => {
      if (finished && !shown) setMounted(false);
    });
  }, [shown, anim]);
  const style = useMemo(
    () => ({
      opacity: anim,
      height: height ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) : undefined,
      transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
    }),
    [anim, height],
  );
  if (!mounted) return null;
  return (
    <Animated.View style={[styles.aside, style]}>
      <View onLayout={(e) => setHeight((h) => (h === e.nativeEvent.layout.height ? h : e.nativeEvent.layout.height))}>{children}</View>
    </Animated.View>
  );
}

/** Uhrzeit für Dringlichkeit und Sortierung; jede Minute neu */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Neu sortieren erst, wenn kein Finger liegt: sonst wandert eine Karte unter dem Finger weg (Daria, 2026-11-14)
    let cancel = () => {};
    const id = setInterval(() => {
      cancel();
      cancel = whenUntouched(() => setNow(new Date()));
    }, 60_000);
    return () => {
      clearInterval(id);
      cancel();
    };
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
  const snooze = useCallback(
    (id: string) =>
      setLater((all) => {
        const next = Object.fromEntries(Object.entries(all).filter(([, until]) => until > Date.now()));
        next[id] = Date.now() + LATER_MS;
        AsyncStorage.setItem(LATER_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      }),
    [],
  );
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
/** Nach oben folgt die Karte nur zu diesem Teil dem Finger */
const UP_FACTOR = 0.4;
/** Platz über der Reihe, in den die Karte beim Anheben und Hochziehen ragen darf, ohne abgeschnitten zu werden */
const UP_ROOM = 52;
const LIFT_MS = 350;
/** Solange eine Karte angehoben ist, scrollen weder die Reihe noch die Seite */
const DragLock = createContext<(on: boolean) => void>(() => {});
/** Bewegte Karten an (Dein Konto › Funktionen): Schräge, Wackeln, Halten und Ziehen (Daria, 2026-11-13) */
const Motion = createContext(true);
const PageLock = createContext<(on: boolean) => void>(() => {});

/** Leichte, unregelmäßige Schräge je Karte (Daria, 2026-11-13); fest an der id, damit nichts springt */
const TILTS = [-1.4, 0.9, -0.5, 1.6, -1.1, 0.4, 1.2, -0.8];
function tiltOf(key: string): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TILTS[Math.abs(h) % TILTS.length];
}

/**
 * Wo der Stimmungs-Sticker am Kater klebt (Daria, 2026-11-14): nie über dem Gesicht, sondern darunter oder über den
 * Ohren, mal links, mittig oder rechts, mal schräg in die eine, mal in die andere Richtung. Wechselt jeden Tag und
 * bleibt innerhalb eines Tages gleich, damit nichts springt.
 */
const STICKERS: { above: boolean; avatar: 'flex-start' | 'center' | 'flex-end'; rotate: number }[] = [
  { above: false, avatar: 'flex-end', rotate: -7 },
  { above: false, avatar: 'flex-start', rotate: 6 },
  { above: false, avatar: 'center', rotate: -3 },
  { above: true, avatar: 'flex-end', rotate: 8 },
  { above: true, avatar: 'flex-start', rotate: -9 },
  { above: false, avatar: 'center', rotate: 9 },
];
function stickerOf(key: string) {
  let h = 7;
  for (const c of `${key}${localDate()}`) h = (h * 33 + c.charCodeAt(0)) | 0;
  return STICKERS[Math.abs(h) % STICKERS.length];
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
          {/* Eine Karte: keine Reihe zum Scrollen. Ein abgeschalteter ScrollView sperrt im Browser jede Berührung
              (touch-action: none), dann scrollt die Seite nicht, wenn der Finger auf der Karte startet (Daria, 2026-11-13). */}
          {cards.length === 1 ? (
            <View style={[styles.rowScroll, styles.row]}>
              <View style={{ width: cardWidth }}>{cards[0]}</View>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={!locked}
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
          )}
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
  // Im Browser zählt für das Scrollen nur, was beim Aufsetzen des Fingers galt. Solange die Karte angehoben ist, hält
  // deshalb ein eigener Zuhörer jede Fingerbewegung vom Scrollen ab (Daria, 2026-11-13: „Seite scrollt mit“).
  useEffect(() => {
    if (!lifted || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('touchmove', stop, { passive: false });
    return () => document.removeEventListener('touchmove', stop);
  }, [lifted]);

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
        // Eine Richtung zur Zeit, damit die Karte nur eine Bedeutung zeigt. Ohne Ziel in dieser Richtung gibt sie nur
        // wenig nach; nach oben nur ein Stück, sonst schneidet die Reihe ab.
        const across = Math.abs(g.dx) >= Math.abs(g.dy);
        const x = across && (g.dx > 0 ? a.right : a.left) ? g.dx : g.dx / 6;
        const y = !across && g.dy < 0 && a.up ? Math.max(g.dy * UP_FACTOR, -UP_ROOM + 8) : g.dy / 6;
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
  leftLabel = 'Abbrechen',
  leftTone = 'end',
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
  /** Was nach links ziehen bedeutet: „Abbrechen“, „Absagen“ oder „Löschen“ (Daria, 2026-11-13) */
  leftLabel?: string;
  leftTone?: 'end' | 'delete';
}) {
  const [wide, setWide] = useState(false);
  const motion = useContext(Motion);
  const drag = useLiftDrag(motion ? { right: onDragRight, left: onDragLeft, up: onDragUp } : {});
  const reduce = useReduceMotion();
  const native = Platform.OS !== 'web';
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Angehoben wackelt nichts, die Karte folgt nur dem Finger
    if (!urgent || reduce || !motion || drag.lifted) return;
    const to = (v: number) => Animated.timing(wobble, { toValue: v, duration: 70, useNativeDriver: native });
    const loop = Animated.loop(Animated.sequence([to(1), to(-1), to(0.7), to(-0.5), to(0), Animated.delay(2800)]));
    loop.start();
    return () => {
      loop.stop();
      wobble.setValue(0);
    };
  }, [urgent, reduce, motion, native, wobble, drag.lifted]);
  const tilt = motion ? tiltOf(tiltKey) : 0;
  // Schräge, beim Anheben etwas mehr, beim Wackeln ±2,5°, beim Ziehen neigt sie sich mit.
  // Einmal anlegen, nicht bei jedem Rendern: Neue Animationsknoten setzen die Karte für ein Bild zurück, das flackert
  // beim Tippen und Halten (Daria, 2026-11-13).
  const { rotate, scale } = useMemo(() => {
    const degrees = Animated.add(
      drag.lift.interpolate({ inputRange: [0, 1], outputRange: [tilt, tilt + (tilt >= 0 ? 1.5 : -1.5)] }),
      Animated.add(Animated.multiply(wobble, 2.5), Animated.multiply(drag.pos.x, 0.04)),
    );
    return {
      rotate: degrees.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }),
      scale: drag.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
    };
  }, [tilt, drag.lift, drag.pos, wobble]);
  const transform = useMemo(() => [{ translateX: drag.pos.x }, { translateY: drag.pos.y }, { rotate }, { scale }], [drag.pos, rotate, scale]);

  const sticker = stickerOf(tiltKey);
  const chip = (
    // Stimmung klebt schräg am Kater wie ein Sticker (Daria, 2026-11-12), nie über seinem Gesicht (2026-11-14)
    <View style={[styles.chip, sticker.above ? styles.chipAbove : styles.chipBelow, { transform: [{ rotate: `${sticker.rotate}deg` }] }]} pointerEvents="none">
      <Text style={styles.chipText} numberOfLines={1}>
        {mood}
      </Text>
    </View>
  );
  const kater = (
    // Ring in der Farbe des Grunds (Daria, 2026-11-12)
    <View style={[styles.katerSide, { alignItems: sticker.avatar }]}>
      {sticker.above ? chip : null}
      <View style={styles.katerRing}>
        <KaterRund size={40} bg={bg} />
      </View>
      {sticker.above ? null : chip}
    </View>
  );
  const card = (
    <Pressable
      onPress={drag.press(onPress)}
      onPressIn={drag.pressIn}
      onPressOut={drag.pressOut}
      onLayout={(e) => setWide(e.nativeEvent.layout.width >= SIDE_BY_SIDE)}
      accessibilityHint={[
        onPress ? t(pressHint ?? 'Tippen öffnet das Menü') : '',
        drag.on
          ? t('Halten und ziehen: {moves}', {
              moves: [drag.on && onDragRight && t('rechts erledigt'), drag.on && onDragLeft && t('links {what}', { what: t(leftLabel).toLowerCase() }), drag.on && onDragUp && t('oben später')]
                .filter(Boolean)
                .join(', '),
            })
          : '',
      ]
        .filter(Boolean)
        .join('. ')}
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
      {/* Beim Ziehen zeigt die Karte selbst, was das Loslassen auslöst (Daria, 2026-11-13: keine Rückfrage, die Karte
          ändert sich). Bis zur Schwelle schimmert die Farbe nur, ab der Schwelle deckt sie und das Wort wird größer. */}
      {drag.on ? (
        <View style={styles.dragFace} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {drag.on && onDragRight ? <DragFace value={drag.pos.x} sign={1} at={DRAG_AT} bg={color.accent.confirmation} ink={INK} icon="check" label="Erledigt" align="flex-start" /> : null}
          {drag.on && onDragLeft ? (
            <DragFace
              value={drag.pos.x}
              sign={-1}
              at={DRAG_AT}
              bg={leftTone === 'delete' ? color.accent.error : INK}
              ink={leftTone === 'delete' ? INK : color.text.primary}
              icon="close"
              label={leftLabel}
              align="flex-end"
            />
          ) : null}
          {drag.on && onDragUp ? <DragFace value={drag.pos.y} sign={-1} at={DRAG_AT * UP_FACTOR} bg={INK_SOFT} ink={color.text.primary} icon="clock-filled" label="Später" align="center" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
  return (
    <View style={[styles.swipe, drag.lifted && styles.swipeLifted]} onTouchEnd={drag.touchEnd} onTouchCancel={drag.touchEnd}>
      <Animated.View
        style={[styles.swipe, { transform }]}
        {...drag.handlers}
      >
        {card}
      </Animated.View>
    </View>
  );
}

/**
 * Fläche auf der Karte für eine Richtung: Farbe, Icon und Wort. `sign` 1 heißt positive Werte (rechts), −1 negative
 * (links, oben). Die Fläche springt an der Schwelle von halb auf ganz, damit klar ist: Loslassen löst jetzt aus.
 */
function DragFace({
  value,
  sign,
  at,
  bg,
  ink,
  icon,
  label,
  align,
}: {
  value: Animated.Value;
  sign: 1 | -1;
  at: number;
  bg: string;
  ink: string;
  icon: 'check' | 'close' | 'clock-filled';
  label: string;
  align: 'flex-start' | 'flex-end' | 'center';
}) {
  // Stufen: 0 – halbe Schwelle – kurz vor der Schwelle – Schwelle. Einmal anlegen, siehe Card.
  const anim = useMemo(() => {
    const range = (a: number, b: number, c: number, d: number) => ({
      inputRange: sign > 0 ? [0, at / 2, at - 1, at] : [-at, -at + 1, -at / 2, 0],
      outputRange: sign > 0 ? [a, b, c, d] : [d, c, b, a],
      extrapolate: 'clamp' as const,
    });
    return {
      face: value.interpolate(range(0, 0.25, 0.5, 0.96)),
      label: value.interpolate(range(0, 0, 0.6, 1)),
      scale: [{ scale: value.interpolate(range(0.85, 0.85, 0.92, 1.08)) }],
    };
  }, [value, sign, at]);
  return (
    <Animated.View style={[styles.dragFaceLayer, { backgroundColor: bg, alignItems: align, opacity: anim.face }]}>
      <Animated.View style={[styles.dragFaceLabel, { opacity: anim.label, transform: anim.scale }]}>
        <Icon name={icon} size={28} color={ink} />
        <Text style={[styles.dragFaceText, { color: ink }]}>{label}</Text>
      </Animated.View>
    </Animated.View>
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
  onDragCancel,
  onDragDelete,
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
  /** Beim Ziehen: ohne Rückfrage */
  onDragCancel?: () => void;
  onDragDelete?: () => void;
}) {
  const goal = goalOf(r);
  const done = Math.min(r.doneThisWeek, goal);
  const resting = r.doneToday || r.doneThisWeek >= goal;
  // Einmalig und erledigt: kommt nicht wieder, also löschen statt abbrechen oder aufgeben (Daria, 2026-11-13)
  const finished = resting && !!r.onDate;
  const menu = useRef<(() => void) | null>(null);
  const items = menuItems({
    edit: onEdit,
    copy: onCopy,
    later: resting ? undefined : onLater,
    giveUp: resting && !finished ? onGiveUp : undefined,
    end: finished ? undefined : { label: 'Das hier abbrechen', run: onCancel },
    remove: resting ? onDelete : undefined,
  });
  return (
    <Card
      bg={SENF}
      mood={moodOf(r)}
      onPress={() => menu.current?.()}
      tiltKey={r.id}
      urgent={urgent}
      onDragRight={resting ? undefined : onDone}
      onDragLeft={finished ? (onDragDelete ?? onDelete) : (onDragCancel ?? onCancel)}
      leftLabel={finished ? 'Löschen' : 'Abbrechen'}
      leftTone={finished ? 'delete' : 'end'}
      onDragUp={resting ? undefined : onLater}
      head={<CardHead meta={r.onDate ? whenText(r) : goalText(r)} title={capitalize(r.want)} />}
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
          <ManageButton dots={INK} style={styles.more} label="Mehr zu dieser Aufgabe" openRef={menu} items={items} />
        </View>
      ) : (
        <View style={styles.actions}>
          <HandButton label="Aufgeben" onPress={onGiveUp} />
          <HandButton label="Erledigt" onPress={onDone} filled bg={SENF} />
          <ManageButton dots={INK} style={styles.more} label="Mehr zu dieser Aufgabe" openRef={menu} items={items} />
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
  onDragCancel,
  onDragDelete,
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
  /** Beim Ziehen: ohne Rückfrage */
  onDragCancel?: () => void;
  onDragDelete?: () => void;
}) {
  // Jede Karte mit „•••“ (Daria, 2026-11-13); dasselbe Menü öffnet ein Tippen auf die Karte
  const menu = useRef<(() => void) | null>(null);
  const items = menuItems({
    edit: onEdit,
    copy: onCopy,
    later: r.doneToday ? undefined : onLater,
    end: r.doneToday ? undefined : { label: 'Absagen', run: onEnd },
    remove: r.doneToday ? onDelete : undefined,
  });
  const more = <ManageButton dots={INK} style={styles.more} label="Mehr zu diesem Termin" openRef={menu} items={items} />;
  return (
    <Card
      bg={bg}
      mood={moodOf(r)}
      onPress={() => menu.current?.()}
      tiltKey={r.id}
      urgent={urgent}
      onDragRight={r.doneToday ? undefined : onDone}
      // Links: absagen; erledigt: löschen (Daria, 2026-11-13). Beim Ziehen ohne Rückfrage, die Karte zeigt es an.
      onDragLeft={r.doneToday ? (onDragDelete ?? onDelete) : (onDragCancel ?? onEnd)}
      leftLabel={r.doneToday ? 'Löschen' : 'Absagen'}
      leftTone={r.doneToday ? 'delete' : 'end'}
      onDragUp={r.doneToday ? undefined : onLater}
      head={<CardHead meta={whenText(r)} title={capitalize(r.want)} />}>
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

/**
 * Menü jeder eigenen Karte in fester Reihenfolge (Daria, 2026-11-13, „Check consistency“): Bearbeiten, Kopie
 * erstellen, Später, Aufgeben, Abbrechen bzw. Absagen, Löschen. Es steht nur, was zum Zustand passt: Später nur
 * offen, Löschen nur erledigt, Aufgeben nur bei wiederkehrenden.
 */
function menuItems(a: {
  edit?: () => void;
  copy?: () => void;
  later?: () => void;
  giveUp?: () => void;
  end?: { label: string; run: () => void };
  remove?: () => void;
}) {
  return [
    a.edit && { label: 'Bearbeiten', onPress: a.edit },
    a.copy && { label: 'Kopie erstellen', onPress: a.copy },
    a.later && { label: 'Später', onPress: a.later },
    a.giveUp && { label: 'Aufgeben', onPress: a.giveUp },
    a.end && { label: a.end.label, onPress: a.end.run },
    a.remove && { label: 'Löschen', onPress: a.remove },
  ].filter((x): x is { label: string; onPress: () => void } => !!x);
}

/**
 * Zeit und Titel einer Karte. Kein eigenes Tippziel mehr (Daria, 2026-11-13): Halten hebt die Karte an, auch auf dem
 * Titel; Tippen öffnet das Menü, dort steht „Bearbeiten“.
 */
function CardHead({ meta, title }: { meta: string; title: string }) {
  return (
    <>
      <Text style={styles.meta}>{meta}</Text>
      <Text noTranslate style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </>
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
/** Kalender im Feed-Kopf, mit den Daten, die die Routine gerade zeigt (Daria, 2026-11-14) */
export function RoutineCalendarSlot() {
  const data = useRoutineData();
  if (!data) return null;
  // Im Feed bleibt hier immer die Woche; der Monat legt sich als Blatt darüber (RoutineMonthPanel)
  return <RoutineCalendar list={data.list} events={data.events} saved={data.saved} variant="week" />;
}

/**
 * Monat als Blatt über der Liste (Daria, 2026-11-14): Die Liste bleibt stehen, nur das Blatt und die Tage bewegen sich.
 * Vorher schob der Monat beim Aufklappen in jedem Bild die ganze Seite weiter, das ruckelte auf dem iPhone.
 * Antippen außerhalb des Blatts klappt den Monat zu.
 */
export function RoutineMonthPanel() {
  const data = useRoutineData();
  const open = useCalendarMonth();
  const [mounted, setMounted] = useState(open);
  const fade = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    if (open) setMounted(true);
    fade.stopAnimation();
    Animated.timing(fade, {
      toValue: open ? 1 : 0,
      duration: open ? 140 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, fade]);
  if (!mounted || !data) return null;
  return (
    <>
      <Pressable
        style={styles.panelBackdrop}
        onPress={() => setCalendarMonth(false)}
        accessibilityRole="button"
        accessibilityLabel={t('Monat zuklappen')}
      />
      <Animated.View style={[styles.panel, { opacity: fade }]}>
        <RoutineCalendar list={data.list} events={data.events} saved={data.saved} variant="panel" />
      </Animated.View>
    </>
  );
}

export function RoutineCalendar({
  list,
  events,
  saved,
  variant = 'inline',
}: {
  list: Reminder[];
  events: CalendarEvent[];
  saved: Saved[];
  /** inline: Woche und Monat in der Liste (eigene Routine-Seite); week: nur Woche; panel: nur Monat, als Blatt */
  variant?: 'inline' | 'week' | 'panel';
}) {
  // Monat oder Woche, geteilt mit dem Feed: Dieselbe Bewegung wie beim Aufklappen zeigt den ganzen Monat (Daria, 2026-11-14)
  const open = useCalendarMonth();
  const monthMode = variant === 'panel' || (variant === 'inline' && open);
  const setOpen = setCalendarMonth;
  // Gewählter Tag (Daria, 2026-11-12): darunter steht, was an dem Tag war
  const [picked, setPicked] = useState<string | null>(null);
  const [days, setDays] = useState<RoutineDays | null>(null);
  // Blättern (Daria, 2026-11-14): nach links wischen zeigt den nächsten Monat bzw. die nächste Woche, nach rechts den
  // vorigen. Wechsel zwischen Woche und Monat springt zurück zu heute.
  const [shift, setShift] = useState(0);
  // Zeilen des Monats fallen beim Aufklappen eine nach der anderen heraus und klappen beim Zuklappen von unten
  // wieder ein (Daria, 2026-11-14). `rows`: was gerade steht; „closing“ hält den Monat, bis er eingeklappt ist.
  const [rows, setRows] = useState<'week' | 'month' | 'closing'>(monthMode ? 'month' : 'week');
  const [entering, setEntering] = useState(variant === 'panel');
  const weekBefore = useRef<string | null>(null);
  // Blatt: Die Tage fallen beim Öffnen einmal heraus
  useEffect(() => {
    if (variant !== 'panel') return;
    const id = setTimeout(() => setEntering(false), MONTH_IN_MS);
    return () => clearTimeout(id);
  }, [variant]);
  useEffect(() => {
    setShift(0);
    if (variant !== 'inline') return;
    if (open) {
      setRows('month');
      setEntering(true);
      const id = setTimeout(() => setEntering(false), MONTH_IN_MS);
      return () => clearTimeout(id);
    }
    setRows((r) => (r === 'month' ? 'closing' : r));
    const id = setTimeout(() => setRows('week'), MONTH_OUT_MS);
    return () => clearTimeout(id);
  }, [open, variant]);
  const slide = useRef(new Animated.Value(0)).current;
  const go = useCallback(
    (dir: 1 | -1) => {
      setShift((n) => n + dir);
      setPicked(null);
      slide.setValue(dir);
      Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    },
    [slide],
  );
  const goRef = useRef(go);
  goRef.current = go;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -40) goRef.current(1);
        else if (g.dx > 40) goRef.current(-1);
      },
    }),
  ).current;
  const slideStyle = useMemo(
    () => ({
      opacity: slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.3, 1, 0.3] }),
      transform: [{ translateX: slide.interpolate({ inputRange: [-1, 1], outputRange: [-40, 40] }) }],
    }),
    [slide],
  );
  const now = new Date();
  const week = addDays(monthMode ? 0 : shift * 7, weekStart(now));
  const monthStart = monthMode ? new Date(now.getFullYear(), now.getMonth() + shift, 1) : new Date(week.getFullYear(), week.getMonth(), 1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
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
  const shownMonth = localDate(monthStart).slice(0, 7);
  const inMonth = (d: string) => d.slice(0, 7) === shownMonth;
  const doneCount = days ? [...days.done].filter(inMonth).length : 0;
  const missedCount = days ? [...days.missed].filter(inMonth).length : 0;
  // Aufgegeben und abgebrochen zählen wie geschafft (Daria, 2026-11-13)
  const countIn = (by?: Map<string, string[]>) => (by ? [...by].filter(([d]) => inMonth(d)).reduce((n, [, names]) => n + names.length, 0) : 0);
  const givenUpCount = countIn(days?.givenUpBy);
  const cancelledCount = countIn(days?.cancelledBy);
  const calledOffCount = countIn(days?.calledOffBy);
  const month = new Intl.DateTimeFormat(localeTag(), monthStart.getFullYear() === now.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' }).format(monthStart);
  // Ohne gewählten Tag: heute, wenn es im gezeigten Zeitraum liegt, sonst der erste Tag
  const first = monthMode ? monthStart : week;
  const last = monthMode ? monthEnd : addDays(6, week);
  const shownDay = picked ?? (today >= localDate(first) && today <= localDate(last) ? today : localDate(first));

  const monthCells: (Date | null)[] = [
    ...Array.from({ length: isoWeekday(monthStart) - 1 }, () => null),
    ...Array.from({ length: monthEnd.getDate() }, (_, i) => addDays(i, monthStart)),
  ];
  while (monthCells.length % 7) monthCells.push(null);
  const weekRows: (Date | null)[][] =
    rows === 'week' ? [Array.from({ length: 7 }, (_, i) => addDays(i, week))] : Array.from({ length: monthCells.length / 7 }, (_, i) => monthCells.slice(i * 7, i * 7 + 7));
  if (rows === 'week') weekBefore.current = localDate(week);
  // Die Woche, die schon zu sehen war, bleibt stehen; die anderen Zeilen fallen heraus bzw. klappen ein
  const rowKey = (r: (Date | null)[]) => localDate(weekStart(r.find(Boolean) as Date));

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
      <Animated.View
        style={[styles.calGrid, slideStyle]}
        {...pan.panHandlers}
        accessible={false}
        accessibilityActions={[
          { name: 'increment', label: t(monthMode ? 'Nächster Monat' : 'Nächste Woche') },
          { name: 'decrement', label: t(monthMode ? 'Voriger Monat' : 'Vorige Woche') },
        ]}
        onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <View style={styles.calRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Text key={`h${d}`} noTranslate style={styles.calWeekday}>
              {weekdayShort(d)}
            </Text>
          ))}
        </View>
        {weekRows.map((r, i) => {
          const key = rowKey(r);
          const kept = key === weekBefore.current;
          // Im Blatt fallen alle Tage, die Zeilen haben schon ihre Höhe (keine Bewegung des Layouts)
          const mode =
            variant === 'panel'
              ? entering
                ? 'enter'
                : 'static'
              : rows === 'closing'
                ? kept
                  ? 'static'
                  : 'leave'
                : rows === 'month' && entering && !kept
                  ? 'enter'
                  : 'static';
          return (
            <CalRow
              key={key}
              mode={mode}
              daysOnly={variant === 'panel'}
              delay={mode === 'enter' ? i * ROW_STAGGER : (weekRows.length - 1 - i) * ROW_STAGGER_OUT}
            >
              {r.map((d, j) =>
                d ? (
                  <CalDay
                    key={localDate(d)}
                    date={d}
                    col={j}
                    today={today}
                    days={days}
                    picked={picked === localDate(d)}
                    onPress={() => setPicked(picked === localDate(d) ? null : localDate(d))}
                  />
                ) : (
                  <View key={`e${j}`} style={styles.calCell} />
                ),
              )}
            </CalRow>
          );
        })}
      </Animated.View>
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
      <DayBar day={shownDay} today={today} days={days} list={list} events={events} saved={saved} />
    </View>
  );
}

const ROW_MS = 260;
const ROW_STAGGER = 55;
const ROW_STAGGER_OUT = 35;
/** Tage fallen einzeln heraus (Daria, 2026-11-14): je Spalte etwas später, dazu ein kleiner Zufall je Tag */
/** So lange federt ein Tag ungefähr, bis er ruhig liegt */
const DAY_MS = 650;
const DAY_STAGGER = 22;
const DAY_JITTER = 60;
/** So lange dauert das Herausfallen des ganzen Monats höchstens */
const MONTH_IN_MS = 6 * ROW_STAGGER + 6 * DAY_STAGGER + DAY_JITTER + DAY_MS;
const MONTH_OUT_MS = ROW_MS + 6 * ROW_STAGGER_OUT;

/** Was die Zeile ihren Tagen sagt: herausfallen, einklappen oder stehen, und ab wann */
const RowAnim = createContext<{ mode: 'static' | 'enter' | 'leave'; delay: number }>({ mode: 'static', delay: 0 });

/** Fester kleiner Zufall je Tag, damit die Tage unregelmäßig fallen, aber bei jedem Mal gleich */
function jitterOf(d: string, range: number): number {
  let h = 3;
  for (const c of d) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % range;
}

/** Eine Kalenderzeile, die herausfallen (enter) oder einklappen (leave) kann */
function CalRow({
  mode,
  delay,
  daysOnly = false,
  children,
}: {
  mode: 'static' | 'enter' | 'leave';
  delay: number;
  /** Nur die Tage bewegen sich, die Zeile hat sofort ihre Höhe */
  daysOnly?: boolean;
  children: ReactNode;
}) {
  const v = useRef(new Animated.Value(mode === 'enter' && !daysOnly ? 0 : 1)).current;
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (mode === 'static' || daysOnly) {
      v.setValue(1);
      return;
    }
    const anim = Animated.timing(v, { toValue: mode === 'enter' ? 1 : 0, duration: ROW_MS, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [mode, delay, daysOnly, v]);
  const style = useMemo(
    () =>
      mode === 'static' || daysOnly
        ? null
        : {
            height: v.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
          },
    [mode, daysOnly, v, height],
  );
  const ctx = useMemo(() => ({ mode, delay }), [mode, delay]);
  return (
    <Animated.View style={[mode === 'static' || daysOnly ? null : styles.calRowClip, style]}>
      <View style={styles.calRow} onLayout={(e) => setHeight((h) => (h === e.nativeEvent.layout.height ? h : e.nativeEvent.layout.height))}>
        <RowAnim.Provider value={ctx}>{children}</RowAnim.Provider>
      </View>
    </Animated.View>
  );
}

function CalDay({
  date,
  col = 0,
  today,
  days,
  picked,
  onPress,
}: {
  date: Date;
  col?: number;
  today: string;
  days: RoutineDays | null;
  picked: boolean;
  onPress: () => void;
}) {
  const [size, setSize] = useState(0);
  const d = localDate(date);
  // Herausfallen: von leicht oben und schräg, mit kleinem Nachfedern; Einklappen: nach oben weg (Daria, 2026-11-14)
  const row = useContext(RowAnim);
  const fall = useRef(new Animated.Value(row.mode === 'enter' ? 0 : 1)).current;
  useEffect(() => {
    if (row.mode === 'static') {
      fall.setValue(1);
      return;
    }
    const enter = row.mode === 'enter';
    // Herausfallen als Feder: landet und springt leicht nach (Daria, 2026-11-14: „slightly bouncy“)
    const anim = enter
      ? Animated.spring(fall, {
          toValue: 1,
          delay: row.delay + col * DAY_STAGGER + jitterOf(d, DAY_JITTER),
          friction: 5,
          tension: 140,
          useNativeDriver: Platform.OS !== 'web',
        })
      : Animated.timing(fall, {
          toValue: 0,
          duration: 180,
          delay: row.delay + jitterOf(d, 30),
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        });
    anim.start();
    return () => anim.stop();
  }, [row.mode, row.delay, col, d, fall]);
  const tilt = (jitterOf(d, 13) - 6) * 1.5;
  const fallStyle = useMemo(
    () =>
      row.mode === 'static'
        ? null
        : {
            opacity: fall.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' as const }),
            transform: [
              { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) },
              { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, '0deg'], extrapolate: 'clamp' as const }) },
            ],
          },
    [row.mode, fall, tilt],
  );
  const done = days?.done.has(d);
  const missed = !done && days?.missed.has(d);
  const isToday = d === today;
  const label = `${date.getDate()}${done ? `, ${t('geschafft')}` : missed ? `, ${t('ausgefallen')}` : ''}${isToday ? `, ${t('heute')}` : ''}`;
  return (
    <Pressable style={styles.calCell} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: picked }} accessibilityLabel={label}>
      <Animated.View
        onLayout={(e) => setSize(e.nativeEvent.layout.width)}
        style={[styles.calDay, done && styles.calDayDone, isToday && !done && styles.calDayToday, picked && styles.calDayPicked, fallStyle]}
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
      </Animated.View>
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
  // Platz für Schräge, Anheben und Hochziehen: Die Reihe reicht oben unter die Überschrift und unten etwas weiter,
  // ohne dass sich die Abstände ändern. Eine scrollbare Reihe schneidet sonst ab (Daria, 2026-11-13: „overflow sichtbar“).
  rowScroll: { marginHorizontal: -GUTTER, marginTop: -UP_ROOM, marginBottom: -space[12], overflow: 'visible' },
  row: { paddingHorizontal: GUTTER, paddingTop: UP_ROOM, paddingBottom: space[12], gap: space[12] },
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
  // Platz für den Sticker, der links unter dem Kater herausragt
  // Kater und Sticker als Spalte: Der Sticker hat eigenen Platz und liegt höchstens auf dem Ring
  katerSide: { alignSelf: 'flex-start' },
  chip: {
    backgroundColor: color.bg.screen,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 1,
  },
  chipBelow: { marginTop: -5 },
  chipAbove: { marginBottom: -5 },
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
  aside: { overflow: 'hidden' },
  dragFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.md, overflow: 'hidden' },
  dragFaceLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: space[24] },
  dragFaceLabel: { alignItems: 'center', gap: space[4] },
  dragFaceText: { ...text.listTitle },
  cardLifted: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

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
  // Derselbe Abstand wie zwischen den Gruppen (32, Daria, 2026-11-14)
  create: {},
  cal: { gap: space[8] },
  calHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[12],
  },
  calGrid: {},
  // Blatt über der Liste: deckt die Woche darunter ab, unten rund mit Schatten (Daria, 2026-11-14)
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space[20],
    paddingTop: space[4],
    paddingBottom: space[16],
    backgroundColor: color.bg.screen,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  // Fläche unter dem Blatt bis zum unteren Rand: Antippen klappt den Monat zu
  panelBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 4000 },
  // Abstand unter jeder Zeile statt Zeilenabstand, damit er beim Einklappen mitgeht
  calRow: { flexDirection: 'row', paddingBottom: space[6] },
  calRowClip: { overflow: 'hidden' },
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
