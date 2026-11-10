import { t } from './texts';
import { dueToday, goalOf, isoWeekday, type Reminder } from './reminders';

/**
 * Was der Kater zu einer Erinnerung sagt (Daria, 2026-11-10): lustig wie bei Duolingo, nicht zu sachlich.
 * Der Titel steht nach „Ich will …“, daher passt er in „Du wolltest {want}“ in jeder Form.
 * Vorschläge von Claude, Daria ersetzt sie gern durch eigene.
 */
export function katerLine(r: Reminder, now = new Date()): string {
  const want = r.want;
  const goal = goalOf(r);
  const done = r.doneThisWeek;
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
  const pool = due.length ? due : list;
  return [...pool].sort((a, b) => goalOf(b) - b.doneThisWeek - (goalOf(a) - a.doneThisWeek))[0];
}

/** „4× pro Woche“ oder „Mo, Mi, Fr · 18:00“ */
export function goalText(r: Reminder): string {
  if (r.perWeek) return t('{n}× pro Woche', { n: r.perWeek });
  const days = (r.weekdays ?? []).map((d) => t(WEEKDAYS[d - 1])).join(', ');
  return r.atTime ? `${days} · ${r.atTime}` : days;
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
