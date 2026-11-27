// Dringlichkeit und Reihenfolge der Routine-Karten, ohne Bedienung und Speicher (aus RoutineList, 2026-11-15).
import type { Reminder } from './reminders';
import { addDays, dayStart, dueAt, dueToday, goalOf, isoWeekday, isRelaxed, localDate, slackOf } from './reminderDates';

/** Ruht: heute erledigt, heute ausgesetzt oder das Wochenziel erreicht */
export const restingOf = (r: Reminder) => r.doneToday || !!r.skippedToday || (!r.onDate && r.doneThisWeek >= goalOf(r));
export const isLater = (r: Reminder, now: Date, later: Record<string, number>) => (later[r.id] ?? 0) > now.getTime();

/** Dringend (Daria, 2026-11-13): offen, nicht „später“ und in höchstens einer Stunde fällig oder schon vorbei */
export function isUrgent(r: Reminder, now: Date, later: Record<string, number>): boolean {
  if (restingOf(r) || isLater(r, now, later)) return false;
  const due = dueAt(r, now);
  return !!due && due.getTime() - now.getTime() <= 60 * 60 * 1000;
}

/**
 * Steht nicht heute an (Daria, 2026-11-27: „Prüfe nochmal Reihenfolge der Termine“): einmalige an einem späteren Tag,
 * feste Tage, wenn heute keiner davon ist. Zeitpunkt zum Sortieren: Fälligkeit, sonst Beginn des Tages.
 */
function upcomingAt(r: Reminder, now: Date): number | null {
  if (restingOf(r)) return null;
  const endOfToday = addDays(1, dayStart(now)).getTime();
  const due = dueAt(r, now);
  if (due) return due.getTime() < endOfToday ? null : due.getTime();
  if (r.onDate) {
    if (r.onDate <= localDate(now)) return null;
    const [y, mo, d] = r.onDate.split('-').map(Number);
    return new Date(y, mo - 1, d).getTime();
  }
  if (!r.weekdays?.length || dueToday(r, now)) return null;
  for (let i = 1; i < 8; i++) {
    const day = addDays(i, dayStart(now));
    if (r.weekdays.includes(isoWeekday(day))) return day.getTime();
  }
  return null;
}

/**
 * Reihenfolge: heute mit Uhrzeit oder Frist, dann offene ohne Uhrzeit, dann Aufgaben mit viel Puffer in der Woche
 * (Daria, 2026-11-16), dann was erst an einem späteren Tag ansteht, nach Datum (Daria, 2026-11-27), dann „später“,
 * dann ruhende. Mit Puffer: wenig Puffer zuerst.
 */
export function sortByUrgency(list: Reminder[], now: Date, later: Record<string, number>): Reminder[] {
  const upcoming = new Map(list.map((r) => [r.id, upcomingAt(r, now)]));
  const rank = (r: Reminder) =>
    restingOf(r) ? 5 : isLater(r, now, later) ? 4 : upcoming.get(r.id) != null ? 3 : dueAt(r, now) ? 0 : isRelaxed(r, now) ? 2 : 1;
  const time = (r: Reminder) => upcoming.get(r.id) ?? dueAt(r, now)?.getTime() ?? 0;
  const slack = (r: Reminder) => (isRelaxed(r, now) ? slackOf(r, now) : 0);
  return [...list].sort((a, b) => rank(a) - rank(b) || time(a) - time(b) || slack(a) - slack(b));
}

type EventLike = { start: string; end?: string; allDay: boolean };
export type AgendaItem<E> = { kind: 'reminder'; reminder: Reminder } | { kind: 'event'; event: E };

/**
 * Reihe „Feste Termine“ (Daria, 2026-11-27): Termine aus Erinnerungen und aus verbundenen Kalendern in einer Reihe,
 * nach Beginn. Vorn stehen offene, dann „später“, hinten erledigte Termine und Kalendertermine, die schon vorbei sind.
 */
export function sortAgenda<E extends EventLike>(reminders: Reminder[], events: E[], now: Date, later: Record<string, number>): AgendaItem<E>[] {
  const eventStart = (e: E) => (e.allDay ? new Date(`${e.start.slice(0, 10)}T00:00:00`) : new Date(e.start)).getTime();
  // Ganztägige sind mit dem Tag vorbei; mehrtägige, die vor heute beginnen, zeigt die Liste nicht
  const eventEnd = (e: E) => (e.allDay ? addDays(1, new Date(eventStart(e))).getTime() : new Date(e.end ?? e.start).getTime());
  const keyed = [
    ...reminders.map((r) => ({
      item: { kind: 'reminder', reminder: r } as AgendaItem<E>,
      group: restingOf(r) ? 2 : isLater(r, now, later) ? 1 : 0,
      time: dueAt(r, now)?.getTime() ?? 0,
    })),
    ...events.map((e) => ({
      item: { kind: 'event', event: e } as AgendaItem<E>,
      group: eventEnd(e) <= now.getTime() ? 2 : 0,
      time: eventStart(e),
    })),
  ];
  return keyed.sort((a, b) => a.group - b.group || a.time - b.time).map((k) => k.item);
}
