// Karte und Anfahrt über OpenStreetMap für die öffentliche Schaufenster-Seite (Daria, 2026-11-18: kostenlose
// Integrationen für kleine Betriebe). OpenStreetMap kostet nichts und verlangt nur die Namensnennung; die steht in
// der eingebetteten Karte und unter ihr. Reine Logik ohne Netz, geprüft in tests/schaufensterKarte.test.ts.
// Der Unterstrich im Dateinamen sorgt dafür, dass Vercel daraus keine eigene Funktion macht.

const OSM = 'https://www.openstreetmap.org';

/** Gültiger Punkt? lat zwischen -90 und 90, lng zwischen -180 und 180 */
export const hatPunkt = (s) =>
  Number.isFinite(s?.lat) && Number.isFinite(s?.lng) && Math.abs(s.lat) <= 90 && Math.abs(s.lng) <= 180 && !(s.lat === 0 && s.lng === 0);

/**
 * Anfahrt auf openstreetmap.org: Das Ziel ist gesetzt, den Start trägt die Person ein oder nimmt ihren Standort.
 * Mit Punkt genau, sonst sucht OpenStreetMap die Adresse selbst.
 */
export function anfahrtLink(s) {
  const ziel = hatPunkt(s) ? `${s.lat.toFixed(5)},${s.lng.toFixed(5)}` : String(s?.address ?? '').replace(/\s*\n\s*/g, ', ').trim();
  return `${OSM}/directions?${new URLSearchParams({ to: ziel })}`;
}

/** Ausschnitt rund 600 m breit um den Punkt, mit Markierung (Einbettung von openstreetmap.org) */
export function karteEinbetten(s) {
  const dLat = 0.0025;
  const dLng = 0.0045;
  const bbox = [s.lng - dLng, s.lat - dLat, s.lng + dLng, s.lat + dLat].map((n) => n.toFixed(5)).join(',');
  return `${OSM}/export/embed.html?${new URLSearchParams({ bbox, layer: 'mapnik', marker: `${s.lat.toFixed(5)},${s.lng.toFixed(5)}` })}`;
}

/** Größere Karte auf openstreetmap.org */
export const karteGross = (s) => `${OSM}/?mlat=${s.lat.toFixed(5)}&mlon=${s.lng.toFixed(5)}#map=17/${s.lat.toFixed(5)}/${s.lng.toFixed(5)}`;
