/**
 * Buchungen über Cal.com erkennen (Daria, 2026-11-25: „Ich sollte das absagen können, über die App“).
 *
 * Cal.com trägt jede Buchung in den verbundenen Kalender ein: UID „<buchung>@Cal.com“, in der Beschreibung der Link
 * „https://cal.com/booking/<buchung>?changes=true“. KiezCoins liest diese Kalender nur (iCal-Adresse), kann dort also
 * nichts löschen. Die Absage läuft deshalb über die Absageseite von Cal.com: Nur dort wird die Buchung wirklich
 * storniert, Cal.com schreibt allen Gästen eine Mail und nimmt den Termin aus dem Kalender.
 *
 * Dieselbe Erkennung steht in der Edge Function `kalender` (Deno, kann nicht aus `src` importieren). Ändert sich hier
 * etwas, dort mitändern.
 */

/** Buchungsnummer, wie Cal.com sie vergibt (z. B. „hdB22dYFukCtFmGd6518bG“) */
const UID = /^([A-Za-z0-9_-]{6,64})@cal\.com$/i;
const LINK = /https:\/\/(?:app\.)?cal\.com\/booking\/([A-Za-z0-9_-]{6,64})/i;

/** Buchungsnummer aus UID oder Beschreibung, sonst `undefined` (kein Cal.com-Termin) */
export function calBookingId(uid?: string | null, description?: string | null): string | undefined {
  const fromUid = uid ? UID.exec(uid.trim()) : null;
  if (fromUid) return fromUid[1];
  const fromText = description ? LINK.exec(description) : null;
  return fromText ? fromText[1] : undefined;
}

/**
 * Absageseite bei Cal.com: öffnet direkt das Feld „Grund für die Stornierung (optional)“ mit „Termin absagen“
 * (geprüft am 2026-11-25). Die Adresse bauen wir selbst, damit nur cal.com geöffnet wird.
 */
export const calCancelUrl = (bookingId: string) => `https://cal.com/booking/${encodeURIComponent(bookingId)}?cancel=true`;

/** Absagen ergibt nur Sinn, solange der Termin nicht vorbei ist. Ohne Ende zählt der Beginn. */
export function canCancel(e: { start: string; end?: string; allDay: boolean }, now = new Date()): boolean {
  if (e.allDay) return e.start.slice(0, 10) >= localDay(now);
  return new Date(e.end ?? e.start).getTime() > now.getTime();
}

/** Minuten bis zum Beginn, negativ, wenn er schon läuft. Ganztägig: `undefined`. */
export function minutesUntil(e: { start: string; allDay: boolean }, now = new Date()): number | undefined {
  if (e.allDay) return undefined;
  return Math.round((new Date(e.start).getTime() - now.getTime()) / 60_000);
}

/**
 * Hinweis bei kurzfristiger Absage (Daria, 2026-11-25): Unter 24 Stunden liest die andere Seite die Mail von Cal.com
 * vielleicht zu spät. Dann sagen wir das dazu, sonst nichts.
 */
export function shortNoticeKind(e: { start: string; allDay: boolean }, now = new Date()): 'running' | 'soon' | undefined {
  const m = minutesUntil(e, now);
  if (m === undefined) return undefined;
  if (m <= 0) return 'running';
  if (m < 24 * 60) return 'soon';
  return undefined;
}

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
