import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { look } from '../theme/look';
import { countButton } from './remote';

/**
 * Weiterposten (Daria, 05.11.2026): Öffentliche Posts lassen sich zusätzlich auf anderen Plattformen veröffentlichen.
 * Noch nicht freigegeben: Solange `CROSSPOST_ACTIVE` false ist, zeigt das Blatt alle Plattformen als „Kommt bald“
 * und zählt nur, wer die Funktion für Meta und X nutzen würde. Bezahlt wird erst ab etwa 500 Interessierten.
 * Plan und Preismodell: `Übergabe/TODO.md`, Abschnitt „Teilen“.
 */
export const CROSSPOST_ACTIVE = false;

export type CrosspostPlatform = 'bluesky' | 'mastodon' | 'instagram' | 'facebook' | 'x';

export const CROSSPOST_PLATFORMS: {
  key: CrosspostPlatform;
  label: string;
  /** Kostenlos (BlueSky, Mastodon) oder im Paket (Meta, X) */
  free: boolean;
  /** Buchstabe und Farbe als Platzhalter, bis es eigene Icons gibt */
  letter: string;
  tint: string;
}[] = [
  { key: 'bluesky', label: 'BlueSky', free: true, letter: 'B', tint: '#1185FE' },
  { key: 'mastodon', label: 'Mastodon', free: true, letter: 'M', tint: '#6364FF' },
  { key: 'instagram', label: 'Instagram', free: false, letter: 'I', tint: '#DD2A7B' },
  { key: 'facebook', label: 'Facebook', free: false, letter: 'f', tint: '#1877F2' },
  { key: 'x', label: 'X', free: false, letter: 'X', tint: '#000000' },
];

/** Knopf in `button_presses` (Migration 20261031000100), ausgewertet im Umfrage-Ergebnis */
export const CROSSPOST_INTEREST_BUTTON = 'weiterposten-meta-x';
const INTEREST_KEY = 'crosspost_interest_v1';

/**
 * „Ich würde diese Funktion für Meta und X nutzen“: zählt einmal pro Gerät, ohne Person.
 * Gibt zurück, ob das Gerät schon gezählt ist, und die Funktion zum Zählen.
 */
export function useCrosspostInterest(): [boolean, () => void] {
  const [counted, setCounted] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(INTEREST_KEY)
      .then((v) => setCounted(v === '1'))
      .catch(() => undefined);
  }, []);
  const count = () => {
    if (counted) return;
    setCounted(true);
    countButton(CROSSPOST_INTEREST_BUTTON, look);
    AsyncStorage.setItem(INTEREST_KEY, '1').catch(() => undefined);
  };
  return [counted, count];
}
