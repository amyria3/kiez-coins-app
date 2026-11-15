// Dringlichkeit und Reihenfolge der Routine-Karten, ohne Bedienung und Speicher (aus RoutineList, 2026-11-15).
import type { Reminder } from './reminders';
import { dueAt, goalOf } from './reminderDates';

/** Ruht: heute erledigt oder das Wochenziel erreicht */
export const restingOf = (r: Reminder) => r.doneToday || (!r.onDate && r.doneThisWeek >= goalOf(r));
export const isLater = (r: Reminder, now: Date, later: Record<string, number>) => (later[r.id] ?? 0) > now.getTime();

/** Dringend (Daria, 2026-11-13): offen, nicht „später“ und in höchstens einer Stunde fällig oder schon vorbei */
export function isUrgent(r: Reminder, now: Date, later: Record<string, number>): boolean {
  if (restingOf(r) || isLater(r, now, later)) return false;
  const due = dueAt(r, now);
  return !!due && due.getTime() - now.getTime() <= 60 * 60 * 1000;
}

export function sortByUrgency(list: Reminder[], now: Date, later: Record<string, number>): Reminder[] {
  const rank = (r: Reminder) => (restingOf(r) ? 3 : isLater(r, now, later) ? 2 : dueAt(r, now) ? 0 : 1);
  const time = (r: Reminder) => dueAt(r, now)?.getTime() ?? 0;
  return [...list].sort((a, b) => rank(a) - rank(b) || time(a) - time(b));
}
