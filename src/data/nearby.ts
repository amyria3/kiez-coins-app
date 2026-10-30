import { useEffect, useState } from 'react';

import { coordsIfAllowed, distanceMeters, KIEZ_RADIUS_METERS, type Coords } from './location';
import type { Challenge } from './types';

/**
 * Liegt eine Challenge im Kiez (Daria, 29.10.2026)? Bis 5 km vom eigenen Standort. Ohne Standortfreigabe zählt der
 * Kiez-Name aus dem Profil. Challenges ohne Punkt und eigene Beiträge zählen immer zum Kiez. Gleiche Regel wie im Feed.
 */
export function isInKiez(c: Challenge, here: Coords | null, myKiez: string | undefined, me: string): boolean {
  if (c.authorId === me) return true;
  if (here) return !c.coords || distanceMeters(here, c.coords) <= KIEZ_RADIUS_METERS;
  const mine = myKiez?.split(',')[0].trim().toLowerCase();
  return !mine || !c.kiez || c.kiez.split(',')[0].trim().toLowerCase() === mine;
}

/** Eigener Standort, nur wenn schon freigegeben; sonst null */
export function useHere(): Coords | null {
  const [here, setHere] = useState<Coords | null>(null);
  useEffect(() => {
    let active = true;
    coordsIfAllowed().then((c) => active && setHere(c));
    return () => {
      active = false;
    };
  }, []);
  return here;
}
