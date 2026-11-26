// Was an einem Tag schon ansteht, ohne Speicher und Netz (Daria, 2026-11-26: „Ich sollte hier sehen, dass ich keine
// festen Termine habe, oder die Anzahl der Termine, ggf. mit Uhrzeit“). Für die Zeile unter dem Datumsfeld beim
// Anlegen einer Erinnerung. Gleiche Quellen wie die Tagesleiste im Kalender (components/routine/calendar.tsx):
// Erinnerungen, Termine aus verbundenen Kalendern und gespeicherte Termine aus Schaufenstern.
// Getestet in tests/dayAgenda.test.ts.
import { capitalize, END_OF_DAY, isoWeekday, localDate } from './reminderDates';

type ReminderLike = { id: string; want: string; onDate?: string; atTime?: string; untilTime?: string; weekdays?: number[] };
type EventLike = { title: string; start: string; allDay: boolean };
type SavedLike = { title: string; startsAt: string; cancelled?: boolean };

/** `time`: „10:00“ oder bei Fristen „bis 18:00“ (das „bis“ übersetzt die Anzeige) */
export type TimedItem = { time: string; until?: boolean; title: string };
export type DayAgenda = { timed: TimedItem[]; untimed: string[] };

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Feste Termine (mit Uhrzeit) nach Zeit sortiert und alles ohne Uhrzeit an diesem Tag. `skipId` lässt die Erinnerung
 * aus, die gerade bearbeitet wird. Abgesagte Schaufenster-Termine zählen nicht.
 */
export function dayAgenda(
  day: string,
  { list, events, saved }: { list: ReminderLike[]; events: EventLike[]; saved: SavedLike[] },
  skipId?: string,
): DayAgenda {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = isoWeekday(new Date(y, m - 1, d));
  const reminders = list.filter((r) => r.id !== skipId && (r.onDate ? r.onDate === day : !!r.weekdays?.includes(weekday)));
  // Frist „bis zu einem Tag“ (23:59) ist keine Uhrzeit
  const timeOf = (r: ReminderLike) => r.atTime ?? (r.untilTime && r.untilTime !== END_OF_DAY ? r.untilTime : undefined);
  const timed: TimedItem[] = [
    ...reminders
      .filter((r) => timeOf(r))
      .map((r) => ({ time: timeOf(r) as string, until: !r.atTime, title: capitalize(r.want) })),
    ...events.filter((e) => !e.allDay && localDate(new Date(e.start)) === day).map((e) => ({ time: hhmm(e.start), title: e.title })),
    ...saved
      .filter((e) => !e.cancelled && localDate(new Date(e.startsAt)) === day)
      .map((e) => ({ time: hhmm(e.startsAt), title: e.title })),
  ].sort((a, b) => a.time.padStart(5, '0').localeCompare(b.time.padStart(5, '0')));
  const untimed = [
    ...events.filter((e) => e.allDay && e.start.slice(0, 10) === day).map((e) => e.title),
    ...reminders.filter((r) => !timeOf(r)).map((r) => capitalize(r.want)),
  ];
  return { timed, untimed };
}
