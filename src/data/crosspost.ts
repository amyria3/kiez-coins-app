import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';
import { look } from '../theme/look';
import { countButton, isModerator } from './remote';
import { useStore } from './store';

/**
 * Weiterposten (Daria, 05.11.2026): Öffentliche Posts lassen sich zusätzlich auf anderen Plattformen veröffentlichen.
 * BlueSky und Mastodon laufen über die Edge Function `weiterposten` (kostenlos). Meta und X kommen später.
 * Noch nicht freigegeben: Solange `CROSSPOST_ACTIVE` false ist, sehen nur Moderatorinnen die echten Schalter.
 * Alle anderen sehen „Kommt bald“ und den Knopf, der Interesse an Meta und X zählt. Bezahlt wird erst ab etwa
 * 500 Interessierten. Plan und Preismodell: `Übergabe/TODO.md`, Abschnitt „Teilen“.
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

/** Plattformen, die die Edge Function schon kann */
export type LivePlatform = 'bluesky' | 'mastodon';
export const LIVE_PLATFORMS: LivePlatform[] = ['bluesky', 'mastodon'];
export const isLivePlatform = (p: CrosspostPlatform): p is LivePlatform => (LIVE_PLATFORMS as string[]).includes(p);

/** Echte Schalter sichtbar? Für alle erst mit `CROSSPOST_ACTIVE`, für Moderatorinnen schon zum Testen. */
export function useCrosspostEnabled(): boolean {
  const { mode } = useStore();
  const [moderator, setModerator] = useState(false);
  useEffect(() => {
    if (CROSSPOST_ACTIVE || mode !== 'live') return;
    isModerator().then(setModerator).catch(() => undefined);
  }, [mode]);
  return mode === 'live' && (CROSSPOST_ACTIVE || moderator);
}

export type CrosspostAccount = { platform: LivePlatform; handle: string; instance: string };

/** Verbundene Konten der angemeldeten Person, ohne Zugang. Leer, solange die Migration fehlt. */
export async function loadCrosspostAccounts(): Promise<CrosspostAccount[]> {
  const { data, error } = await supabase.from('crosspost_accounts').select('platform, handle, instance');
  if (error) return [];
  return (data ?? []) as CrosspostAccount[];
}

export async function disconnectCrosspost(platform: LivePlatform) {
  const { error } = await supabase.from('crosspost_accounts').delete().eq('platform', platform);
  if (error) throw error;
}

/** Grund aus der Antwort der Edge Function (bei Status ≠ 2xx steckt er im Body). */
async function reasonOf(error: unknown, data: { error?: string } | null): Promise<string | undefined> {
  if (data?.error) return data.error;
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === 'function') {
    return context.json().then((b: { error?: string }) => b.error).catch(() => undefined);
  }
  return undefined;
}

/**
 * Konto verbinden. BlueSky: Handle und App-Passwort. Mastodon: Instanz und Zugangsschlüssel.
 * Die Edge Function meldet sich zur Probe an und speichert den Zugang nur, wenn das klappt.
 */
export async function connectCrosspost(
  platform: LivePlatform,
  fields: { handle?: string; password?: string; instance?: string; token?: string },
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ handle?: string; error?: string }>('weiterposten', {
    body: { action: 'connect', platform, ...fields },
  });
  if (!error && data?.handle) return data.handle;
  const reason = await reasonOf(error, data);
  if (reason === 'login') {
    throw new Error(
      platform === 'bluesky'
        ? 'Anmeldung bei BlueSky hat nicht geklappt. Prüfe Handle und App-Passwort.'
        : 'Anmeldung bei Mastodon hat nicht geklappt. Prüfe Instanz und Zugangsschlüssel.',
    );
  }
  if (reason === 'input') throw new Error('Bitte fülle beide Felder aus.');
  throw new Error('Da ist etwas schiefgegangen. Versuche es bitte noch mal.');
}

/**
 * Post weiterposten. Läuft im Hintergrund nach dem Veröffentlichen; Fehler landen in `crosspost_posts`.
 * Gibt pro Plattform den Link oder den Fehler zurück.
 */
export async function crosspostChallenge(challengeId: string, platforms: LivePlatform[]) {
  if (!platforms.length) return {};
  const { data } = await supabase.functions.invoke<{ results?: Record<string, { url?: string; error?: string }> }>(
    'weiterposten',
    { body: { action: 'post', challengeId, platforms } },
  );
  return data?.results ?? {};
}

const SELECTION_KEY = 'crosspost_selection_v1';

/** Gewählte Plattformen. Die Wahl gilt auch für die nächsten Posts (auf dem Gerät gespeichert). */
export async function loadCrosspostSelection(): Promise<LivePlatform[]> {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(SELECTION_KEY)) ?? '[]');
    return Array.isArray(saved) ? saved.filter((p): p is LivePlatform => LIVE_PLATFORMS.includes(p)) : [];
  } catch {
    return [];
  }
}

export function saveCrosspostSelection(platforms: LivePlatform[]) {
  AsyncStorage.setItem(SELECTION_KEY, JSON.stringify(platforms)).catch(() => undefined);
}
