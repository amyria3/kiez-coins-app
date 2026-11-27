import { memo, useState } from 'react';

import { eventDate, type CalendarEvent } from '../../data/calendar';
import { useCardMotion } from '../../data/features';
import { allDoneLine, katerFocus, katerLine } from '../../data/katerRoutine';
import { addDays, kindOf, localDate, type Reminder, type ReminderEnd } from '../../data/reminders';
import { KaterCard } from '../Content';
import { RoutineCalendar } from './calendar';
import { CalendarCard, EventCard, Group, SavedCard, TaskCard } from './cards';
import { OLIVE, POWDER } from './constants';
import { AsideWhenCalendar, Motion, PageLock, Saved, noLock, useLater, useNow } from './shared';
import { isUrgent, sortAgenda, sortByUrgency } from '../../data/urgency';

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
  const focus = list.length ? katerFocus(list) : undefined;
  // Nur Routinen, die heute frei haben: alles erledigt (Daria, 2026-11-15)
  const katerText = focus ? katerLine(focus) : list.length ? allDoneLine() : '';
  const motion = useCardMotion();
  const now = useNow();
  const { later, snooze } = useLater();
  // Sortiert nach Dringlichkeit (Daria, 2026-11-13): fällige nach Uhrzeit, dann ohne Uhrzeit, dann „später“, Erledigte zuletzt
  const sorted = sortByUrgency(list, now, later);
  const urgentOf = (r: Reminder) => isUrgent(r, now, later);
  // Aufgaben: wiederkehrende und einmalige „bis“; Termine: einmalige „um“ (Daria, 2026-11-10)
  const tasks = sorted.filter((r) => kindOf(r) !== 'termin');
  const calendarEvents = sorted.filter((r) => kindOf(r) === 'termin');
  const fixed = calendarEvents.filter((r) => r.required !== false);
  const optional = calendarEvents.filter((r) => r.required === false);
  // Karten nur für die nächsten 7 Tage, der Kalender oben zeigt alle geladenen Termine (Daria, 2026-11-14)
  const lastCardDay = localDate(addDays(6, now));
  const calendar = events.filter((e) => eventDate(e) <= lastCardDay).slice(0, 20);
  // Erinnerungen und Kalendertermine in einer Reihe nach Beginn, Erledigte und Vergangene hinten (Daria, 2026-11-27)
  // Vergangene Kalendertermine gleiten beim Einblenden nach links hinaus (Daria, 2026-11-27)
  const [gone, setGone] = useState<string[]>([]);
  const agenda = sortAgenda(fixed, calendar, now, later).filter((i) => i.kind !== 'event' || !gone.includes(`e:${i.event.id}`));
  const leaving = agenda.flatMap((i) => (i.kind === 'event' && i.over ? [`e:${i.event.id}`] : []));
  const shownCount = agenda.length - leaving.length;

  return (
    <Motion.Provider value={motion}>
    <PageLock.Provider value={onDragLock ?? noLock}>
      {/* Kater spricht wie im Feed als Sprechblase (Daria, 2026-11-11) */}
      {katerText ? (
        <AsideWhenCalendar>
          <KaterCard>{katerText}</KaterCard>
        </AsideWhenCalendar>
      ) : null}
      {showCalendar ? <RoutineCalendar list={list} events={events} saved={saved} /> : null}
      {tasks.length ? (
        <Group title="Aufgaben" count={tasks.length}>
          {tasks.map((r) => (
            <TaskCard key={r.id} reminder={r} onDone={() => onDone(r)} onGiveUp={() => onEnd(r, 'given_up')} onCancel={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} onUndo={() => onUndo(r)} onSkip={onSkip && (() => onSkip(r))} onUndoSkip={onUndoSkip && (() => onUndoSkip(r))} />
          ))}
        </Group>
      ) : null}
      {agenda.length ? (
        <Group title="Feste Termine" count={shownCount} leaving={leaving} onGone={(key) => setGone((g) => [...g, key])}>
          {agenda.map((item) =>
            item.kind === 'event' ? (
              <CalendarCard key={`e:${item.event.id}`} event={item.event} />
            ) : (
              <EventCard key={`r:${item.reminder.id}`} reminder={item.reminder} bg={OLIVE} onDone={() => onDone(item.reminder)} onEnd={() => onEnd(item.reminder, 'cancelled')} onEdit={() => onEdit(item.reminder)} onCopy={() => onCopy(item.reminder)} onDelete={() => onEnd(item.reminder, 'deleted')} onLater={() => snooze(item.reminder.id)} urgent={urgentOf(item.reminder)} onDragCancel={() => onEnd(item.reminder, 'cancelled', false)} onDragDelete={() => onEnd(item.reminder, 'deleted', false)} onUndo={() => onUndo(item.reminder)} />
            ),
          )}
        </Group>
      ) : null}
      {optional.length || saved.length ? (
        <Group title="Das hast Du Dir vorgemerkt" count={optional.length + saved.length}>
          {optional.map((r) => (
            <EventCard key={r.id} reminder={r} bg={POWDER} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} onUndo={() => onUndo(r)} />
          ))}
          {saved.map((e) => (
            <SavedCard key={e.id} event={e} onChanged={onChanged} />
          ))}
        </Group>
      ) : null}
    </PageLock.Provider>
    </Motion.Provider>
  );
});

