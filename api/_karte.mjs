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

/** Kartenbild der Schaufenster-Seite (/s/<kurzname>/karte.png): 680 × 340, doppelt so groß wie die Spalte mit 340 px */
export const KARTE_B = 680;
export const KARTE_H = 340;
/** Zoom 17: Straßen mit Namen, rund 600 m Ausschnitt in der Breite */
export const KARTE_ZOOM = 17;
const KACHEL = 256;

/**
 * Kacheln von tile.openstreetmap.org für ein Bild von `breite` × `hoehe` Pixeln mit dem Punkt in der Mitte
 * (Web-Mercator wie OpenStreetMap). `links` und `oben` sind die Lage jeder Kachel im Bild.
 * @returns {{ z: number, x: number, y: number, links: number, oben: number }[]}
 */
export function kartenKacheln(s, { breite = KARTE_B, hoehe = KARTE_H, zoom = KARTE_ZOOM } = {}) {
  const n = 2 ** zoom;
  const welt = n * KACHEL;
  const rad = (s.lat * Math.PI) / 180;
  const px = ((s.lng + 180) / 360) * welt;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * welt;
  const x0 = px - breite / 2;
  const y0 = py - hoehe / 2;
  const kacheln = [];
  for (let ty = Math.floor(y0 / KACHEL); ty * KACHEL < y0 + hoehe; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(x0 / KACHEL); tx * KACHEL < x0 + breite; tx++) {
      kacheln.push({ z: zoom, x: ((tx % n) + n) % n, y: ty, links: Math.round(tx * KACHEL - x0), oben: Math.round(ty * KACHEL - y0) });
    }
  }
  return kacheln;
}
