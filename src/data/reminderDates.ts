// Reine Datums- und Zähl-Logik der Erinnerungen, ohne Speicher und Netz (aus reminders.ts, 2026-11-15).
// So lässt sie sich ohne App testen (tests/reminderDates.test.ts).
import type { Reminder } from './reminders';

/** Montag 0:00 dieser Woche, Ortszeit */
export function weekStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
export const dayStart = (now = new Date()) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
};
/** 1 = Montag … 7 = Sonntag */
export const isoWeekday = (d = new Date()) => ((d.getDay() + 6) % 7) + 1;

/**
 * Art einer einmaligen Erinnerung (Daria, 2026-11-10): „um“ ist ein Termin, „bis“ und „von … bis“ sind eine Aufgabe.
 * Wiederkehrende haben keine Art.
 */
export type ReminderKind = 'termin' | 'aufgabe';
export const kindOf = (r: Pick<Reminder, 'onDate' | 'atTime' | 'untilTime'>): ReminderKind | undefined =>
  !r.onDate ? undefined : r.atTime && !r.untilTime ? 'termin' : 'aufgabe';

export const goalOf = (r: Pick<Reminder, 'perWeek' | 'weekdays' | 'onDate'>) => (r.onDate ? 1 : r.perWeek ?? r.weekdays?.length ?? 1);

/** Ab so vielen Tagen Puffer bleibt eine Aufgabe „x-mal pro Woche“ hinten und der Kater locker (Daria, 2026-11-16) */
export const RELAXED_SLACK = 2;

/** x-mal pro Woche: Tage, die in dieser Woche übrig bleiben (heute mitgezählt), minus wie oft sie noch dran ist */
export const slackOf = (r: Pick<Reminder, 'perWeek' | 'weekdays' | 'onDate' | 'doneThisWeek'>, now = new Date()) =>
  8 - isoWeekday(now) - (goalOf(r) - r.doneThisWeek);

/**
 * Hat diese Aufgabe noch Zeit (Daria, 2026-11-16: „sollte nicht schon am Anfang der Woche vorn stehen“)?
 * Nur „x-mal pro Woche“, noch nicht geschafft, mindestens zwei Tage Puffer und der Lieblingstag noch nicht erreicht.
 */
export function isRelaxed(r: Reminder, now = new Date()): boolean {
  if (!r.perWeek || r.onDate || r.weekdays?.length || r.doneThisWeek >= goalOf(r)) return false;
  if (r.preferredDay && isoWeekday(now) >= r.preferredDay) return false;
  return slackOf(r, now) >= RELAXED_SLACK;
}

/** Ortsdatum als „JJJJ-MM-TT“ */
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (n: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
};

/** Fällig heute: feste Tage, wenn heute einer ist; x-mal pro Woche, solange das Ziel nicht erreicht ist */
export function dueToday(r: Reminder, now = new Date()): boolean {
  if (r.doneToday) return false;
  if (r.onDate) return r.onDate === localDate(now) && r.doneThisWeek === 0;
  if (r.weekdays) return r.weekdays.includes(isoWeekday(now));
  return r.doneThisWeek < goalOf(r);
}

/**
 * Wann eine Erinnerung fällig ist (Daria, 2026-11-13): einmalige zum „bis“ oder „um“, feste Tage zur Uhrzeit am
 * nächsten dieser Tage (heute nur, wenn noch nicht erledigt). Ohne Uhrzeit und bei x-mal pro Woche `null`.
 */
export function dueAt(r: Reminder, now = new Date()): Date | null {
  const at = (day: Date, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  };
  if (r.onDate) {
    const time = r.untilTime ?? r.atTime;
    if (!time) return null;
    const [y, mo, d] = r.onDate.split('-').map(Number);
    return at(new Date(y, mo - 1, d), time);
  }
  const dayTime = r.untilTime ?? r.atTime;
  if (r.weekdays?.length && dayTime) {
    for (let i = 0; i < 8; i++) {
      if (i === 0 && r.doneToday) continue;
      const day = addDays(i, now);
      if (r.weekdays.includes(isoWeekday(day))) return at(day, dayTime);
    }
  }
  return null;
}

