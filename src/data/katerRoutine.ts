import { getLanguage, localeTag, t } from './texts';
import { addDays, dueToday, goalOf, isoWeekday, localDate, weekStart, type Reminder } from './reminders';

/**
 * Was der Kater zu einer Erinnerung sagt (Daria, 2026-11-10): lustig wie bei Duolingo, nicht zu sachlich.
 * Der Titel steht nach „Ich will …“, daher passt er in „Du wolltest {want}“ in jeder Form.
 * Vorschläge von Claude, Daria ersetzt sie gern durch eigene.
 */
export function katerLine(r: Reminder, now = new Date()): string {
  const want = r.want;
  const goal = goalOf(r);
  const done = r.doneThisWeek;
  if (r.onDate) {
    if (done) return t('Erledigt: {want}. Ich hab es mir aufgeschrieben, mit Sternchen.', { want });
    const when = whenText(r, now);
    const today = r.onDate === localDate(now);
    // Pflicht: Der Kater bleibt dran. Optional: Er stupst nur an (Daria, 2026-11-10).
    if (r.required === false)
      return today
        ? t('{when} könntest Du {want}. Kein Muss, nur ein Schnurren in Deine Richtung.', { when, want })
        : t('{when} könntest Du {want}. Wenn nicht, verrate ich es niemandem.', { when, want });
    return today
      ? t('Miau! {when} wolltest Du {want}. Das ist Pflicht, ich sitze hier und schaue auf die Uhr.', { when, want })
      : t('{when} willst Du {want}. Pflichttermin, ich stell schon mal den Wecker.', { when, want });
  }
  if (r.weekdays) {
    if (r.doneToday) return t('Heute schon erledigt: {want}. Leg die Pfoten hoch.', { want });
    if (!r.weekdays.includes(isoWeekday(now))) return t('Heute hast Du frei von {want}. Ich halte trotzdem Wache.', { want });
    if (r.atTime) return t('Miau! Vergiss nicht: Heute um {time} wolltest Du {want}.', { want, time: r.atTime });
    return t('Miau! Vergiss nicht: Heute wolltest Du {want}.', { want });
  }
  if (done >= goal) return t('{goal} von {goal}! Du wolltest {want}, und Du hast es durchgezogen. Ich schnurre.', { want, goal });
  if (done === 0) return t('Shshshsh, Du wolltest diese Woche {goal}× {want}. Ich sehe noch keinen einzigen Strich.', { want, goal });
  if (goal - done === 1) return t('Nur noch einmal {want}, dann gehört die Woche Dir. Ich hab schon die Brille geputzt.', { want });
  return t('{done} von {goal}! Du wolltest {want}, und es läuft. Noch {rest}×.', { want, goal, done, rest: goal - done });
}

/** Die Erinnerung, um die sich der Kater gerade kümmert: zuerst fällige, dann die mit dem meisten Rückstand */
export function katerFocus(list: Reminder[], now = new Date()): Reminder | undefined {
  const due = list.filter((r) => dueToday(r, now));
  // Pflichttermine vor optionalen
  const must = due.filter((r) => r.onDate && r.required !== false);
  const pool = must.length ? must : due.length ? due : list;
  return [...pool].sort((a, b) => goalOf(b) - b.doneThisWeek - (goalOf(a) - a.doneThisWeek))[0];
}

/** Einmalig: „Heute bis 18:00“, „Morgen um 9:00“, „Do, 12.11. von 9:00 bis 11:00“ */
export function whenText(r: Pick<Reminder, 'onDate' | 'atTime' | 'untilTime'>, now = new Date()): string {
  const day = dayName(r.onDate ?? '', now);
  if (r.atTime && r.untilTime) return t('{day} von {from} bis {until}', { day, from: r.atTime, until: r.untilTime });
  if (r.untilTime) return t('{day} bis {until}', { day, until: r.untilTime });
  if (r.atTime) return t('{day} um {at}', { day, at: r.atTime });
  return day;
}

