import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeLink } from '../lib/places';
import { supabase } from '../lib/supabase';
import { weekStart, dayStart, isoWeekday, kindOf, localDate, addDays, routineLabel } from './reminderDates';
export { weekStart, isoWeekday, kindOf, goalOf, localDate, addDays, dueToday, dueAt, routineLabel, capitalize, TIME, parseDate, parseUntil, dateIssue, datePartial, END_OF_DAY, isRelaxed, slackOf } from './reminderDates';
export type { ReminderKind } from './reminderDates';

/**
 * Erinnerungen (Routine, Daria, 2026-11-10). Antworten auf die Fragen: Documentation, kiez-coins/offen/2026-11-07_offen_erinnerungen.md.
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
  /** x-mal pro Woche: Lieblingstag, 1 = Montag … 7 = Sonntag (Daria, 2026-11-16) */
  preferredDay?: number;
  /** 1 = Montag … 7 = Sonntag */
  weekdays?: number[];
  /** „HH:MM“: Uhrzeit bei festen Tagen, bei einmaligen „um“ bzw. „von“ */
  atTime?: string;
  /** Einmalig: Tag als „JJJJ-MM-TT“ */
  onDate?: string;
  /** „bis HH:MM“, einmalig und bei festen Tagen (Daria, 2026-11-16) */
  untilTime?: string;
  /** Einmalig: Pflicht oder optional (Daria, 2026-11-10) */
  required?: boolean;
  /** Angelegt am (ISO), für die Stimmung des Katers */
  createdAt?: string;
  /** Ort, Telefon und Link (Daria, 2026-11-13, Migration 20261113000600) */
  place?: string;
  phone?: string;
  link?: string;
  /** Mit „Starten (mit Post)“ begonnene Me-Challenge, solange sie offen ist (Daria, 2026-11-16) */
  startedChallengeId?: string;
  /** Erledigt in dieser Woche (ab Montag) */
  doneThisWeek: number;
  doneToday: boolean;
};

export type ReminderInput = {
  want: string;
  description?: string;
  perWeek?: number;
  preferredDay?: number;
  weekdays?: number[];
  atTime?: string;
  onDate?: string;
  untilTime?: string;
  required?: boolean;
  place?: string;
  phone?: string;
  link?: string;
};

type Row = {
  id: string;
  want: string;
  description: string | null;
  per_week: number | null;
  preferred_day?: number | null;
  weekdays: number[] | null;
  at_time: string | null;
  on_date?: string | null;
  until_time?: string | null;
  required?: boolean | null;
  created_at?: string | null;
  place?: string | null;
  phone?: string | null;
  link?: string | null;
  started_challenge_id?: string | null;
};

