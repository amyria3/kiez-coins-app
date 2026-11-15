import { memo } from 'react';
import { View } from 'react-native';

import { eventDate, type CalendarEvent } from '../../data/calendar';
import { useCardMotion } from '../../data/features';
import { katerFocus, katerLine } from '../../data/katerRoutine';
import { addDays, kindOf, localDate, type Reminder, type ReminderEnd } from '../../data/reminders';
import { Button } from '../Button';
import { KaterCard } from '../Content';
import { RoutineCalendar } from './calendar';
import { CalendarCard, EventCard, Group, SavedCard, TaskCard } from './cards';
import { OLIVE, POWDER } from './constants';
import { AsideWhenCalendar, Motion, PageLock, Saved, noLock, useLater, useNow } from './shared';
import { isUrgent, sortByUrgency } from '../../data/urgency';
import { styles } from './styles';

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
  const calendarEvents = sorted.filter((r) => kindOf(r) === 'termin');
  const fixed = calendarEvents.filter((r) => r.required !== false);
  const optional = calendarEvents.filter((r) => r.required === false);
  // Karten nur für die nächsten 7 Tage, der Kalender oben zeigt alle geladenen Termine (Daria, 2026-11-14)
  const lastCardDay = localDate(addDays(6, now));
  const calendar = events.filter((e) => eventDate(e) <= lastCardDay).slice(0, 20);

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
            <EventCard key={r.id} reminder={r} bg={OLIVE} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} />
          ))}
          {calendar.map((e) => (
            <CalendarCard key={e.id} event={e} />
          ))}
        </Group>
      ) : null}
      {optional.length || saved.length ? (
        <Group title="Das hast Du Dir vorgemerkt" count={optional.length + saved.length}>
          {optional.map((r) => (
            <EventCard key={r.id} reminder={r} bg={POWDER} onDone={() => onDone(r)} onEnd={() => onEnd(r, 'cancelled')} onEdit={() => onEdit(r)} onCopy={() => onCopy(r)} onDelete={() => onEnd(r, 'deleted')} onLater={() => snooze(r.id)} urgent={urgentOf(r)} onDragCancel={() => onEnd(r, 'cancelled', false)} onDragDelete={() => onEnd(r, 'deleted', false)} />
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

