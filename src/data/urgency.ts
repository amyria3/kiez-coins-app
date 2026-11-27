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

type EventLike = { start: string; end?: string; allDay: boolean; title?: string };

/**
 * Uhrzeit im Titel eines ganztägigen Termins (Daria, 2026-11-27: „Josef bei Polina um 16.00“): „um 16.00“, „ab 9:30“,
 * „16:00“, „16.00 Uhr“ oder „16 Uhr“ → Minuten ab Mitternacht. Ein Datum wie „02.12.“ zählt nicht.
 */
export function titleTime(title: string): number | null {
  const m =
    title.match(/\b(?:um|ab|at|from)\s+([01]?\d|2[0-3])[.:]([0-5]\d)(?![.\d])/i) ??
    title.match(/(?<![\d.])([01]?\d|2[0-3]):([0-5]\d)(?![.\d])/) ??
    title.match(/(?<![\d.])([01]?\d|2[0-3])(?:[.:]([0-5]\d))?\s*Uhr\b/i);
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : null;
}

/** Ohne Ende gilt ein Termin eine Stunde lang */
const DEFAULT_LENGTH = 60 * 60 * 1000;

/**
 * Kalendertermin vorbei (Daria, 2026-11-27): mit Uhrzeit am Ende, ohne Ende eine Stunde nach Beginn. Ganztägige
 * gelten bis Mitternacht; nennt der Titel eine Uhrzeit, eine Stunde nach dieser Uhrzeit. Mehrtägige, die vor heute
 * beginnen, zeigt die Liste nicht.
 */
export function eventOver(e: EventLike, now: Date): boolean {
  if (!e.allDay) {
    const end = e.end ? new Date(e.end).getTime() : new Date(e.start).getTime() + DEFAULT_LENGTH;
    return end <= now.getTime();
  }
  const day = new Date(`${e.start.slice(0, 10)}T00:00:00`);
  const minutes = e.title ? titleTime(e.title) : null;
  const end = minutes != null ? day.getTime() + minutes * 60_000 + DEFAULT_LENGTH : addDays(1, day).getTime();
  return end <= now.getTime();
}

export type AgendaItem<E> = { kind: 'reminder'; reminder: Reminder } | { kind: 'event'; event: E; over: boolean };

/**
 * Reihe „Feste Termine“ (Daria, 2026-11-27): Termine aus Erinnerungen und aus verbundenen Kalendern in einer Reihe,
 * nach Beginn. Vorn stehen offene, dann „später“, hinten erledigte Termine. Vergangene Kalendertermine stehen ganz
 * vorn: Die Liste zieht sie beim Einblenden nach links heraus (`over`).
 */
export function sortAgenda<E extends EventLike>(reminders: Reminder[], events: E[], now: Date, later: Record<string, number>): AgendaItem<E>[] {
  const eventStart = (e: E) => (e.allDay ? new Date(`${e.start.slice(0, 10)}T00:00:00`) : new Date(e.start)).getTime();
  const keyed = [
    ...reminders.map((r) => ({
      item: { kind: 'reminder', reminder: r } as AgendaItem<E>,
      group: restingOf(r) ? 3 : isLater(r, now, later) ? 2 : 1,
      time: dueAt(r, now)?.getTime() ?? 0,
    })),
    ...events.map((e) => {
      const over = eventOver(e, now);
      return { item: { kind: 'event', event: e, over } as AgendaItem<E>, group: over ? 0 : 1, time: eventStart(e) };
    }),
  ];
  return keyed.sort((a, b) => a.group - b.group || a.time - b.time).map((k) => k.item);
}
