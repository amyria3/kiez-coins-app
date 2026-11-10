import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SUPABASE_URL, supabase } from '../lib/supabase';
import { addDays, localDate } from './reminders';

/**
 * Kalender für Routine (Daria, 2026-11-10), erstmal nur für Daria (useRoutineEnabled).
 * - Export: persönlicher Abo-Link, den Kalender-Apps abonnieren (Edge Function `kalender`, GET mit Token).
 * - Import über Link: geheime iCal-Adressen aus Google, iCloud oder Outlook (Tabelle routine_calendars). Die Edge
 *   Function holt sie, da Kalenderdienste den Abruf aus dem Browser verbieten.
 * - Import vom Gerät: Kalender auf dem Android-Handy (expo-calendar), Auswahl auf dem Gerät gespeichert.
 * Importierte Termine erscheinen in Routine als Termine (Daria, 2026-11-10). Migration 20261110000300_kalender.
 */
export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO-Zeit oder bei ganztägigen „JJJJ-MM-TT“ */
  start: string;
  end?: string;
  allDay: boolean;
  /** Name des Kalenders */
  calendar: string;
};

export type LinkedCalendar = { id: string; name: string; url: string };

// ---------- Export ----------

/** Abo-Link als https und als webcal (öffnet direkt die Kalender-App). `null`, wenn die Migration fehlt. */
export async function feedLinks(renew = false): Promise<{ https: string; webcal: string } | null> {
  const { data, error } = await supabase.rpc('routine_feed_token', { p_renew: renew });
  if (error || !data) return null;
  const https = `${SUPABASE_URL}/functions/v1/kalender?abo=${data as string}`;
  return { https, webcal: https.replace(/^https:\/\//, 'webcal://') };
}

// ---------- Import über Link ----------

export async function loadLinkedCalendars(): Promise<LinkedCalendar[] | null> {
  const { data, error } = await supabase.from('routine_calendars').select('id, name, url').order('created_at');
  return error || !data ? null : (data as LinkedCalendar[]);
}

/** Speichert eine iCal-Adresse. `webcal://` wird zu `https://`. */
export async function addLinkedCalendar(name: string, url: string): Promise<boolean> {
  const clean = url.trim().replace(/^webcal:\/\//i, 'https://');
  if (!/^https:\/\/[^\s]+$/i.test(clean)) return false;
  const { error } = await supabase.from('routine_calendars').insert({ name: name.trim() || 'Kalender', url: clean });
  return !error;
}

export async function removeLinkedCalendar(id: string): Promise<boolean> {
  const { error } = await supabase.from('routine_calendars').delete().eq('id', id);
  return !error;
}

async function linkedEvents(days: number): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.functions.invoke<{ events?: CalendarEvent[] }>('kalender', {
    body: { action: 'events', days },
  });
  return error || !data?.events ? [] : data.events;
}

// ---------- Import vom Gerät (nur Android-App) ----------

const DEVICE_KEY = 'routine-device-calendars';
/** Kalender des Geräts lesen geht nur in der nativen Android-App, nicht im Web */
export const deviceCalendarsSupported = Platform.OS === 'android';

type ExpoCalendar = typeof import('expo-calendar');
function expoCalendar(): ExpoCalendar | null {
  if (!deviceCalendarsSupported) return null;
  try {
    // Erst hier laden: Im Web und in alten APKs ohne das native Modul gibt es expo-calendar nicht
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-calendar') as ExpoCalendar;
  } catch {
    return null;
  }
}

export type DeviceCalendar = { id: string; title: string; color?: string };

/** Kalender auf dem Gerät; fragt einmal nach dem Zugriff. `null`, wenn kein Zugriff oder nicht möglich. */
export async function deviceCalendars(ask: boolean): Promise<DeviceCalendar[] | null> {
  const Calendar = expoCalendar();
  if (!Calendar) return null;
  try {
    const perm = ask ? await Calendar.requestCalendarPermissionsAsync() : await Calendar.getCalendarPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const list = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return list.map((c) => ({ id: c.id, title: c.title, color: c.color }));
  } catch {
    return null;
  }
}

export async function chosenDeviceCalendars(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(DEVICE_KEY)) ?? '[]');
  } catch {
    return [];
  }
}
export async function chooseDeviceCalendars(ids: string[]) {
  await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(ids)).catch(() => {});
}

async function deviceEvents(days: number): Promise<CalendarEvent[]> {
  const Calendar = expoCalendar();
  if (!Calendar) return [];
  const ids = await chosenDeviceCalendars();
  if (!ids.length) return [];
  try {
    const perm = await Calendar.getCalendarPermissionsAsync();
    if (perm.status !== 'granted') return [];
    const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const names = new Map(all.map((c) => [c.id, c.title]));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const events = await Calendar.getEventsAsync(
      ids.filter((id) => names.has(id)),
      start,
      addDays(days, start),
    );
    return events.map((e) => {
      const s = new Date(e.startDate);
      return {
        id: `device:${e.id}:${s.toISOString()}`,
        title: e.title || '(ohne Titel)',
        start: e.allDay ? localDate(s) : s.toISOString(),
        end: e.endDate ? new Date(e.endDate).toISOString() : undefined,
        allDay: !!e.allDay,
        calendar: names.get(e.calendarId) ?? '',
      };
    });
  } catch {
    return [];
  }
}

// ---------- Zusammen ----------

/** Termine aus allen verbundenen Kalendern ab heute, nach Beginn sortiert */
export async function upcomingCalendarEvents(days = 7): Promise<CalendarEvent[]> {
  const [linked, device] = await Promise.all([linkedEvents(days).catch(() => []), deviceEvents(days)]);
  const today = localDate();
  return [...linked, ...device]
    .filter((e) => eventDate(e) >= today)
    .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime());
}

/** Ortsdatum des Beginns, „JJJJ-MM-TT“ */
export const eventDate = (e: CalendarEvent) => (e.allDay ? e.start.slice(0, 10) : localDate(new Date(e.start)));
const eventStart = (e: CalendarEvent) => (e.allDay ? new Date(`${e.start.slice(0, 10)}T00:00:00`) : new Date(e.start));
/** „HH:MM“ in Ortszeit */
export const eventTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
