import { useEffect, useMemo, useState } from 'react';

import { upcomingCalendarEvents, type CalendarEvent } from '../../data/calendar';
import { dayAgenda } from '../../data/dayAgenda';
import { useHiddenEvents } from '../../data/hiddenEvents';
import { addDays, loadReminders, localDate, type Reminder } from '../../data/reminders';
import { useCalendarEnabled } from '../../data/routine';
import { useRoutineData } from '../../data/routineView';
import { savedEvents } from '../../data/showcase';
import { useStore } from '../../data/store';
import { localeTag, t } from '../../data/texts';
import type { Saved } from './shared';

/** So weit liefert die Edge Function Termine aus verbundenen Kalendern (wie RoutineContent) */
const CALENDAR_DAYS = 60;
/** Mehr Termine stehen nicht in der Zeile, der Rest als „und 2 weitere“ */
const SHOWN = 3;

/**
 * Zeile unter dem Datumsfeld (Daria, 2026-11-26): der verstandene Tag und was dort schon ansteht, z. B.
 * „Mi., 2. Dezember · keine festen Termine“ oder „Mi., 2. Dezember · 2 Termine: 10:00 Zahnarzt, 18:30 Chor“.
 * Der ausgeschriebene Tag zeigt zugleich, wie „2.12“ verstanden wurde. Daten aus der Routine, wenn sie schon geladen
 * ist, sonst lädt das Formular sie selbst. `undefined` ohne gültigen Tag.
 */
export function useDayAgendaText(day: string | null, skipId?: string): string | undefined {
  const published = useRoutineData();
  const calendarOn = useCalendarEnabled();
  const hidden = useHiddenEvents();
  const { currentUserId } = useStore();
  const [own, setOwn] = useState<{ list: Reminder[]; events: CalendarEvent[]; saved: Saved[] } | null>(null);
  const needOwn = !published && !!day;
  useEffect(() => {
    if (!needOwn || own) return;
    let live = true;
    Promise.all([
      loadReminders().catch(() => null),
      calendarOn ? upcomingCalendarEvents(CALENDAR_DAYS).catch(() => []) : Promise.resolve([]),
      currentUserId ? savedEvents(currentUserId).catch(() => []) : Promise.resolve([]),
    ]).then(([list, events, saved]) => {
      if (live) setOwn({ list: list ?? [], events: events.filter((e) => !hidden.has(e.id)), saved });
    });
    return () => {
      live = false;
    };
  }, [needOwn, own, calendarOn, currentUserId, hidden]);
  const source = published ?? own;

  return useMemo(() => {
    if (!day) return undefined;
    const [y, m, d] = day.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const label = new Intl.DateTimeFormat(localeTag(), {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      ...(y !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    }).format(date);
    if (!source) return label;
    const { timed, untimed } = dayAgenda(day, source, skipId);
    const parts = [label];
    if (!timed.length) {
      // Hinter 60 Tagen kennt die App Termine aus verbundenen Kalendern noch nicht
      const beyond = calendarOn && day > localDate(addDays(CALENDAR_DAYS));
      parts.push(beyond ? t('noch keine festen Termine bekannt') : t('keine festen Termine'));
    } else {
      const items = timed.slice(0, SHOWN).map((e) => `${e.until ? t('bis {time}', { time: e.time }) : e.time} ${e.title}`);
      const more = timed.length - SHOWN;
      const list = items.join(', ') + (more > 0 ? ` ${t('und {n} weitere', { n: more })}` : '');
      parts.push(timed.length === 1 ? t('1 Termin: {list}', { list }) : t('{n} Termine: {list}', { n: timed.length, list }));
    }
    if (untimed.length) parts.push(untimed.length === 1 ? t('1 Aufgabe ohne Uhrzeit') : t('{n} Aufgaben ohne Uhrzeit', { n: untimed.length }));
    return parts.join(' · ');
  }, [day, source, skipId, calendarOn]);
}
