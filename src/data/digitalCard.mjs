// Inhalt der Digitalen Visitenkarte, gleich in der App (src/components/showcase/DigitalCard.tsx) und auf
// kiezcoins.de/s/<kurzname>/visitenkarte (api/_visitenkarte.mjs, dort als ortZeile und serviceListe). Reine Logik,
// geprüft in tests/visitenkarteKontakt.test.ts.

/**
 * Ortszeile unter dem Namen: Kiez und Stadt aus der Postleitzahl der Adresse, ohne Doppelung (Daria, 2026-11-23).
 * @param {{ kiez?: string | null; address?: string | null }} s
 * @returns {string}
 */
export function placeLine(s) {
  const kiez = String(s?.kiez ?? '').trim();
  const city = (String(s?.address ?? '').match(/\b\d{5}[ \t]+([^\n,]+)/)?.[1] ?? '').trim();
  if (!city) return kiez;
  if (!kiez || /^\d{5}$/.test(kiez)) return city;
  return kiez.toLowerCase().includes(city.toLowerCase()) ? kiez : `${kiez}, ${city}`;
}

/**
 * Services ohne Auszeichnung, ein Eintrag je Zeile (Aufzählungszeichen, **fett** und *kursiv* fallen weg).
 * @param {unknown} value
 * @returns {string[]}
 */
export function serviceItems(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•·]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim())
    .filter(Boolean);
}