/** Markierung im Post: „Joggen gehen 2/4“ */
export const routineLabel = (r: Reminder, doneAfter = r.doneThisWeek + 1) =>
  `${capitalize(r.want)} ${Math.min(doneAfter, goalOf(r))}/${goalOf(r)}`;

/** „joggen gehen“ → „Joggen gehen“, für Titel und Markierung */
export const capitalize = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

/** „9:00“ oder „18:30“ */
export const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Ohne Uhrzeit im Feld „Bis“: Die Frist endet mit dem Tag (Daria, 2026-11-16) */
export const END_OF_DAY = '23:59';

/**
 * Feld „Bis“ bei einmaligen Erinnerungen (Daria, 2026-11-16: „ich hätte hier gern den Tag eingegeben“):
 * „18:00“, „22.11.“ oder „22.11. 18:00“. `date` nur mit Tag, `time` nur mit Uhrzeit. `null`, wenn nichts davon passt.
 */
export function parseUntil(value: string, now = new Date()): { date?: string; time?: string } | null {
  const v = value.trim();
  if (TIME.test(v)) return { time: v };
  const m = v.match(/^(\S+?)(?:,?\s+(?:um\s+)?(\S+))?$/);
  if (!m) return null;
  const date = parseDate(m[1], now);
  if (!date) return null;
  if (!m[2]) return { date };
  return TIME.test(m[2]) ? { date, time: m[2] } : null;
}

/**
 * Datum, wie man es tippt: „2.12“, „2.12.“, „02.12.“, „24.12.26“ oder „24.12.2026“ → „2026-12-24“; ohne Jahr der
 * nächste solche Tag ab heute. Komma oder Schrägstrich statt Punkt gehen auch (Daria, 2026-11-26: Zahlentastaturen
 * bieten oft nur das Komma an).
 */
const DATE = /^(\d{1,2})[.,/](\d{1,2})(?:[.,/](\d{2}|\d{4})?)?$/;
export function parseDate(value: string, now = new Date()): string | null {
  const m = value.trim().match(DATE);
  if (!m) return null;
  const [d, mo] = [Number(m[1]), Number(m[2])];
  const today = localDate(now);
  const valid = (year: number) => {
    const c = new Date(year, mo - 1, d);
    return c.getMonth() === mo - 1 && c.getDate() === d ? localDate(c) : null;
  };
  if (m[3]) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const date = valid(year);
    return date && date >= today ? date : null;
  }
  // Ohne Jahr: dieses Jahr, sonst nächstes, sonst bis zum nächsten Schaltjahr (29.02.)
  for (let year = now.getFullYear(); year <= now.getFullYear() + 4; year++) {
    const date = valid(year);
    if (date && date >= today) return date;
  }
  return null;
}

/**
 * Warum ein Datum nicht geht (Daria, 2026-11-26: ruhige Meldung statt stiller Übernahme): `past`, wenn der Tag mit
 * Jahr schon vorbei ist, `format` bei allem anderen, `null`, wenn es passt oder das Feld leer ist.
 */
export function dateIssue(value: string, now = new Date()): 'past' | 'format' | null {
  const v = value.trim();
  if (!v || parseDate(v, now)) return null;
  const m = v.match(DATE);
  if (m?.[3]) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const c = new Date(year, Number(m[2]) - 1, Number(m[1]));
    if (c.getMonth() === Number(m[2]) - 1 && c.getDate() === Number(m[1])) return 'past';
  }
  return 'format';
}

/** Noch unfertig getippt („2“, „2.“, „2.1“, „2.12.20“): beim Tippen noch keine Fehlermeldung */
export const datePartial = (value: string) => /^\d{1,2}(?:[.,/](?:\d{1,2}(?:[.,/]\d{0,4})?)?)?$/.test(value.trim());
