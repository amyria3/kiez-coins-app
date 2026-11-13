import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';

/**
 * Erinnerungen (Routine, Daria, 2026-11-10). Antworten auf die Fragen: Übergabe/2026-11-07_offen_erinnerungen.md.
 * - „Ich will …“ plus Ergänzung (`want`), optional eine Beschreibung.
 * - Ziel x-mal pro Woche, feste Wochentage mit Uhrzeit oder einmal an einem Tag („heute bis 18:00“, „morgen um 9:00“,
 *   „morgen von 9:00 bis 11:00“, Migration 20261110000200).
 * - Der Kater meldet sich vorerst nur in der App, zwischen 8 und 20 Uhr höchstens dreimal am Tag.
 * Tabellen: Migration 20261110000100_erinnerungen.
 */
export type Reminder = {
  id: string;
  want: string;
  description?: string;
  perWeek?: number;
  /** 1 = Montag … 7 = Sonntag */
  weekdays?: number[];
  /** „HH:MM“: Uhrzeit bei festen Tagen, bei einmaligen „um“ bzw. „von“ */
  atTime?: string;
  /** Einmalig: Tag als „JJJJ-MM-TT“ */
  onDate?: string;
  /** Einmalig: „bis HH:MM“ */
  untilTime?: string;
  /** Einmalig: Pflicht oder optional (Daria, 2026-11-10) */
  required?: boolean;
  /** Angelegt am (ISO), für die Stimmung des Katers */
  createdAt?: string;
  /** Erledigt in dieser Woche (ab Montag) */
  doneThisWeek: number;
  doneToday: boolean;
};

export type ReminderInput = {
  want: string;
  description?: string;
  perWeek?: number;
  weekdays?: number[];
  atTime?: string;
  onDate?: string;
  untilTime?: string;
  required?: boolean;
};

type Row = {
  id: string;
  want: string;
  description: string | null;
  per_week: number | null;
  weekdays: number[] | null;
  at_time: string | null;
  on_date?: string | null;
  until_time?: string | null;
  required?: boolean | null;
  created_at?: string | null;
};

/** Montag 0:00 dieser Woche, Ortszeit */
export function weekStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
const dayStart = (now = new Date()) => {
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

/** Lädt die eigenen Erinnerungen. `null`, wenn die Migration fehlt oder etwas schiefgeht. */
export async function loadReminders(): Promise<Reminder[] | null> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .is('archived_at', null)
    .order('created_at');
  if (error || !data) return null;
  // Einmalige von gestern und früher fallen aus der Liste
  const today0 = localDate();
  const rows = (data as Row[]).filter((r) => !r.on_date || r.on_date >= today0);
  const since = weekStart();
  const today = dayStart();
  const { data: done } = rows.length
    ? await supabase
        .from('reminder_done')
        .select('reminder_id, done_at')
        .in('reminder_id', rows.map((r) => r.id))
        .gte('done_at', since.toISOString())
    : { data: [] as { reminder_id: string; done_at: string }[] };
  const doneRows = (done ?? []) as { reminder_id: string; done_at: string }[];
  return rows.map((r) => {
    const mine = doneRows.filter((d) => d.reminder_id === r.id);
    return {
      id: r.id,
      want: r.want,
      description: r.description ?? undefined,
      perWeek: r.per_week ?? undefined,
      weekdays: r.weekdays ?? undefined,
      atTime: r.at_time ? r.at_time.slice(0, 5) : undefined,
      onDate: r.on_date ?? undefined,
      untilTime: r.until_time ? r.until_time.slice(0, 5) : undefined,
      required: r.on_date ? r.required !== false : undefined,
      createdAt: r.created_at ?? undefined,
      doneThisWeek: mine.length,
      doneToday: mine.some((d) => new Date(d.done_at) >= today),
    };
  });
}

/**
 * Kalender in Routine (Daria, 2026-11-12): pro Tag, ob Du etwas erledigt hast und ob etwas ausgefallen ist.
 * Ausgefallen: Ein fester Wochentag einer Erinnerung ist vorbei, ohne dass sie an dem Tag erledigt wurde.
 * Zählt erst ab dem Tag, an dem die Erinnerung angelegt wurde, und nur bis sie beendet wurde.
 */