/** Lädt die eigenen Erinnerungen. `null`, wenn etwas schiefgeht. */
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
  // Begonnene Me-Challenges zählen nur, solange sie offen und nicht fertig sind
  const startedIds = rows.map((r) => r.started_challenge_id).filter((x): x is string => !!x);
  const { data: started } = startedIds.length
    ? await supabase.from('challenges').select('id').in('id', startedIds).eq('type', 'before_after').in('status', ['draft', 'open']).is('finished_at', null)
    : { data: [] as { id: string }[] };
  const openStarted = new Set(((started ?? []) as { id: string }[]).map((c) => c.id));
  return rows.map((r) => {
    const mine = doneRows.filter((d) => d.reminder_id === r.id);
    return {
      id: r.id,
      want: r.want,
      description: r.description ?? undefined,
      perWeek: r.per_week ?? undefined,
      preferredDay: r.per_week ? (r.preferred_day ?? undefined) : undefined,
      weekdays: r.weekdays ?? undefined,
      atTime: r.at_time ? r.at_time.slice(0, 5) : undefined,
      onDate: r.on_date ?? undefined,
      untilTime: r.until_time ? r.until_time.slice(0, 5) : undefined,
      required: r.on_date ? r.required !== false : undefined,
      createdAt: r.created_at ?? undefined,
      place: r.place || undefined,
      phone: r.phone || undefined,
      link: r.link || undefined,
      startedChallengeId: r.started_challenge_id && openStarted.has(r.started_challenge_id) ? r.started_challenge_id : undefined,
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
  /** Abgesagte Termine (Daria, 2026-11-13): wie abgebrochen, nur mit eigenem Wort */
  calledOffBy: Map<string, string[]>;
};
export async function loadRoutineDays(from: Date, to: Date, now = new Date()): Promise<RoutineDays> {
  const empty: RoutineDays = { done: new Set(), missed: new Set(), doneBy: new Map(), missedBy: new Map(), givenUpBy: new Map(), cancelledBy: new Map(), calledOffBy: new Map() };
  const { data, error } = await supabase
    .from('reminders')
    .select('id, want, weekdays, created_at, archived_at, on_date, at_time, until_time, ended_as');
  if (error || !data?.length) return empty;
  const rows = data as unknown as {
    id: string;
    want: string;
    weekdays: number[] | null;
    created_at: string;
    archived_at: string | null;
    on_date?: string | null;
    at_time?: string | null;
    until_time?: string | null;
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
  const calledOffBy = new Map<string, string[]>();
  const first = localDate(dayStart(from));
  const last = localDate(dayStart(to));
  for (const r of rows) {
    if (!r.archived_at || !r.ended_as || r.ended_as === 'deleted') continue;
    const day = localDate(new Date(r.archived_at));
    if (day < first || day > last) continue;
    const event = kindOf({ onDate: r.on_date ?? undefined, atTime: r.at_time ?? undefined, untilTime: r.until_time ?? undefined }) === 'termin';
    byDay(r.ended_as === 'given_up' ? givenUpBy : event ? calledOffBy : cancelledBy, day, r.want);
  }
  return { done, missed, doneBy: doneNames, missedBy: missedNames, givenUpBy, cancelledBy, calledOffBy };
}

/** Ort, Telefon und Link als Spalten; leer bleibt leer */
const extrasOf = (input: Pick<ReminderInput, 'place' | 'phone' | 'link'>) => ({
  place: input.place?.trim() || null,
  phone: input.phone?.trim() || null,
  link: input.link?.trim() ? normalizeLink(input.link) : null,
});

export async function createReminder(input: ReminderInput): Promise<boolean> {
  const base = { want: input.want.trim(), description: input.description?.trim() || null };
  const { error } = await supabase.from('reminders').insert({ ...rowOf(input, base), ...extrasOf(input) });
  return !error;
}

function rowOf(input: ReminderInput, base: { want: string; description: string | null }) {
  return (
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
          preferred_day: input.weekdays?.length ? null : input.preferredDay ?? null,
          weekdays: input.weekdays?.length ? [...input.weekdays].sort() : null,
          at_time: input.weekdays?.length && input.atTime ? input.atTime : null,
          until_time: input.weekdays?.length && input.untilTime ? input.untilTime : null,
        }
  );
}

/**
 * Erinnerung ganz neu einstellen (Daria, 2026-11-16: „Hier fehlen noch Felder“): Bearbeiten nutzt das Formular von
 * „Neue Erinnerung“, die Art darf wechseln (einmal, x-mal pro Woche, feste Tage). Felder der anderen Arten werden
 * geleert, damit genau eine Art gesetzt ist (Constraint `reminders_art`).
 */
export async function replaceReminder(id: string, input: ReminderInput): Promise<boolean> {
  const base = { want: input.want.trim(), description: input.description?.trim() || null };
  const empty = { per_week: null, preferred_day: null, weekdays: null, on_date: null, at_time: null, until_time: null };
  const { error } = await supabase.from('reminders').update({ ...empty, ...rowOf(input, base), ...extrasOf(input) }).eq('id', id);
  return !error;
}

/**
 * Wie eine Erinnerung endet (Daria, 2026-11-13): aufgegeben („Give up“) oder abgebrochen („Cancel this“).
 * Erledigt steht in `reminder_done`. Alle drei zählen im Kalender der Routine.
 * Gelöscht (Daria, 2026-11-13): verschwindet aus der Liste, zählt nicht; Erledigtes bleibt.
 */
export type ReminderEnd = 'given_up' | 'cancelled' | 'deleted';

/** Erinnerung beenden: Sie verschwindet aus der Liste, Erledigungen bleiben erhalten. `how` steht in `ended_as`. */
export async function archiveReminder(id: string, how: ReminderEnd = 'cancelled'): Promise<boolean> {
  const { error } = await supabase.from('reminders').update({ archived_at: new Date().toISOString(), ended_as: how }).eq('id', id);
  return !error;
}

/** Hakt die Erinnerung für jetzt ab. Gibt die id der Erledigung zurück, `null` bei Fehlern. */
export async function markReminderDone(id: string): Promise<string | null> {
  const { data, error } = await supabase.from('reminder_done').insert({ reminder_id: id }).select('id').single();
  return error || !data ? null : (data as { id: string }).id;
}

/**
 * Haken von heute zurücknehmen (Daria, 2026-11-18, „Untick“): löscht die jüngste Erledigung von heute. Die Woche zählt
 * dann einen weniger, im Kalender verschwindet der Haken. Ein Post, der dabei entstanden ist, bleibt stehen.
 */
export async function undoReminderDone(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('reminder_done')
    .select('id')
    .eq('reminder_id', id)
    .gte('done_at', dayStart().toISOString())
    .order('done_at', { ascending: false })
    .limit(1);
  const row = (data as { id: string }[] | null)?.[0];
  if (error || !row) return false;
  const { error: gone } = await supabase.from('reminder_done').delete().eq('id', row.id);
  return !gone;
}

/**
 * Posten nach dem Erledigen (Daria, 2026-11-10): Das Erstellen-Blatt öffnet sich mit Titel und Beschreibung als
 * Me-Challenge. Der nächste Post, der daraus entsteht, bekommt die Markierung und hängt an der Erledigung.
 * Schließt das Blatt ohne Post, verfällt der Auftrag (`clearRoutinePost`).
 */
/**
 * `doneId`: nach dem Erledigen, der Post hängt an der Erledigung. `startReminderId`: „Starten (mit Post)“
 * (Daria, 2026-11-16), die Erinnerung merkt sich die Me-Challenge für „Fertig – mit Post“.
 */
export type RoutinePost = { doneId?: string; startReminderId?: string; label: string; title: string; text: string };
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
  if (post.startReminderId) {
    await supabase
      .from('reminders')
      .update({ started_challenge_id: challengeId })
      .eq('id', post.startReminderId)
      .then(() => undefined, () => undefined);
    return;
  }
  if (!post.doneId) return;
  await linkRoutinePost(post.doneId, challengeId, post.label);
}

/** Erledigung mit dem Post verknüpfen und die Markierung setzen. Fehler bleiben still, der Post steht ja. */
export const linkRoutinePost = (doneId: string, challengeId: string, label: string) =>
  supabase
    .rpc('link_routine_post', { p_done_id: doneId, p_challenge_id: challengeId, p_label: label })
    .then(() => undefined, () => undefined);

/** „Fertig – mit Post“: Erledigung an die begonnene Me-Challenge hängen und die Erinnerung davon lösen */
export async function finishStartedPost(r: Reminder, doneId: string): Promise<void> {
  if (!r.startedChallengeId) return;
  await linkRoutinePost(doneId, r.startedChallengeId, routineLabel(r));
  await supabase
    .from('reminders')
    .update({ started_challenge_id: null })
    .eq('id', r.id)
    .then(() => undefined, () => undefined);
}

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

