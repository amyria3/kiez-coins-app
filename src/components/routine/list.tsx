import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { eventDate, type CalendarEvent } from '../../data/calendar';
import { daySummary } from '../../data/daySummary';
import { useCardMotion } from '../../data/features';
import { allDoneLine, dayName } from '../../data/katerRoutine';
import { addDays, capitalize, kindOf, loadRoutineDays, localDate, type Reminder, type ReminderEnd } from '../../data/reminders';
import { localeTag, t } from '../../data/texts';
import { eventOver, isUrgent, restingOf, sortAgenda, sortByUrgency } from '../../data/urgency';
import { RoutineCalendarStages } from './calendar';
import { CalendarCard, EventCard, SavedCard, TaskCard } from './cards';
import { OLIVE, POWDER } from './constants';
import { Motion, PageLock, Saved, noLock, useLater, useNow } from './shared';
import { DayHead, DayStack } from './stack';
import { stackStyles, styles } from './styles';
import { setKaterLine, setRoutineDay, useRoutineDay } from '../../data/routineView';
import { useAccentColor } from '../../theme/signal';
import { Icon } from '../icons/Icon';
import { Text } from '../T';

type DayCards = { tasks: Reminder[]; fixed: Reminder[]; events: CalendarEvent[]; optional: Reminder[]; saved: Saved[] };