/** `doneBy`/`missedBy`: je Tag die Namen („want“) der Erinnerungen */
export type RoutineDays = {
  done: Set<string>;
  missed: Set<string>;
  doneBy: Map<string, string[]>;
  missedBy: Map<string, string[]>;
  /** Je Tag die Namen der Erinnerungen, die an dem Tag aufgegeben bzw. abgebrochen wurden (Daria, 2026-11-13) */
  givenUpBy: Map<string, string[]>;
  cancelledBy: Map<string, string[]>;
};
export async function loadRoutineDays(from: Date, to: Date, now = new Date()): Promise<RoutineDays> {
  const empty: RoutineDays = { done: new Set(), missed: new Set(), doneBy: new Map(), missedBy: new Map(), givenUpBy: new Map(), cancelledBy: new Map() };
  const columns = 'id, want, weekdays, created_at, archived_at';
  // Ohne die Migration 20261113000400 fehlt `ended_as`: dann ohne die Spalte laden
  let { data, error } = await supabase.from('reminders').select(`${columns}, ended_as`);
  if (error) ({ data, error } = await supabase.from('reminders').select(columns));
  if (error || !data?.length) return empty;
  const rows = data as unknown as {
    id: string;
    want: string;
    weekdays: number[] | null;
    created_at: string;
    archived_at: string | null;
    ended_as?: ReminderEnd | null;
  }[];
  const end = addDays(1, dayStart(to));
  const { data: doneRows } = await supabase
    .from('reminder_done')
    .select('reminder_id, done_at')
    .in('reminder_id', rows.map((r) => r.id))
    .gte('done_at', dayStart(from).toISOString())
    .lt('done_at', end.toISOString());
  const done = new Set<string>();
  const doneBy = new Set<string>();
  const wantOf = new Map(rows.map((r) => [r.id, r.want]));
  const byDay = (map: Map<string, string[]>, day: string, want: string | undefined) => {
    if (!want) return;
    const list = map.get(day) ?? [];
    if (!list.includes(want)) map.set(day, [...list, want]);
  };
  const doneNames = new Map<string, string[]>();
  const missedNames = new Map<string, string[]>();
  for (const d of (doneRows ?? []) as { reminder_id: string; done_at: string }[]) {
    const day = localDate(new Date(d.done_at));
    done.add(day);
    doneBy.add(`${d.reminder_id} ${day}`);
    byDay(doneNames, day, wantOf.get(d.reminder_id));
  }
  const missed = new Set<string>();
  const today = localDate(now);
  for (const r of rows) {
    if (!r.weekdays?.length) continue;
    const first = localDate(new Date(r.created_at));
    const last = r.archived_at ? localDate(new Date(r.archived_at)) : today;
    for (let d = dayStart(from); d < end; d = addDays(1, d)) {
      const day = localDate(d);
      if (day < first || day >= last || day >= today) continue;
      if (r.weekdays.includes(isoWeekday(d)) && !doneBy.has(`${r.id} ${day}`)) {
        missed.add(day);
        byDay(missedNames, day, r.want);
      }
    }
  }
  // Aufgegeben und abgebrochen zählen an dem Tag, an dem es passiert ist
  const givenUpBy = new Map<string, string[]>();
  const cancelledBy = new Map<string, string[]>();
  const first = localDate(dayStart(from));
  const last = localDate(dayStart(to));
  for (const r of rows) {
    if (!r.archived_at || !r.ended_as) continue;
    const day = localDate(new Date(r.archived_at));
    if (day < first || day > last) continue;
    byDay(r.ended_as === 'given_up' ? givenUpBy : cancelledBy, day, r.want);
  }
  return { done, missed, doneBy: doneNames, missedBy: missedNames, givenUpBy, cancelledBy };
}

export async function createReminder(input: ReminderInput): Promise<boolean> {
  const base = { want: input.want.trim(), description: input.description?.trim() || null };
  const { error } = await supabase.from('reminders').insert(
    input.onDate
      ? {
          ...base,
          on_date: input.onDate,
          at_time: input.atTime ?? null,
          until_time: input.untilTime ?? null,
          required: input.required ?? true,
        }
      : {
          ...base,
          per_week: input.weekdays?.length ? null : input.perWeek ?? 1,
          weekdays: input.weekdays?.length ? [...input.weekdays].sort() : null,
          at_time: input.weekdays?.length && input.atTime ? input.atTime : null,
        },
  );
  return !error;
}

/**
 * Wie eine Erinnerung endet (Daria, 2026-11-13): aufgegeben („Give up“) oder abgebrochen („Cancel this“).
 * Erledigt steht in `reminder_done`. Alle drei zählen im Kalender der Routine.
 */
