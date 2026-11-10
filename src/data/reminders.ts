import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';

/**
 * Erinnerungen (Routine, Daria, 2026-11-10). Antworten auf die Fragen: Übergabe/2026-11-07_offen_erinnerungen.md.
 * - „Ich will …“ plus Ergänzung (`want`), optional eine Beschreibung.
 * - Ziel x-mal pro Woche oder feste Wochentage mit Uhrzeit.
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
  /** „HH:MM“ */
  atTime?: string;
  /** Erledigt in dieser Woche (ab Montag) */
  doneThisWeek: number;
  doneToday: boolean;
};

export type ReminderInput = { want: string; description?: string; perWeek?: number; weekdays?: number[]; atTime?: string };

type Row = {
  id: string;
  want: string;
  description: string | null;
  per_week: number | null;
  weekdays: number[] | null;
  at_time: string | null;
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

export const goalOf = (r: Pick<Reminder, 'perWeek' | 'weekdays'>) => r.perWeek ?? r.weekdays?.length ?? 1;

/** Fällig heute: feste Tage, wenn heute einer ist; x-mal pro Woche, solange das Ziel nicht erreicht ist */
export function dueToday(r: Reminder, now = new Date()): boolean {
  if (r.doneToday) return false;
  if (r.weekdays) return r.weekdays.includes(isoWeekday(now));
  return r.doneThisWeek < goalOf(r);
}

/** Lädt die eigenen Erinnerungen. `null`, wenn die Migration fehlt oder etwas schiefgeht. */
export async function loadReminders(): Promise<Reminder[] | null> {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, want, description, per_week, weekdays, at_time')
    .is('archived_at', null)
    .order('created_at');
  if (error || !data) return null;
  const rows = data as Row[];
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
      doneThisWeek: mine.length,
      doneToday: mine.some((d) => new Date(d.done_at) >= today),
    };
  });
}

export async function createReminder(input: ReminderInput): Promise<boolean> {
  const { error } = await supabase.from('reminders').insert({
    want: input.want.trim(),
    description: input.description?.trim() || null,
    per_week: input.weekdays?.length ? null : input.perWeek ?? 1,
    weekdays: input.weekdays?.length ? [...input.weekdays].sort() : null,
    at_time: input.weekdays?.length && input.atTime ? input.atTime : null,
  });
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
