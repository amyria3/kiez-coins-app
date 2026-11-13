// Kalender für Routine (Daria, 2026-11-10). Erstmal nur für Daria sichtbar (App: useRoutineEnabled).
//
// 1. Export als Kalender-Abo, ohne Anmeldung (Kalender-Apps schicken keine):
//      GET /functions/v1/kalender?abo=<token>   → text/calendar mit den Erinnerungen der Person
//    Den Token liefert die SQL-Funktion routine_feed_token (Migration 20261110000300_kalender).
//    Exportiert werden einmalige Erinnerungen und feste Wochentage; „x-mal pro Woche“ hat keine Zeit im Kalender.
//
// 2. Import aus eigenen Kalendern, mit Anmeldung der Person im Header Authorization:
//      POST { action: 'events', days?: number }  → { events: [{ id, title, start, end, allDay, calendar }] }
//    Liest die iCal-Adressen aus routine_calendars (nur die eigenen, RLS) und gibt die Termine der nächsten
//    `days` Tage zurück, nur von Kalendern mit Schalter an (Spalte shown, Migration 20261113000100) (Standard 14, höchstens 60). Der Abruf läuft hier, weil Google und iCloud dem Browser
//    den Abruf verbieten (CORS).
//
// Deploy ohne JWT-Prüfung, da das Abo ohne Anmeldung kommt; POST prüft die Anmeldung selbst:
//   npx supabase functions deploy kalender --no-verify-jwt
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit. Keine weiteren Secrets.
import { createClient } from 'npm:@supabase/supabase-js@2';
import ICAL from 'npm:ical.js@2.2.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const WEEKDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const FETCH_TIMEOUT_MS = 10_000;
const MAX_ICS_BYTES = 5_000_000;
const MAX_OCCURRENCES = 500;

type Reminder = {
  id: string;
  want: string;
  description: string | null;
  per_week: number | null;
  weekdays: number[] | null;
  at_time: string | null;
  on_date: string | null;
  until_time: string | null;
  required: boolean | null;
  created_at: string;
};

// ---------- Export ----------