export type ReminderEnd = 'given_up' | 'cancelled';

/**
 * Erinnerung beenden: Sie verschwindet aus der Liste, Erledigungen bleiben erhalten. `how` steht in `ended_as`
 * (Migration 20261113000400_erinnerung_ausgang). Fehlt die Migration noch, endet die Erinnerung ohne Angabe.
 */
export async function archiveReminder(id: string, how: ReminderEnd = 'cancelled'): Promise<boolean> {
  const archived_at = new Date().toISOString();
  const { error } = await supabase.from('reminders').update({ archived_at, ended_as: how }).eq('id', id);
  if (!error) return true;
  const { error: plain } = await supabase.from('reminders').update({ archived_at }).eq('id', id);
  return !plain;
}

/** Hakt die Erinnerung für jetzt ab. Gibt die id der Erledigung zurück, `null` bei Fehlern. */
export async function markReminderDone(id: string): Promise<string | null> {
  const { data, error } = await supabase.from('reminder_done').insert({ reminder_id: id }).select('id').single();
  return error || !data ? null : (data as { id: string }).id;
}

/**
 * Posten nach dem Erledigen (Daria, 2026-11-10): Das Erstellen-Blatt öffnet sich mit Titel und Beschreibung als
 * Me-Challenge. Der nächste Post, der daraus entsteht, bekommt die Markierung und hängt an der Erledigung.
 * Schließt das Blatt ohne Post, verfällt der Auftrag (`clearRoutinePost`).
 */
export type RoutinePost = { doneId: string; label: string; title: string; text: string };
let pendingPost: RoutinePost | null = null;
export const setRoutinePost = (post: RoutinePost) => {
  pendingPost = post;
};
export const peekRoutinePost = () => pendingPost;
export const clearRoutinePost = () => {
  pendingPost = null;
};
/** Nach dem Posten: Markierung setzen und Erledigung verknüpfen. Fehler bleiben still, der Post steht ja. */
export async function attachRoutinePost(challengeId: string): Promise<void> {
  const post = pendingPost;
  pendingPost = null;
  if (!post) return;
  await supabase
    .rpc('link_routine_post', { p_done_id: post.doneId, p_challenge_id: challengeId, p_label: post.label })
    .then(() => undefined, () => undefined);
}

/** Markierung im Post: „Joggen gehen 2/4“ */
export const routineLabel = (r: Reminder, doneAfter = r.doneThisWeek + 1) =>
  `${capitalize(r.want)} ${Math.min(doneAfter, goalOf(r))}/${goalOf(r)}`;

/** „joggen gehen“ → „Joggen gehen“, für Titel und Markierung */
export const capitalize = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

// Kater-Hinweise in der App: zwischen 8 und 20 Uhr, höchstens dreimal am Tag, mit mindestens 3 Stunden Abstand
const NUDGE_KEY = 'routine-nudges';
const NUDGE_FROM = 8;
const NUDGE_TO = 20;
const NUDGE_MAX = 3;
const NUDGE_GAP_MS = 3 * 60 * 60 * 1000;

/** true, wenn der Kater sich jetzt melden darf; merkt sich den Zeitpunkt, wenn `take` gesetzt ist */
export async function nudgeAllowed(take: boolean, now = new Date()): Promise<boolean> {
  const hour = now.getHours();
  if (hour < NUDGE_FROM || hour >= NUDGE_TO) return false;
  let times: number[] = [];
  try {
    times = JSON.parse((await AsyncStorage.getItem(NUDGE_KEY)) ?? '[]');
  } catch {
    times = [];
  }
  const today = dayStart(now).getTime();
  times = times.filter((t) => t >= today);
  if (times.length >= NUDGE_MAX) return false;
  if (times.length && now.getTime() - times[times.length - 1] < NUDGE_GAP_MS) return false;
  if (take) await AsyncStorage.setItem(NUDGE_KEY, JSON.stringify([...times, now.getTime()])).catch(() => {});
  return true;
}

/** „9:00“ oder „18:30“ */
export const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** „24.12“, „24.12.“, „24.12.26“ oder „24.12.2026“ → „2026-12-24“; ohne Jahr der nächste solche Tag ab heute */
export function parseDate(value: string, now = new Date()): string | null {
  const m = value.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2}|\d{4})?)?$/);
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
