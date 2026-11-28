import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { upcomingCalendarEvents } from './calendar';
import { sameKiez } from './location';
import { localDate } from './reminders';
import { useCalendarEnabled, useRoutineEnabled } from './routine';
import { groupShowcaseOn, savedEvents } from './showcase';
import { useStore } from './store';

/**
 * Zusammenfassung zum Feed in der rechten Spalte am Desktop (Daria, 2026-11-28): „in der Kiez-Ansicht oder in der
 * Gruppenansicht rechts eine Zusammenfassung für den jeweiligen Feed, daher Termine und offene Challenges“. Eigene
 * Termine stehen dort nicht, „höchstens eine dezente Erinnerung, dass heute um die und die Uhrzeit Termine anstehen“.
 */

/** Termin eines Schaufensters, wie ihn die Zusammenfassung zeigt */
export type FeedEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  showcaseId: string;
  showcase: string;
};

/** Welcher Feed: Kiez (öffentliche Schaufenster im eigenen Kiez), Überall (alle öffentlichen) oder eine Gruppe */
export type FeedScope = { kind: 'kiez'; kiez?: string } | { kind: 'everywhere' } | { kind: 'group'; groupId: string };

/** So weit schaut die Zusammenfassung voraus */
const DAYS_AHEAD = 30;
/** So viele Termine stehen höchstens in der Spalte */
export const SUMMARY_EVENTS = 5;

type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  showcase: { id: string; name: string; kiez: string | null; visibility: string; group_id: string } | null;
};

/**
 * Kommende Termine für einen Feed. Lesen darf, wer das Schaufenster sieht (Regel „Termine lesen“). Schaufenster, die
 * abgeschaltet sind (Feature `schaufenster` der Gruppe), fallen heraus, wie in der Schaufenster-Suche.
 */
export async function upcomingFeedEvents(scope: FeedScope, now = new Date()): Promise<FeedEvent[]> {
  const until = new Date(now.getTime() + DAYS_AHEAD * 86_400_000);
  let query = supabase
    .from('showcase_events')
    .select('id, title, starts_at, ends_at, location, showcase:showcases!inner(id, name, kiez, visibility, group_id)')
    .is('cancelled_at', null)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', until.toISOString())
    .order('starts_at', { ascending: true })
    .limit(60);
  query = scope.kind === 'group' ? query.eq('showcase.group_id', scope.groupId) : query.eq('showcase.visibility', 'public');
  const { data, error } = await query;
  if (error || !data) return [];
  let rows = (data as unknown as Row[]).filter((r) => !!r.showcase);
  if (scope.kind === 'kiez') {
    const mine = scope.kiez;
    // Ohne eigenen Kiez gibt es keinen Kiez-Feed der Termine
    if (!mine) return [];
    rows = rows.filter((r) => !!r.showcase!.kiez && sameKiez(r.showcase!.kiez, mine));
  }
  rows = rows.slice(0, SUMMARY_EVENTS * 3);
  const groupIds = [...new Set(rows.map((r) => r.showcase!.group_id))];
  const on = new Map(await Promise.all(groupIds.map(async (id) => [id, await groupShowcaseOn(id)] as const)));
  return rows
    .filter((r) => on.get(r.showcase!.group_id) === true)
    .slice(0, SUMMARY_EVENTS)
    .map((r) => ({
      id: r.id,
      title: r.title,
      startsAt: r.starts_at,
      endsAt: r.ends_at ?? undefined,
      location: r.location ?? undefined,
      showcaseId: r.showcase!.id,
      showcase: r.showcase!.name,
    }));
}

/** Beispieltermine für die Beispieldaten (Demo-Menü), damit die Spalte dort nicht leer ist */
function sampleEvents(scope: FeedScope, now: Date): FeedEvent[] {
  const at = (days: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  if (scope.kind === 'group') {
    return [{ id: 'demo-g1', title: 'Hofputz mit Kuchen', startsAt: at(2, 11), showcaseId: 'demo', showcase: 'Hausgemeinschaft' }];
  }
  return [
    { id: 'demo-1', title: 'Repair-Café', startsAt: at(1, 15), endsAt: at(1, 18), showcaseId: 'demo', showcase: 'Nachbarschaftsladen' },
    { id: 'demo-2', title: 'Laternenumzug', startsAt: at(3, 17), showcaseId: 'demo', showcase: 'Kinderladen Pusteblume' },
    { id: 'demo-3', title: 'Pflanzentausch im Hof', startsAt: at(6, 12), showcaseId: 'demo', showcase: 'Gemeinschaftsgarten' },
  ];
}

/** Termine für die Spalte; `null`, solange sie laden. Ohne `scope` (z. B. „Me & Myself“) keine. */
export function useFeedEvents(scope: FeedScope | null, enabled: boolean): FeedEvent[] | null {
  const { mode } = useStore();
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const key = scope ? `${scope.kind}:${scope.kind === 'group' ? scope.groupId : scope.kind === 'kiez' ? (scope.kiez ?? '') : ''}` : '';
  useEffect(() => {
    if (!enabled || !scope) {
      setEvents([]);
      return;
    }
    if (mode !== 'live') {
      setEvents(sampleEvents(scope, new Date()));
      return;
    }
    let alive = true;
    setEvents(null);
    upcomingFeedEvents(scope).then(
      (list) => alive && setEvents(list),
      () => alive && setEvents([]),
    );
    return () => {
      alive = false;
    };
    // `key` beschreibt `scope` vollständig
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, mode]);
  return events;
}

/** Eigene Termine heute, die noch kommen: Anzahl und Uhrzeit des nächsten (ISO), für die graue Zeile */
export type TodayOwn = { count: number; next?: string };

export function useOwnToday(enabled: boolean): TodayOwn | null {
  const { mode, currentUserId } = useStore();
  const routineOn = useRoutineEnabled();
  const calendarOn = useCalendarEnabled();
  const [own, setOwn] = useState<TodayOwn | null>(null);
  useEffect(() => {
    if (!enabled || mode !== 'live' || !routineOn || !currentUserId) {
      setOwn(null);
      return;
    }
    let alive = true;
    const now = new Date();
    const today = localDate(now);
    Promise.all([
      calendarOn ? upcomingCalendarEvents(1).catch(() => []) : Promise.resolve([]),
      savedEvents(currentUserId).catch(() => []),
    ]).then(([calendar, saved]) => {
      if (!alive) return;
      const times = [
        // Ganztägige zählen mit, haben aber keine Uhrzeit
        ...calendar.filter((e) => (e.allDay ? e.start.slice(0, 10) === today : localDate(new Date(e.start)) === today && new Date(e.start) > now)).map((e) => (e.allDay ? undefined : e.start)),
        ...saved.filter((e) => !e.cancelled && localDate(new Date(e.startsAt)) === today && new Date(e.startsAt) > now).map((e) => e.startsAt),
      ];
      const timed = times.filter((x): x is string => !!x).sort();
      setOwn({ count: times.length, next: timed[0] });
    });
    return () => {
      alive = false;
    };
  }, [enabled, mode, routineOn, calendarOn, currentUserId]);
  return own;
}
