import { t } from './texts';
import { addDays, dueToday, goalOf, isoWeekday, localDate, type Reminder } from './reminders';

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

function dayName(date: string, now: Date): string {
  if (date === localDate(now)) return t('Heute');
  if (date === localDate(addDays(1, now))) return t('Morgen');
  const [y, m, d] = date.split('-').map(Number);
  const wd = isoWeekday(new Date(y, m - 1, d));
  return `${t(WEEKDAYS[wd - 1])}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}

/** „4× pro Woche“, „Mo, Mi, Fr · 18:00“ oder „Morgen um 9:00“ */
export function goalText(r: Reminder): string {
  if (r.onDate) return `${whenText(r)} · ${r.required === false ? t('Optional') : t('Pflicht')}`;
  if (r.perWeek) return t('{n}× pro Woche', { n: r.perWeek });
  const days = (r.weekdays ?? []).map((d) => t(WEEKDAYS[d - 1])).join(', ');
  return r.atTime ? `${days} · ${r.atTime}` : days;
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
