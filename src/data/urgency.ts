// Dringlichkeit und Reihenfolge der Routine-Karten, ohne Bedienung und Speicher (aus RoutineList, 2026-11-15).
import type { Reminder } from './reminders';
import { dueAt, goalOf, isRelaxed, slackOf } from './reminderDates';

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
 * Reihenfolge: heute mit Uhrzeit oder Frist, dann offene ohne Uhrzeit, dann Aufgaben mit viel Puffer in der Woche
 * (Daria, 2026-11-16), dann „später“, dann ruhende. Mit Puffer: wenig Puffer zuerst.
 */
export function sortByUrgency(list: Reminder[], now: Date, later: Record<string, number>): Reminder[] {
  const rank = (r: Reminder) =>
    restingOf(r) ? 4 : isLater(r, now, later) ? 3 : dueAt(r, now) ? 0 : isRelaxed(r, now) ? 2 : 1;
  const time = (r: Reminder) => dueAt(r, now)?.getTime() ?? 0;
  const slack = (r: Reminder) => (isRelaxed(r, now) ? slackOf(r, now) : 0);
  return [...list].sort((a, b) => rank(a) - rank(b) || time(a) - time(b) || slack(a) - slack(b));
}
