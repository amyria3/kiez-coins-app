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
      doneThisWeek: mine.length,
      doneToday: mine.some((d) => new Date(d.done_at) >= today),
    };
  });
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

/** Erinnerung beenden: Sie verschwindet aus der Liste, Erledigungen bleiben erhalten */
export async function archiveReminder(id: string): Promise<boolean> {
  const { error } = await supabase.from('reminders').update({ archived_at: new Date().toISOString() }).eq('id', id);
  return !error;
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
