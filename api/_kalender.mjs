// Kalender-Abo für die Termine eines Schaufensters (Daria, 2026-11-18: kostenlose Integrationen für kleine Betriebe).
// Adresse: kiezcoins.de/s/<kurzname>/termine.ics (vercel.json leitet auf /api/s?slug=…&format=ics). Kalender-Apps
// holen die Datei regelmäßig neu; neue, geänderte und abgesagte Termine erscheinen so ohne Zutun der Kundschaft.
// Reine Logik ohne Netz, damit tests/schaufensterKalender.test.ts sie prüfen kann. Der Unterstrich im Dateinamen
// sorgt dafür, dass Vercel daraus keine eigene Funktion macht.

// Maskieren und Falten teilen Kalender und vCard (src/data/vcard.mjs)
import { icsFold, icsText } from '../src/data/vcard.mjs';

export { icsFold, icsText };

/** ISO-Zeit → UTC im Format 20261118T130000Z */
export const icsTime = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

/** Ohne Ende gilt eine Stunde, wie es Kalender-Apps beim Anlegen vorschlagen */
const EINE_STUNDE = 3600_000;

/**
 * Baut die Kalenderdatei aus dem Ergebnis von public_showcase. Nur Termine, keine Posts.
 * Abgesagte Termine bleiben mit STATUS:CANCELLED drin, damit Kalender-Apps sie als abgesagt zeigen statt still löschen.
 * @param {object} s Schaufenster aus public_showcase
 * @param {string} url öffentliche Seite des Schaufensters
 * @param {Date} [jetzt]
 */
export function schaufensterKalender(s, url, jetzt = new Date()) {
  const stamp = icsTime(jetzt.toISOString());
  const termine = (s.entries ?? []).filter((x) => x.kind === 'event' && x.starts_at && !Number.isNaN(Date.parse(x.starts_at)));
  const events = termine.flatMap((x) => {
    const start = new Date(x.starts_at);
    const ende = x.ends_at && Date.parse(x.ends_at) > start.getTime() ? new Date(x.ends_at) : new Date(start.getTime() + EINE_STUNDE);
    const ort = x.location?.trim() || s.address?.trim() || '';
    return [
      'BEGIN:VEVENT',
      `UID:${x.id}@schaufenster.kiezcoins.de`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(start.toISOString())}`,
      `DTEND:${icsTime(ende.toISOString())}`,
      `SUMMARY:${icsText(x.title)}`,
      ...(x.body?.trim() ? [`DESCRIPTION:${icsText(x.body.trim())}`] : []),
      ...(ort ? [`LOCATION:${icsText(ort)}`] : []),
      `URL:${url}`,
      `STATUS:${x.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    ];
  });
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KiezCoins//Schaufenster//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(s.name)}`,
    ...(s.about?.trim() ? [`X-WR-CALDESC:${icsText(s.about.trim().slice(0, 300))}`] : []),
    'X-WR-TIMEZONE:Europe/Berlin',
    // Alle drei Stunden neu laden; Google hält sich nicht daran und lädt seltener
    'REFRESH-INTERVAL;VALUE=DURATION:PT3H',
    'X-PUBLISHED-TTL:PT3H',
    ...events,
    'END:VCALENDAR',
  ];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

/** Hat das Schaufenster mindestens einen Termin? Nur dann zeigt die Seite das Abo. */
export const hatTermine = (s) => (s?.entries ?? []).some((x) => x.kind === 'event' && x.starts_at);
