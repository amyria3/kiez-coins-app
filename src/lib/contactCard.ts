/**
 * Kontakt einer Person als vCard 3.0, für „Kontakte tauschen › Von Hand eintragen“ in der Visitenkarte des Teams
 * (Daria, 2026-11-23). Die Datei entsteht auf dem Gerät und geht ins eigene Adressbuch; KiezCoins speichert nichts.
 * Reine Logik ohne React Native, damit tests/contactCard.test.ts sie prüfen kann.
 */

export type ContactInput = { name: string; email?: string; place?: string; note?: string };

/** Text für vCard: Backslash, Semikolon, Komma und Zeilenumbruch maskieren (RFC 6350, 3.4) */
const vText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Zeilen ab 70 Zeichen falten (RFC 6350, 3.2) */
function fold(line: string): string {
  const chars = Array.from(line);
  if (chars.length <= 70) return line;
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 70) parts.push((i ? ' ' : '') + chars.slice(i, i + 70).join(''));
  return parts.join('\r\n');
}

/** Freitext ohne Steuerzeichen, gekürzt */
export const cleanText = (value: string | undefined, max: number) =>
  (value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);

export const contactDate = (now: Date) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);

/** vCard mit Name, Mail und Notiz „Kennengelernt am … bei …“ */
export function contactVcard(c: ContactInput, now = new Date()): string {
  const name = cleanText(c.name, 80).replace(/\n/g, ' ');
  const email = cleanText(c.email, 254);
  const place = cleanText(c.place, 120).replace(/\n/g, ' ');
  const note = cleanText(c.note, 500);
  const parts = name.split(/\s+/);
  const family = parts.length > 1 ? parts[parts.length - 1] : name;
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  const noteText = [place ? `Kennengelernt am ${contactDate(now)} bei ${place}.` : `Kennengelernt am ${contactDate(now)}.`, note]
    .filter(Boolean)
    .join('\n');
  return (
    [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${vText(family)};${vText(given)};;;`,
      `FN:${vText(name)}`,
      email ? `EMAIL:${vText(email)}` : '',
      `NOTE:${vText(noteText)}`,
      'END:VCARD',
    ]
      .filter(Boolean)
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}

/** Dateiname ohne Sonderzeichen, z. B. „Jana Beispiel.vcf“ */
export const contactFileName = (name: string) => `${cleanText(name, 60).replace(/[\\/:*?"<>|\n]+/g, ' ').trim() || 'Kontakt'}.vcf`;
