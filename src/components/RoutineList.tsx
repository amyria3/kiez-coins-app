import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { Button } from './Button';
import { KaterCard, KaterRund } from './Content';
import { handShapePath } from './handShape';
import { Text } from './T';
import { addToMyCalendar, eventDate, eventTime, type CalendarEvent } from '../data/calendar';
import { dayName, goalText, katerFocus, katerLine, weekdayShort, whenText } from '../data/katerRoutine';
import { addDays, capitalize, goalOf, isoWeekday, kindOf, loadRoutineDays, localDate, weekStart, type Reminder, type RoutineDays } from '../data/reminders';
import { asSingleEvent, eventWhen, saveEvent, type ShowcaseEvent } from '../data/showcase';
import { localeTag, t, useTexts } from '../data/texts';
import { shareText } from '../lib/share';
import { color, font, space } from '../theme/tokens';

/**
 * Routine im Kiez-Look (Daria, 2026-11-12), nach der Vorlage „ListEasy“: oben der Kalender, darunter drei Gruppen
 * mit farbigen Karten, jede Gruppe waagerecht scrollbar, die Seite senkrecht.
 * Lila und Gelbgrün bleiben der Bedienung vorbehalten, die Karten haben eigene Farben.
 * Der Kater rechts oben zeigt den Stand; später als kurzes Video (wartet, freut sich, sauer …).
 * Entwürfe: Projektordner routine-karte/2026-11-12_*.png
 */

/** Kartenfarben (Daria, 2026-11-12): Senf, Olive hell, Puder */
const SENF = '#ECCF55';
const OLIVE = '#C6D195';
const PUDER = '#E6D6C0';
/** Schrift und Buttons auf den Karten */
const INK = '#1A1A1A';
const INK_SOFT = 'rgba(26, 26, 26, 0.68)';
const INK_TRACK = 'rgba(26, 26, 26, 0.16)';
const CHIP = 'rgba(26, 26, 26, 0.1)';
/** Kalender: Tage ohne Eintrag und die Schraffur für ausgefallene */
const DAY = 'rgba(251, 239, 242, 0.08)';
const HATCH = 'rgba(251, 239, 242, 0.16)';
const CARD_MAX = 292;
const GUTTER = space[20];

type Saved = ShowcaseEvent & { showcase: string };

export function RoutineList({
  list,
  events,
  saved,
  onDone,
  onEnd,
  onNew,
  onChanged,
}: {
  list: Reminder[];
  events: CalendarEvent[];
  saved: Saved[];
  onDone: (r: Reminder) => void;
  onEnd: (r: Reminder) => void;
  onNew: () => void;
  onChanged: () => void;
}) {
  const focus = list.length ? katerFocus(list) : undefined;
  // Aufgaben: wiederkehrende und einmalige „bis“; Termine: einmalige „um“ (Daria, 2026-11-10)
  const tasks = list.filter((r) => kindOf(r) !== 'termin');
  const termine = list.filter((r) => kindOf(r) === 'termin');
  const fixed = termine.filter((r) => r.required !== false);
  const optional = termine.filter((r) => r.required === false);
  const calendar = events.slice(0, 20);

  return (
    <>
      {/* Kater spricht wie im Feed als Sprechblase (Daria, 2026-11-11) */}
      {focus ? <KaterCard>{katerLine(focus)}</KaterCard> : null}
      <RoutineCalendar list={list} events={events} saved={saved} />
      {tasks.length ? (
        <Group title="Aufgaben" count={tasks.length}>
          {tasks.map((r) => (
            <TaskCard key={r.id} reminder={r} onDone={() => onDone(r)} onEnd={() => onEnd(r)} />
          ))}
        </Group>
      ) : null}
      {fixed.length || calendar.length ? (
        <Group title="Feste Termine" count={fixed.length + calendar.length}>
          {fixed.map((r) => (
            <TerminCard key={r.id} reminder={r} bg={OLIVE} onDone={() => onDone(r)} onEnd={() => onEnd(r)} />
          ))}
          {calendar.map((e) => (
            <CalendarCard key={e.id} event={e} />
          ))}
        </Group>
      ) : null}
      {optional.length || saved.length ? (
        <Group title="Das hast Du Dir vorgemerkt" count={optional.length + saved.length}>
          {optional.map((r) => (
            <TerminCard key={r.id} reminder={r} bg={PUDER} onDone={() => onDone(r)} onEnd={() => onEnd(r)} />
          ))}
          {saved.map((e) => (
            <SavedCard key={e.id} event={e} onChanged={onChanged} />
          ))}
        </Group>
      ) : null}
      <View style={styles.create}>
        <Button label="Neue Erinnerung" icon="plus" onPress={onNew} />
      </View>
    </>
  );
}