/** Text für iCalendar: Backslash, Komma, Semikolon und Zeilenumbruch maskieren */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** Zeilen über 70 Zeichen falten (RFC 5545) */
const fold = (line: string) => {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 70) parts.push((i ? ' ' : '') + line.slice(i, i + 70));
  return parts.join('\r\n');
};
const ymd = (date: string) => date.replaceAll('-', '');
const hms = (time: string) => time.slice(0, 5).replace(':', '') + '00';
const cap = (s: string) => (s ? s[0].toLocaleUpperCase('de') + s.slice(1) : s);
const addDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
/** Uhrzeit plus Minuten, höchstens 23:59 */
const plusMinutes = (time: string, minutes: number) => {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
/** Erster Tag ab `from` (JJJJ-MM-TT), der einer der Wochentage ist (1 = Montag) */
const firstWeekday = (from: string, days: number[]) => {
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < 7; i++) {
    const iso = ((d.getUTCDay() + 6) % 7) + 1;
    if (days.includes(iso)) break;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
};

/**
 * Zeiten ohne Zeitzone („floating“): Der Kalender zeigt sie in der Zeitzone, in der man gerade ist, so wie die App.
 * „um“: 30 Minuten ab der Uhrzeit. „von … bis“: genau so. „bis“: ganztägig, die Uhrzeit steht im Titel.
 */
function toEvent(r: Reminder, stamp: string): string[] | null {
  const title = cap(r.want);
  const notes = [r.description ?? '', r.on_date ? (r.required === false ? 'Optional' : 'Pflicht') : ''].filter(Boolean).join('\n');
  let when: string[];
  let summary = title;
  if (r.on_date) {
    if (r.at_time && r.until_time) {
      when = [`DTSTART:${ymd(r.on_date)}T${hms(r.at_time)}`, `DTEND:${ymd(r.on_date)}T${hms(r.until_time)}`];
    } else if (r.at_time) {
      when = [`DTSTART:${ymd(r.on_date)}T${hms(r.at_time)}`, `DTEND:${ymd(r.on_date)}T${hms(plusMinutes(r.at_time, 30))}`];
    } else {
      if (r.until_time) summary = `${title} (bis ${r.until_time.slice(0, 5)})`;
      when = [`DTSTART;VALUE=DATE:${ymd(r.on_date)}`, `DTEND;VALUE=DATE:${ymd(addDay(r.on_date))}`];
    }
  } else if (r.weekdays?.length) {
    const start = firstWeekday(r.created_at.slice(0, 10), r.weekdays);
    const rule = `RRULE:FREQ=WEEKLY;BYDAY=${r.weekdays.map((d) => WEEKDAY[d - 1]).join(',')}`;
    when = r.at_time
      ? [`DTSTART:${ymd(start)}T${hms(r.at_time)}`, `DTEND:${ymd(start)}T${hms(plusMinutes(r.at_time, 30))}`, rule]
      : [`DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(addDay(start))}`, rule];
  } else {
    return null;
  }
  return [
    'BEGIN:VEVENT',
    `UID:${r.id}@routine.kiezcoins.de`,
    `DTSTAMP:${stamp}`,
    ...when,
    `SUMMARY:${esc(summary)}`,
    ...(notes ? [`DESCRIPTION:${esc(notes)}`] : []),
    'END:VEVENT',
  ];
}

async function feed(token: string): Promise<Response> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response('Not found', { status: 404 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: owner } = await admin.from('routine_feeds').select('user_id, paused').eq('token', token).maybeSingle();
  if (!owner) return new Response('Not found', { status: 404 });
  // Export aus (Daria, 2026-11-13): leerer Kalender, damit das Abo gültig bleibt und die Termine verschwinden
  const { data } = owner.paused ? { data: [] } : await admin
    .from('reminders')
    .select('id, want, description, per_week, weekdays, at_time, on_date, until_time, required, created_at')
    .eq('user_id', owner.user_id)
    .is('archived_at', null);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = ((data ?? []) as Reminder[]).map((r) => toEvent(r, stamp)).filter((e): e is string[] => !!e);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KiezCoins//Routine//DE',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:KiezCoins Routine',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...events.flat(),
    'END:VCALENDAR',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ---------- Import ----------

/** Nur öffentliche https-Adressen, keine IPs und kein localhost (die Funktion ruft die Adresse selbst auf) */
function safeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim().replace(/^webcal:\/\//i, 'https://'));
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host.endsWith('.local')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchIcs(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { Accept: 'text/calendar' } });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_ICS_BYTES || !text.includes('BEGIN:VCALENDAR') ? null : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type Out = { id: string; title: string; start: string; end?: string; allDay: boolean; calendar: string };

const asOut = (t: { isDate: boolean; toJSDate: () => Date; toString: () => string }) =>
  t.isDate ? t.toString().slice(0, 10) : t.toJSDate().toISOString();

/** Termine eines Kalenders zwischen `from` und `to`, Serien aufgelöst, Ausnahmen berücksichtigt */
function eventsOf(text: string, calendar: string, from: Date, to: Date): Out[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);
  const vevents = root.getAllSubcomponents('vevent');
  const masters = new Map<string, InstanceType<typeof ICAL.Event>>();
  const exceptions: InstanceType<typeof ICAL.Event>[] = [];
  for (const v of vevents) {
    const e = new ICAL.Event(v);
    if (v.hasProperty('recurrence-id')) exceptions.push(e);
    else masters.set(e.uid, e);
  }
  for (const e of exceptions) masters.get(e.uid)?.relateException(e);

  const out: Out[] = [];
  for (const e of masters.values()) {
    if (String(e.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue;
    const push = (start: InstanceType<typeof ICAL.Time>, end: InstanceType<typeof ICAL.Time> | null, title: string) => {
      const s = start.toJSDate();
      const en = end ? end.toJSDate() : s;
      if (en < from || s > to) return;
      out.push({ id: `${e.uid}:${asOut(start)}`, title: title || '(ohne Titel)', start: asOut(start), end: end ? asOut(end) : undefined, allDay: start.isDate, calendar });
    };
    if (!e.isRecurring()) {
      push(e.startDate, e.endDate, e.summary);
      continue;
    }
    const it = e.iterator();
    for (let i = 0, next = it.next(); next && i < MAX_OCCURRENCES; i++, next = it.next()) {
      if (next.toJSDate() > to) break;
      const d = e.getOccurrenceDetails(next);
      push(d.startDate, d.endDate, d.item.summary);
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const params = new URL(req.url).searchParams;
  if (req.method === 'GET') return feed(params.get('abo') ?? '');
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user || auth.user.is_anonymous) return reply({ error: 'auth' }, 401);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return reply({ error: 'input' }, 400);
  }
  if (input.action !== 'events') return reply({ error: 'action' }, 400);

  const days = Math.min(Math.max(Number(input.days) || 14, 1), 60);
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(Date.now() + days * 24 * 3600_000);

  // Nur Kalender, deren Schalter an ist (Daria, 2026-11-13)
  const { data: calendars } = await asUser.from('routine_calendars').select('id, name, url').eq('shown', true);
  const results = await Promise.all(
    ((calendars ?? []) as { id: string; name: string; url: string }[]).map(async (c) => {
      const url = safeUrl(c.url);
      const text = url ? await fetchIcs(url) : null;
      if (!text) return { id: c.id, error: 'laden', events: [] as Out[] };
      try {
        return { id: c.id, events: eventsOf(text, c.name, from, to) };
      } catch {
        return { id: c.id, error: 'lesen', events: [] as Out[] };
      }
    }),
  );
  const events = results.flatMap((r) => r.events).sort((a, b) => a.start.localeCompare(b.start));
  const errors = Object.fromEntries(results.filter((r) => r.error).map((r) => [r.id, r.error]));
  return reply({ events, errors });
});