/** „Sa., 28.11.“ */
const shortDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(localeTag(), { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(y, m - 1, d));
};

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
  onEdit,
  onCopy,
  onUndo,
  onSkip,
  onUndoSkip,
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
  /** Bearbeiten über das Menü: „•••“ oder Tippen auf die Karte (Daria, 2026-11-13) */
  onEdit: (r: Reminder) => void;
  /** Kopie über „Neue Erinnerung“, vorausgefüllt (Daria, 2026-11-13) */
  onCopy: (r: Reminder) => void;
  /** Haken von heute zurücknehmen (Daria, 2026-11-18) */
  onUndo: (r: Reminder) => void;
  /** Einmal aussetzen und zurücknehmen, ohne Rückfrage (Daria, 2026-11-27, „Skip one“) */
  onSkip?: (r: Reminder) => void;
  onUndoSkip?: (r: Reminder) => void;
  onChanged: () => void;
  /** Karte angehoben: Seite nicht scrollen (Daria, 2026-11-13) */
  onDragLock?: (on: boolean) => void;
  /** Kalender in der Liste; im Feed liegt er hinter den Umschaltern (Daria, 2026-11-14) */
  showCalendar?: boolean;
}) {
  const motion = useCardMotion();
  const now = useNow();
  const { later, snooze } = useLater();
  // Sortiert nach Dringlichkeit (Daria, 2026-11-13): fällige nach Uhrzeit, dann ohne Uhrzeit, dann „später“, Erledigte zuletzt
  const sorted = sortByUrgency(list, now, later);
  const urgentOf = (r: Reminder) => isUrgent(r, now, later);

  // Ein Tag = ein Stapel (Daria, 2026-11-28), heute und die nächsten 6 Tage. Wiederkehrende Aufgaben liegen heute,
  // alles mit Datum an seinem Tag; Überfälliges liegt heute. Vergangene Kalendertermine fallen weg.
  const today = localDate(now);
  const lastDay = localDate(addDays(6, now));
  const dayOf = (date?: string) => (!date || date < today ? today : date);
  const inRange = (date: string) => date <= lastDay;
  // Gewählter Tag, geteilt mit dem Kalender (Daria, 2026-11-28: „Click auf den Tag öffnet den Tag“)
  const pickedDay = useRoutineDay();
  const cardDays = useMemo(() => {
    const days = new Map<string, DayCards>();
    const at = (date: string) => {
      let d = days.get(date);
      if (!d) days.set(date, (d = { tasks: [], fixed: [], events: [], optional: [], saved: [] }));
      return d;
    };
    for (const r of sorted) {
      const date = dayOf(r.onDate);
      if (!inRange(date)) continue;
      const termin = kindOf(r) === 'termin';
      if (!termin) at(date).tasks.push(r);
      else if (r.required === false) at(date).optional.push(r);
      else at(date).fixed.push(r);
    }
    for (const e of events) {
      const date = eventDate(e);
      if (date < today || !inRange(date) || eventOver(e, now)) continue;
      at(date).events.push(e);
    }
    for (const e of saved) {
      const date = dayOf(localDate(new Date(e.startsAt)));
      if (inRange(date)) at(date).saved.push(e);
    }
    at(today);
    // Im Kalender gewählter Tag bekommt einen Stapel, auch ohne Karten: Dort lässt sich gleich etwas anlegen
    if (pickedDay) at(pickedDay);
    return [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, events, saved, today, lastDay, now, pickedDay]);

  const index = Math.max(0, cardDays.findIndex(([d]) => d === (pickedDay ?? today)));
  const [date, cardsOfDay] = cardDays[index] ?? [today, undefined];
  // Richtung für das Hereinfliegen: späterer Tag von rechts, früherer von links
  const shownBefore = useRef(date);
  const enter: -1 | 0 | 1 = date === shownBefore.current ? 0 : date > shownBefore.current ? 1 : -1;
  useEffect(() => {
    shownBefore.current = date;
  }, [date]);
  const router = useRouter();
  const accent = useAccentColor();
  const isToday = date === today;
  const isPast = date < today;
  // Vergangener Tag: was geschafft wurde und was ausfiel, wie im Kalender (Daria, 2026-11-28: „If nothing is scheduled
  // why is the circle yellow“). Gelb im Kalender heißt geschafft; der Kater sagt jetzt auch, was.
  const [past, setPast] = useState<{ day: string; done: string[]; missed: string[] } | null>(null);
  useEffect(() => {
    if (!isPast) return;
    let live = true;
    const [y, m, d] = date.split('-').map(Number);
    const at = new Date(y, m - 1, d);
    loadRoutineDays(at, at, now).then(
      (days) => live && setPast({ day: date, done: (days.doneBy.get(date) ?? []).map(capitalize), missed: (days.missedBy.get(date) ?? []).map(capitalize) }),
      () => live && setPast({ day: date, done: [], missed: [] }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isPast]);
  const pastOfDay = isPast && past?.day === date ? past : undefined;

  const taskCard = (r: Reminder) => (
    <TaskCard key={`r:${r.id}`} reminder={r} onDone={() => onDone(r)} onGiveUp={() => onEnd(r, 'given_up')} onCancel={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} onUndo={() => onUndo(r)} onSkip={onSkip && (() => onSkip(r))} onUndoSkip={onUndoSkip && (() => onUndoSkip(r))} />
  );
  const eventCard = (r: Reminder, bg: string) => (
    <EventCard key={`r:${r.id}`} reminder={r} bg={bg} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} onUndo={() => onUndo(r)} />
  );
  // Reihenfolge im Stapel: offene Termine nach Uhrzeit, offene Aufgaben, Vorgemerktes, zuletzt Erledigtes
  const cards: ReactElement[] = [];
  let summary = '';
  if (cardsOfDay) {
    const d = cardsOfDay;
    const agenda = sortAgenda(d.fixed, d.events, now, later);
    const openAgenda = agenda.filter((i) => i.kind === 'event' || !restingOf(i.reminder));
    const doneAgenda = agenda.filter((i) => i.kind === 'reminder' && restingOf(i.reminder));
    const agendaCard = (i: (typeof agenda)[number]) =>
      i.kind === 'event' ? <CalendarCard key={`e:${i.event.id}`} event={i.event} /> : eventCard(i.reminder, OLIVE);
    cards.push(
      ...openAgenda.map(agendaCard),
      ...d.tasks.filter((r) => !restingOf(r)).map(taskCard),
      ...d.optional.map((r) => eventCard(r, POWDER)),
      ...d.saved.map((e) => <SavedCard key={`s:${e.id}`} event={e} onChanged={onChanged} />),
      ...d.tasks.filter(restingOf).map(taskCard),
      ...doneAgenda.map(agendaCard),
    );
    // Pille oben (Daria, 2026-11-28): „Du hast Dir vorgenommen: … Du hast heute außerdem ganze 3 Termine. WTF.“
    // Vergangener Tag: erst sprechen, wenn geladen ist, was geschafft wurde
    if (!isPast || pastOfDay) summary = daySummary(
      {
        day: dayName(date, now),
        today: isToday,
        tasks: d.tasks.filter((r) => !restingOf(r)).map((r) => capitalize(r.want)),
        dates: openAgenda.length + d.optional.filter((r) => !restingOf(r)).length + d.saved.filter((e) => !e.cancelled).length,
        past: pastOfDay,
      },
      t,
    );
  }
  // Heute nichts Offenes, aber Routinen da: alles erledigt (Daria, 2026-11-15)
  const katerText = summary || (isToday && list.length ? allDoneLine() : '');
  // Der Kater spricht in der ersten Stufe über dem Kalender (Daria, 2026-11-28), nicht mehr hier in der Liste
  useEffect(() => {
    setKaterLine(katerText);
  }, [katerText]);
  const dayLabel = isToday || date === localDate(addDays(1, now)) ? `${dayName(date, now)}, ${shortDate(date)}` : dayName(date, now);

  return (
    <Motion.Provider value={motion}>
    <PageLock.Provider value={onDragLock ?? noLock}>
      {showCalendar ? <RoutineCalendarStages list={list} events={events} saved={saved} /> : null}
      {cards.length || cardDays.length > 1 || pickedDay ? (
        <View style={stackStyles.wrap}>
          <DayHead label={dayLabel} index={index} count={cardDays.length} onDay={(i) => setRoutineDay(cardDays[i][0] === today ? null : cardDays[i][0])} />
          {/* Für den Tag gleich etwas planen, nicht für vergangene Tage (Daria, 2026-11-14 und 2026-11-28) */}
          {date >= today ? (
            <Pressable
              onPress={() => router.push({ pathname: '/routine/new', params: { tag: date } })}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.dayCreate, pressed && styles.pressed]}
            >
              <Icon name="plus" size={16} color={accent} />
              <Text style={[styles.dayCreateText, { color: accent }]}>
                {isToday ? t('Erinnerung für heute') : t('Erinnerung am {day}', { day: shortDate(date) })}
              </Text>
            </Pressable>
          ) : null}
          {cards.length ? (
            <DayStack key={date} cards={cards} enter={enter} />
          ) : (
            <Text style={styles.dayBar}>{t(isPast ? 'Keine Karten mehr für diesen Tag.' : 'Noch nichts an diesem Tag.')}</Text>
          )}
        </View>
      ) : null}
    </PageLock.Provider>
    </Motion.Provider>
  );
});

