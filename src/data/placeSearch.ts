import { Platform } from 'react-native';

import { coordsIfAllowed, distanceMeters, type Coords } from './location';
import { getLanguage } from './texts';
import { placeLabel, queryVariants, type PlaceProps } from './placeLabel';

/**
 * Orte vorschlagen, während man tippt (Daria, 2026-11-16: „Wagnerhain“ landete in der Karten-App woanders).
 * Suchdienst: Photon (komoot GmbH, Deutschland) mit Daten von OpenStreetMap. Photon ist für die Suche beim Tippen
 * gebaut und findet auch Teilwörter; Nominatim fand „Wagnerhain“ gar nicht.
 * Die Treffer sind nach Nähe sortiert: zum Standort, falls freigegeben, sonst zum Kiez. Der Punkt geht auf etwa
 * 10 km gerundet raus. Der gewählte Vorschlag steht danach als Text im Ort, z. B.
 * „Richard-Wagner-Hain, Zentrum-West, Leipzig“, so findet ihn jede Karten-App.
 */

const API = 'https://photon.komoot.io/api/';

type Feature = { properties: PlaceProps; geometry?: { coordinates?: [number, number] } };

/** Photon kennt Deutsch, Englisch und Französisch, sonst Namen wie vor Ort */
const lang = () => (['de', 'en', 'fr'].includes(getLanguage()) ? getLanguage() : 'default');

const rough = (c: Coords): Coords => ({ latitude: Math.round(c.latitude * 10) / 10, longitude: Math.round(c.longitude * 10) / 10 });

// Browser setzen den User-Agent selbst; in der App nennt er die App (Regel des Dienstes).
const headers = Platform.OS === 'web' ? undefined : { 'User-Agent': 'KiezCoins (kontakt@kiezcoins.de)' };

async function photon(params: Record<string, string>): Promise<Feature[]> {
  const url = `${API}?${new URLSearchParams({ limit: '5', lang: lang(), ...params })}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const json = (await res.json()) as { features?: Feature[] };
  return json.features ?? [];
}

let kiezPoint: { kiez: string; coords: Coords | null } | undefined;

/** Punkt für die Sortierung: Standort (nur wenn schon freigegeben, fragt nicht), sonst der Kiez */
async function biasFor(kiez?: string): Promise<Coords | null> {
  const here = await coordsIfAllowed();
  if (here) return rough(here);
  if (!kiez) return null;
  if (kiezPoint?.kiez !== kiez) {
    const hit = await photon({ q: kiez, limit: '1' }).catch(() => []);
    const coords = hit[0]?.geometry?.coordinates;
    kiezPoint = { kiez, coords: coords ? rough({ latitude: coords[1], longitude: coords[0] }) : null };
  }
  return kiezPoint.coords;
}

const pointOf = (f: Feature): Coords | null => {
  const c = f.geometry?.coordinates;
  return c ? { latitude: c[1], longitude: c[0] } : null;
};

/** Bis zu fünf Vorschläge als Text, ohne doppelte, nahe zuerst */
export async function searchPlaces(query: string, kiez?: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const bias = await biasFor(kiez).catch(() => null);
  const near: Record<string, string> = bias ? { lat: String(bias.latitude), lon: String(bias.longitude) } : {};
  const lists = await Promise.all(queryVariants(q).map((v) => photon({ q: v, ...near }).catch(() => [])));
  let features = lists.flat();
  if (bias) {
    const far = (f: Feature) => {
      const at = pointOf(f);
      return at ? distanceMeters(bias, at) : Infinity;
    };
    features = [...features].sort((a, b) => far(a) - far(b));
  }
  return [...new Set(features.map((f) => placeLabel(f.properties)).filter(Boolean))].slice(0, 5);
}
