// vCard des Schaufensters für „In Kontakte speichern“ (Daria, 2026-11-23). Eine Quelle für die Digitale Visitenkarte in
// der App (src/components/showcase/CardActions.tsx, Datei entsteht im Browser) und für kiezcoins.de/s/<kurzname>/kontakt.vcf
// (api/s.mjs, aus der Android- und iPhone-App). Reines JavaScript ohne Abhängigkeiten wie data/cardActions.mjs: Metro
// lädt .mjs, die Vercel-Funktion importiert die Datei relativ, die Tests bündeln sie mit esbuild.

import { serviceItems } from './digitalCard.mjs';

const SITE = 'https://kiezcoins.de';

/** Text für vCard und iCalendar: Backslash, Semikolon, Komma und Zeilenumbruch maskieren (RFC 6350, 3.4; RFC 5545, 3.3.11) */
export const icsText = (s) =>
  String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** Zeilen über 75 Byte falten (RFC 5545, 3.1; RFC 6350, 3.2). Gezählt wird in Zeichen bis 70, das reicht auch für Umlaute. */
export function icsFold(line) {
  const chars = Array.from(line);
  if (chars.length <= 70) return line;
  const parts = [];
  for (let i = 0; i < chars.length; i += 70) parts.push((i ? ' ' : '') + chars.slice(i, i + 70).join(''));
  return parts.join('\r\n');
}

/**
 * Freitext aus einem Formular: eine Zeile bzw. kurzer Absatz, ohne Steuerzeichen, gekürzt
 * @param {unknown} value
 * @param {number} max
 */
export function cleanText(value, max) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);
}

/** Datum wie „23.11.2026“, in Berliner Zeit */
export const contactDate = (now) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);

/** Ansicht der Digitalen Visitenkarte auf kiezcoins.de */
export const cardLink = (slug) => `${SITE}/s/${slug}/visitenkarte`;

/**
 * vCard 3.0 des Schaufensters. Die Notiz beginnt mit dem Datum und, wenn angegeben, dem Ort der Begegnung, danach
 * folgen die eigene Notiz, Kompetenzen & Services und Öffnungszeiten.
 * @param {{ name: string, slug: string, address?: string | null, email?: string | null, phone?: string | null, links?: string[] | null, website?: string | null, services?: string | null, openingHours?: string | null }} s
 * @param {{ place?: string, note?: string }} [input]
 * @param {Date} [now]
 */
export function showcaseVcard(s, { place = '', note = '' } = {}, now = new Date()) {
  const o = cleanText(place, 120);
  const n = cleanText(note, 500);
  const services = serviceItems(s.services);
  const noteText = [
    o ? `Kennengelernt am ${contactDate(now)} bei ${o}.` : `Gespeichert am ${contactDate(now)}.`,
    n,
    services.length ? `Kompetenzen & Services: ${services.join(', ')}` : '',
    s.openingHours?.trim() ? `Öffnungszeiten: ${s.openingHours.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const website = (s.links ?? []).find((l) => /^https:\/\//i.test(l)) ?? (s.website && /^https:\/\//i.test(s.website) ? s.website : '');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${icsText(s.name)};;;;`,
    `FN:${icsText(s.name)}`,
    `ORG:${icsText(s.name)}`,
    // Apple Kontakte zeigt den Eintrag als Firma statt als Person
    'X-ABShowAs:COMPANY',
    s.address?.trim() ? `ADR;TYPE=WORK:;;${icsText(s.address.trim().replace(/\s*\n\s*/g, ', '))};;;;` : '',
    s.email?.trim() ? `EMAIL;TYPE=WORK:${icsText(s.email.trim())}` : '',
    s.phone?.trim() ? `TEL;TYPE=WORK,VOICE:${icsText(s.phone.trim())}` : '',
    website ? `URL;TYPE=WORK:${icsText(website)}` : '',
    `item1.URL:${icsText(cardLink(s.slug))}`,
    'item1.X-ABLabel:KiezCoins',
    `NOTE:${icsText(noteText)}`,
    'END:VCARD',
  ];
  return lines.filter(Boolean).map(icsFold).join('\r\n') + '\r\n';
}
