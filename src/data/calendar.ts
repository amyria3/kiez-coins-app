import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SUPABASE_URL, supabase } from '../lib/supabase';
import { addDays, localDate } from './reminders';

/**
 * Kalender für Routine (Daria, 2026-11-10), für alle mit Routine (useRoutineEnabled).
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

/** `shown`: eigener Schalter je Kalender, aus blendet seine Termine in Routine aus (Daria, 2026-11-13) */
export type LinkedCalendar = { id: string; name: string; url: string; shown: boolean };

// ---------- Export ----------

/** Abo-Link als https und als webcal (öffnet direkt die Kalender-App). `null`, wenn die Migration fehlt. */
export async function feedLinks(renew = false): Promise<{ https: string; webcal: string } | null> {
  const { data, error } = await supabase.rpc('routine_feed_token', { p_renew: renew });
  if (error || !data) return null;
  const https = `${SUPABASE_URL}/functions/v1/kalender?abo=${data as string}`;
  return { https, webcal: https.replace(/^https:\/\//, 'webcal://') };
}

/**
 * Export an oder aus (Daria, 2026-11-13). Aus: Der Abo-Link liefert einen leeren Kalender, die Termine verschwinden
 * beim nächsten Abruf aus dem abonnierten Kalender. Das Abo und der Link bleiben. Migration 20261113000100.
 */
export async function feedExported(): Promise<boolean> {
  const { data, error } = await supabase.rpc('routine_feed_paused');
  return error ? true : !data;
}
export async function setFeedExported(on: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('routine_feed_set_paused', { p_paused: !on });
  return !error;
}

// ---------- Import über Link ----------

export async function loadLinkedCalendars(): Promise<LinkedCalendar[] | null> {
  const { data, error } = await supabase.from('routine_calendars').select('id, name, url, shown').order('created_at');
  return error || !data ? null : (data as LinkedCalendar[]);
}

/** Speichert eine iCal-Adresse. `webcal://` wird zu `https://`. */
export async function addLinkedCalendar(name: string, url: string): Promise<boolean> {
  const clean = url.trim().replace(/^webcal:\/\//i, 'https://');
  if (!/^https:\/\/[^\s]+$/i.test(clean)) return false;
  const { error } = await supabase.from('routine_calendars').insert({ name: name.trim() || 'Kalender', url: clean });
  return !error;
}

/** Termine dieses Kalenders in Routine zeigen oder ausblenden; die Verbindung bleibt */
export async function setLinkedCalendarShown(id: string, shown: boolean): Promise<boolean> {
  const { error } = await supabase.from('routine_calendars').update({ shown }).eq('id', id);
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

// Seit SDK 58 werfen die alten Funktionen in `expo-calendar` zur Laufzeit; sie stehen unter `expo-calendar/legacy`
type ExpoCalendar = typeof import('expo-calendar/legacy');
function expoCalendar(): ExpoCalendar | null {
  if (!deviceCalendarsSupported) return null;
  try {
    // Erst hier laden: Im Web und in alten APKs ohne das native Modul gibt es expo-calendar nicht
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-calendar/legacy') as ExpoCalendar;
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

// ---------- Ein Termin in den eigenen Kalender (Schaufenster, Daria, 2026-11-10) ----------

export type SingleEvent = { id: string; title: string; start: Date; end?: Date; location?: string; notes?: string };

const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);

/** Kalenderdatei (.ics) mit einem oder mehreren Terminen; ohne Ende je eine Stunde */
export function eventIcs(e: SingleEvent | SingleEvent[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KiezCoins//Schaufenster//DE',
    ...(Array.isArray(e) ? e : [e]).flatMap(veventLines),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

function veventLines(e: SingleEvent): string[] {
  const end = e.end ?? new Date(e.start.getTime() + 60 * 60 * 1000);
  return [
    'BEGIN:VEVENT',
    `UID:${e.id}@kiezcoins.de`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(e.start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
    ...(e.notes ? [`DESCRIPTION:${icsText(e.notes)}`] : []),
    'END:VEVENT',
  ];
}

/**
 * „In meine anderen Kalender“ (vorher „In meinen Kalender“, Daria, 2026-11-13: klang nach dem Kalender in KiezCoins): Im Browser lädt das eine Kalenderdatei herunter, die Kalender-Apps öffnen.
 * In der Android-App öffnet sich der Kalender des Handys mit dem fertigen Termin. `false`, wenn es nicht ging.
 */
export async function addToMyCalendar(e: SingleEvent): Promise<boolean> {
  return addAllToMyCalendar([e], e.title);
}

/**
 * „In meine anderen Kalender“ für alle kommenden Termine eines Schaufensters (Daria, 2026-11-13): Im Browser eine
 * Kalenderdatei mit allen Terminen, in der Android-App nacheinander der Kalender des Handys für jeden Termin.
 */
export async function addAllToMyCalendar(events: SingleEvent[], name: string): Promise<boolean> {
  if (!events.length) return false;
  if (Platform.OS === 'web') {
    try {
      const url = URL.createObjectURL(new Blob([eventIcs(events)], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 40) || 'Termin'}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch {
      return false;
    }
  }
  const Calendar = expoCalendar();
  if (!Calendar) return false;
  try {
    for (const e of events) {
      await Calendar.createEventInCalendarAsync({
        title: e.title,
        startDate: e.start,
        endDate: e.end ?? new Date(e.start.getTime() + 60 * 60 * 1000),
        location: e.location,
        notes: e.notes,
      });
    }
    return true;
  } catch {
    return false;
  }
}
