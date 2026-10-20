import * as Location from 'expo-location';

// Standort für Kiez, Ort-Vorschlag und Entfernungen.
// Gespeichert wird nur der Kiez (Text) und bei Challenges ein auf rund 100 m gerundeter Punkt.
// Die genaue Position verlässt das Handy nicht.

export type Coords = { latitude: number; longitude: number };

export type FoundPlace = {
  /** Kiez, wie er im Profil steht: „Prenzlauer Berg, 10437 Berlin“ (ohne Ortsteil: „10437 Berlin“) */
  kiez: string;
  /** Straße ohne Hausnummer mit Postleitzahl und Ort, Vorschlag für den Ort einer Challenge */
  street?: string;
  coords: Coords;
};

export class LocationDenied extends Error {
  constructor() {
    super('Standort nicht freigegeben');
  }
}

/** Auf 3 Nachkommastellen runden: rund 100 m Genauigkeit */
export const roundCoords = ({ latitude, longitude }: Coords): Coords => ({
  latitude: Math.round(latitude * 1000) / 1000,
  longitude: Math.round(longitude * 1000) / 1000,
});

/** Aktuelle Position mit grober Genauigkeit. Fragt einmal nach der Freigabe. */
export async function currentCoords(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new LocationDenied();
  const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 1000 });
  const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

/** Position, falls schon freigegeben; fragt nicht nach. Für Entfernungen im Feed. */
export async function coordsIfAllowed(): Promise<Coords | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude };
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

/** Position in Kiez und Straße umwandeln (auf dem Gerät). */
export async function findPlace(): Promise<FoundPlace> {
  const coords = await currentCoords();
  const [address] = await Location.reverseGeocodeAsync(coords);
  if (!address) throw new Error('Kein Ort zu dieser Position gefunden.');
  const city = address.city ?? address.subregion ?? address.region ?? '';
  const area = [address.postalCode, city].filter(Boolean).join(' ');
  // Ortsteil nur, wenn er sich von der Stadt unterscheidet
  const district = address.district && address.district !== city ? address.district : undefined;
  const kiez = district ? `${district}, ${area}` : area;
  const street = address.street ? `${address.street}, ${area}` : undefined;
  if (!kiez) throw new Error('Kein Ort zu dieser Position gefunden.');
  return { kiez, street, coords };
}

/** Entfernung in Metern (Haversine) */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** „300 m“, „1,2 km“ */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(100, Math.round(meters / 100) * 100)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Postleitzahl aus einem Kiez-Text („Prenzlauer Berg, 10437 Berlin“ → „10437“) */
export const postalCodeOf = (kiez?: string) => kiez?.match(/\b\d{5}\b/)?.[0];