/** „Heute“, „Morgen“ oder „Do, 12.11.“ für ein Datum „JJJJ-MM-TT“ */
export function dayName(date: string, now = new Date()): string {
  if (date === localDate(now)) return t('Heute');
  if (date === localDate(addDays(1, now))) return t('Morgen');
  const [y, m, d] = date.split('-').map(Number);
  const wd = isoWeekday(new Date(y, m - 1, d));
  return `${weekdayShort(wd)}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}

/** „4× pro Woche“, „Mo, Mi, Fr · 18:00“ oder „Morgen um 9:00“ */
export function goalText(r: Reminder): string {
  if (r.onDate) return `${whenText(r)} · ${r.required === false ? t('Optional') : t('Pflicht')}`;
  if (r.perWeek) return t('{n}× pro Woche', { n: r.perWeek });
  const days = (r.weekdays ?? []).map(weekdayShort).join(', ');
  return r.atTime ? `${days} · ${r.atTime}` : days;
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/**
 * Kurzer Tagesname, 1 = Montag … 7 = Sonntag. Deutsch aus WEEKDAYS, andere Sprachen vom System (Intl).
 * Die Kürzel taugen nicht als Übersetzungsschlüssel: „So“ und „Sa“ sind auch normale Wörter und kamen
 * als „So“, „Comme ça“ oder „Итак“ zurück (Daria, 2026-11-11).
 */
export function weekdayShort(day: number): string {
  if (getLanguage() === 'de') return WEEKDAYS[day - 1];
  try {
    // 2024-01-01 war ein Montag
    return new Intl.DateTimeFormat(localeTag(), { weekday: 'short' }).format(new Date(2024, 0, day));
  } catch {
    return WEEKDAYS[day - 1];
  }
}

/**
 * Stimmung des Katers auf der Routine-Karte (Daria, 2026-11-12), später als kurzes Video. Abgestuft statt gleich
 * „sauer“: Er wird erst unruhig, besorgt oder enttäuscht, wenn wirklich Tage verstrichen sind. Zählt erst ab dem
 * Tag, an dem die Erinnerung angelegt wurde.
 */
export type KaterMood =
  | 'freut sich'
  | 'zufrieden'
  | 'optimistisch'
  | 'chillig'
  | 'entspannt'
  | 'gelangweilt'
  | 'neugierig'
  | 'ungeduldig'
  | 'unruhig'
  | 'etwas besorgt'
  | 'sauer'
  | 'enttäuscht'
  | 'verzweifelt';

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function katerMood(r: Reminder, now = new Date()): KaterMood {
  const goal = goalOf(r);
  if (r.doneToday) return 'freut sich';
  if (r.doneThisWeek >= goal) return 'zufrieden';
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = localDate(now);

  // Einmalig: Termin „um“ oder Aufgabe „bis“
  if (r.onDate) {
    if (r.onDate > today) return r.required === false ? 'neugierig' : 'chillig';
    const at = r.untilTime ?? r.atTime;
    if (!at) return nowMin < 14 * 60 ? 'entspannt' : 'ungeduldig';
    const left = minutesOf(at) - nowMin;
    if (left < 0) return r.required === false ? 'gelangweilt' : 'enttäuscht';
    if (r.required === false) return 'neugierig';
    if (left <= 60) return 'unruhig';
    if (left <= 180) return 'ungeduldig';
    return 'entspannt';
  }

  // Wiederkehrend: erst ab Anlegen zählen
  const week0 = weekStart(now);
  const created = r.createdAt ? new Date(r.createdAt) : week0;
  const from = created > week0 ? created : week0;
  const fromDay = isoWeekday(from);
  const todayDay = isoWeekday(now);
  const doneBefore = r.doneThisWeek; // heute ist noch nichts erledigt (oben abgefangen)

  if (r.weekdays?.length) {
    const passed = r.weekdays.filter((d) => d >= fromDay && d < todayDay).length;
    const missed = Math.max(0, passed - doneBefore);
    const dueToday = r.weekdays.includes(todayDay);
    if (missed >= 4) return 'verzweifelt';
    if (missed === 3) return 'enttäuscht';
    if (missed === 2) return dueToday ? 'sauer' : 'enttäuscht';
    if (missed === 1) return 'etwas besorgt';
    if (!dueToday) return doneBefore > 0 ? 'optimistisch' : 'chillig';
    if (nowMin >= 20 * 60) return 'unruhig';
    if (nowMin >= 15 * 60) return 'ungeduldig';
    return doneBefore > 0 ? 'optimistisch' : 'entspannt';
  }

  // x-mal pro Woche: Wie viel Luft bleibt bis Sonntag?
  const daysLeft = 8 - todayDay;
  const possible = 8 - Math.max(fromDay, 1);
  const remaining = Math.min(goal, possible) - doneBefore;
  const slack = daysLeft - remaining;
  if (slack < 0) return remaining - daysLeft >= 2 ? 'verzweifelt' : 'enttäuscht';
  if (slack === 0) return nowMin >= 18 * 60 ? 'unruhig' : 'ungeduldig';
  if (doneBefore > 0) return 'optimistisch';
  if (slack >= 4) return 'gelangweilt';
  if (slack >= 2) return 'chillig';
  return 'entspannt';
}