/** Überschrift mit Anzahl, darunter die Karten nebeneinander zum Wischen */
function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const { width } = useWindowDimensions();
  // Die nächste Karte schaut rechts ein Stück herein
  const cardWidth = Math.min(CARD_MAX, width - GUTTER * 2 - 48);
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {title}
        </Text>
        <Text noTranslate style={styles.groupCount}>
          {count}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + space[12]}
        decelerationRate="fast"
        style={styles.rowScroll}
        contentContainerStyle={styles.row}
      >
        {(Array.isArray(children) ? children.flat() : [children]).filter(Boolean).map((c, i) => (
          <View key={i} style={{ width: cardWidth }}>
            {c}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Stand des Katers auf der Karte, bis die Videos da sind als Wort neben dem Avatar */
type Mood = 'wartet' | 'freut sich' | 'sauer' | 'neugierig' | 'entspannt';

function moodOf(r: Reminder, now = new Date()): Mood {
  const goal = goalOf(r);
  if (r.doneToday || r.doneThisWeek >= goal) return 'freut sich';
  if (kindOf(r) === 'termin') return r.required === false ? 'neugierig' : 'wartet';
  if (r.onDate) return 'wartet';
  // Wiederkehrend: Reicht die Woche noch für das Ziel?
  const daysLeft = 8 - isoWeekday(now);
  const left = r.weekdays ? r.weekdays.filter((d) => d >= isoWeekday(now)).length : daysLeft;
  if (goal - r.doneThisWeek > left) return 'sauer';
  return r.weekdays && !r.weekdays.includes(isoWeekday(now)) ? 'entspannt' : 'wartet';
}

function Card({ bg, mood, share, children, onLongPress }: { bg: string; mood: Mood; share: string; children: ReactNode; onLongPress?: () => void }) {
  return (
    <Pressable
      onLongPress={onLongPress}
      accessibilityHint={onLongPress ? t('Lange drücken zum Beenden') : undefined}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{mood}</Text>
        </View>
        {/* Teilen über das Menü des Systems (Daria, 2026-11-12) */}
        <Pressable onPress={() => shareText(share)} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
          <Text style={styles.shareText}>Teilen</Text>
        </Pressable>
        <View style={styles.grow} />
        {/* Ring in der Farbe des Grunds (Daria, 2026-11-12) */}
        <View style={styles.katerRing}>
          <KaterRund size={60} />
        </View>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </Pressable>
  );
}

function TaskCard({ reminder: r, onDone, onEnd }: { reminder: Reminder; onDone: () => void; onEnd: () => void }) {
  const goal = goalOf(r);
  const done = Math.min(r.doneThisWeek, goal);
  const resting = r.doneToday || r.doneThisWeek >= goal;
  return (
    <Card
      bg={SENF}
      mood={moodOf(r)}
      onLongPress={onEnd}
      share={goal > 1 ? t('Ich will {want}. Diese Woche: {done} von {goal}.', { want: r.want, done, goal }) : t('Ich will {want}.', { want: r.want })}
    >
      <Text style={styles.meta}>{r.onDate ? whenText(r) : goalText(r)}</Text>
      <Text noTranslate style={styles.title} numberOfLines={2}>
        {capitalize(r.want)}
      </Text>
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
      {resting ? <Text style={styles.state}>{r.doneToday ? 'Heute erledigt' : 'Ziel erreicht'}</Text> : <Actions bg={SENF} onDone={onDone} onEnd={onEnd} />}
    </Card>
  );
}

function TerminCard({ reminder: r, bg, onDone, onEnd }: { reminder: Reminder; bg: string; onDone: () => void; onEnd: () => void }) {
  return (
    <Card bg={bg} mood={moodOf(r)} onLongPress={onEnd} share={`${capitalize(r.want)}, ${whenText(r)}`}>
      <Text style={styles.meta}>{whenText(r)}</Text>
      <Text noTranslate style={styles.title} numberOfLines={2}>
        {capitalize(r.want)}
      </Text>
      {r.doneToday ? <Text style={styles.state}>Erledigt</Text> : <Actions bg={bg} onDone={onDone} onEnd={onEnd} />}
    </Card>
  );
}

/** Termin aus einem verbundenen Kalender, nur zum Ansehen */
function CalendarCard({ event: e }: { event: CalendarEvent }) {
  const when = `${dayName(eventDate(e))} ${e.allDay ? t('ganztägig') : t('um {time}', { time: eventTime(e.start) })}`;
  return (
    <Card bg={OLIVE} mood="entspannt" share={`${e.title}, ${when}`}>
      <Text style={styles.meta}>{when}</Text>
      <Text noTranslate style={styles.title} numberOfLines={2}>
        {e.title}
      </Text>
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
    <Card bg={PUDER} mood={e.cancelled ? 'sauer' : 'neugierig'} share={[e.title, eventWhen(e), e.showcase, e.location].filter(Boolean).join(', ')}>
      <Text style={styles.meta}>{e.cancelled ? t('Abgesagt') : eventWhen(e)}</Text>
      <Text noTranslate style={[styles.title, e.cancelled && styles.struck]} numberOfLines={2}>
        {e.title}
      </Text>
      <Text noTranslate style={styles.sub} numberOfLines={1}>
        {e.location ? `${e.showcase} · ${e.location}` : e.showcase}
      </Text>
      <View style={styles.actions}>
        <HandButton label="Entfernen" onPress={remove} disabled={busy} />
        {e.cancelled ? null : <HandButton label="Kalender" onPress={toCalendar} filled bg={PUDER} />}
      </View>
    </Card>
  );
}

function Actions({ bg, onDone, onEnd }: { bg: string; onDone: () => void; onEnd: () => void }) {
  return (
    <View style={styles.actions}>
      <HandButton label="Beenden" onPress={onEnd} />
      <HandButton label="Erledigt" onPress={onDone} filled bg={bg} />
    </View>
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
      {picked ? <DayPanel day={picked} today={today} days={days} list={list} events={events} saved={saved} /> : null}
    </View>
  );
}

function CalDay({
  date,
  today,
  days,
  picked,
  onPress,
}: {
  date: Date;
  today: string;
  days: RoutineDays | null;
  picked: boolean;
  onPress: () => void;
}) {
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

/** Was an einem Tag war: geschafft, ausgefallen, Termine */
function DayPanel({
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
  const title = day === today ? t('Heute') : new Intl.DateTimeFormat(localeTag(), { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const done = days?.doneBy.get(day) ?? [];
  const missed = days?.missedBy.get(day) ?? [];
  // Fällig an dem Tag, noch offen: feste Wochentage ab heute, einmalige an ihrem Tag
  const open =
    day >= today
      ? list.filter((r) => !done.includes(r.want) && (r.onDate ? r.onDate === day : r.weekdays?.includes(isoWeekday(date)))).map((r) => capitalize(r.want))
      : [];
  const termine = [
    ...events.filter((e) => eventDate(e) === day).map((e) => (e.allDay ? e.title : `${eventTime(e.start)} ${e.title}`)),
    ...saved.filter((e) => localDate(new Date(e.startsAt)) === day).map((e) => `${eventTime(e.startsAt)} ${e.title}`),
  ];
  const rows: [string, string[]][] = [
    ['Geschafft', done.map(capitalize)],
    ['Ausgefallen', missed.map(capitalize)],
    ['Steht an', open],
    ['Termine', termine],
  ];
  const any = rows.some(([, items]) => items.length);
  return (
    <View style={styles.dayPanel} accessibilityLiveRegion="polite">
      <Text noTranslate style={styles.dayTitle}>
        {title}
      </Text>
      {any ? (
        rows.map(([label, items]) =>
          items.length ? (
            <View key={label} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{label}</Text>
              <Text noTranslate style={styles.dayItems}>
                {items.join(', ')}
              </Text>
            </View>
          ) : null,
        )
      ) : (
        <Text style={styles.dayItems}>An diesem Tag steht nichts an.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  share: { borderRadius: 20, borderWidth: 1, borderColor: INK_TRACK, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4, marginLeft: space[6] },
  shareText: { fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: INK },
  dayPanel: { marginTop: space[8], padding: space[16], borderRadius: 16, backgroundColor: DAY, gap: space[8] },
  dayTitle: { fontFamily: font.medium, fontSize: 17, lineHeight: 22, color: color.text.primary },
  dayRow: { gap: 2 },
  dayLabel: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.text.secondary },
  dayItems: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: color.text.primary },
  group: { gap: space[12] },
  groupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[12],
  },
  groupTitle: {
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 26,
    color: color.text.primary,
  },
  groupCount: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 20,
    color: color.text.secondary,
  },
  rowScroll: { marginHorizontal: -GUTTER },
  row: { paddingHorizontal: GUTTER, gap: space[12] },
  card: {
    flex: 1,
    minHeight: 300,
    borderRadius: 16,
    padding: 18,
    gap: space[8],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBody: { flex: 1, justifyContent: 'flex-end', gap: space[8] },
  chip: {
    backgroundColor: CHIP,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  chipText: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 17,
    color: INK,
  },
  katerRing: {
    borderRadius: 33,
    borderWidth: 3,
    borderColor: color.bg.screen,
    overflow: 'hidden',
  },
  meta: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 18,
    color: INK_SOFT,
  },
  title: {
    fontFamily: font.medium,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: INK,
  },
  struck: { textDecorationLine: 'line-through' },
  sub: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 18,
    color: INK_SOFT,
  },
  state: {
    fontFamily: font.medium,
    fontSize: 15,
    lineHeight: 20,
    color: INK_SOFT,
    paddingVertical: 11,
  },
  bar: { flexDirection: 'row', gap: space[4], marginVertical: 2 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: INK_TRACK },
  segmentDone: { backgroundColor: INK },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[8],
    marginTop: space[4],
  },
  hand: {
    height: 42,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[16],
  },
  handFilled: { minWidth: 124 },
  handLabel: { fontFamily: font.medium, fontSize: 16, lineHeight: 20 },
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
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
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
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 20,
    color: color.text.primary,
  },
  calNumDone: { color: INK, fontFamily: font.medium },
  calNumMissed: { color: color.text.secondary, opacity: 0.6 },
});
