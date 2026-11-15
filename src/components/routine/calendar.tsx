import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { eventDate, eventTime, type CalendarEvent } from '../../data/calendar';
import { weekdayShort } from '../../data/katerRoutine';
import { addDays, capitalize, isoWeekday, loadRoutineDays, localDate, weekStart, type Reminder, type RoutineDays } from '../../data/reminders';
import { setCalendarMonth, useCalendarMonth, useRoutineData } from '../../data/routineView';
import { localeTag, t } from '../../data/texts';
import { useAccentColor } from '../../theme/signal';
import { Icon } from '../icons/Icon';
import { Text } from '../T';
import { HATCH } from './constants';
import { Saved } from './shared';
import { styles } from './styles';

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
  // Das Blatt erscheint oft genau unter dem Finger, der es gerade aufgezogen hat. Das Loslassen darf es nicht gleich
  // wieder schließen (Daria, 2026-11-14: „Animation begann und brach dann selbst ab“): Nur ein Tippen, das auf der
  // Fläche begonnen hat, und frühestens kurz nach dem Öffnen zählt.
  const openedAt = useRef(0);
  const armed = useRef(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      openedAt.current = Date.now();
      armed.current = false;
    }
    fade.stopAnimation();
    Animated.timing(fade, {
      toValue: open ? 1 : 0,
      duration: open ? 240 : 220,
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
        onPressIn={() => {
          armed.current = Date.now() - openedAt.current > 400;
        }}
        onPress={() => {
          if (armed.current) setCalendarMonth(false);
          armed.current = false;
        }}
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
  const router = useRouter();
  const accent = useAccentColor();
  // Kurz nach dem Erscheinen zählt kein Tippen: Das Loslassen des Fingers, der das Blatt aufgezogen hat, landet sonst
  // auf dem Monat und klappt ihn gleich wieder zu (Daria, 2026-11-14)
  const shownAt = useRef(Date.now());
  const settled = () => Date.now() - shownAt.current > 400;
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
        onPress={() => settled() && setOpen(!open)}
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
              index={i}
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
                    onPress={() => settled() && setPicked(picked === localDate(d) ? null : localDate(d))}
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
      {/* Für den gewählten Tag gleich etwas planen (Daria, 2026-11-14: „Da fehlt der Button zum Erstellen“); nicht für
          vergangene Tage */}
      {shownDay >= today ? (
        <Pressable
          onPress={() => {
            setCalendarMonth(false);
            router.push({ pathname: '/routine/new', params: { tag: shownDay } });
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.dayCreate, pressed && styles.pressed]}
        >
          <Icon name="plus" size={16} color={accent} />
          <Text style={[styles.dayCreateText, { color: accent }]}>
            {shownDay === today ? t('Erinnerung für heute') : t('Erinnerung am {day}', { day: dayLabel(shownDay) })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** „Fr. 27.11.“ für den Knopf unter dem Kalender */
function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(localeTag(), { weekday: 'short', day: 'numeric', month: 'numeric' }).format(new Date(y, m - 1, d));
}

const ROW_MS = 260;
// Etwas mehr Zeit für alles (Daria, 2026-11-14: „give everything a little time“)
const ROW_STAGGER = 85;
const ROW_STAGGER_OUT = 35;
/** Tage fallen einzeln heraus (Daria, 2026-11-14): je Spalte etwas später, dazu ein kleiner Zufall je Tag */
/** So lange federt ein Tag ungefähr, bis er ruhig liegt */
const DAY_MS = 900;
const DAY_STAGGER = 35;
const DAY_JITTER = 100;
/** So lange dauert das Herausfallen des ganzen Monats höchstens */
const MONTH_IN_MS = 6 * ROW_STAGGER + 6 * DAY_STAGGER + DAY_JITTER + DAY_MS;
const MONTH_OUT_MS = ROW_MS + 6 * ROW_STAGGER_OUT;

/** Was die Zeile ihren Tagen sagt: herausfallen, einklappen oder stehen, und ab wann */
const RowAnim = createContext<{ mode: 'static' | 'enter' | 'leave'; delay: number; index: number }>({ mode: 'static', delay: 0, index: 0 });
/** Fallhöhe: von oberhalb des Kalenders, je tiefer die Zeile, desto weiter (Daria, 2026-11-14: „von oben fallen“) */
const FALL_FROM = 70;
const FALL_PER_ROW = 52;

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
  index = 0,
  daysOnly = false,
  children,
}: {
  mode: 'static' | 'enter' | 'leave';
  delay: number;
  /** Nummer der Zeile, für die Fallhöhe */
  index?: number;
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
  const ctx = useMemo(() => ({ mode, delay, index }), [mode, delay, index]);
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
          friction: 5.5,
          tension: 80,
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
            // Früh sichtbar, damit man sie von oben fallen sieht
            opacity: fall.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' as const }),
            transform: [
              { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-(FALL_FROM + row.index * FALL_PER_ROW), 0] }) },
              { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, '0deg'], extrapolate: 'clamp' as const }) },
            ],
          },
    [row.mode, row.index, fall, tilt],
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

