import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { supabase } from '../lib/supabase';
import { look } from '../theme/look';
import { useFeature } from './unlock';
import { loadCrosspostLook } from './crosspostLook';
import { countButton } from './remote';
import { useStore } from './store';

/**
 * Weiterposten (Daria, 05.11.2026): Öffentliche Posts lassen sich zusätzlich auf anderen Plattformen veröffentlichen.
 * BlueSky, Mastodon, Instagram, Facebook, LinkedIn (persönliches Profil, Daria, 2026-11-28) und Telegram (Daria,
 * 2026-11-28) laufen über die Edge Function `weiterposten` (kostenlos). X kommt später.
 * Freigegeben für alle (Daria, 09.11.2026, „alles außer X“). Wer die echten Schalter sieht, entscheidet das Feature
 * `weiterposten` (unlock.ts). Für X zählt ein Knopf das Interesse. Plan und Preismodell: Documentation `kiez-coins/app/TODO.md`, Abschnitt „Teilen“.
 */
export type CrosspostPlatform = 'bluesky' | 'mastodon' | 'instagram' | 'facebook' | 'linkedin' | 'telegram' | 'x';

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
  { key: 'instagram', label: 'Instagram', free: true, letter: 'I', tint: '#DD2A7B' },
  { key: 'facebook', label: 'Facebook', free: true, letter: 'f', tint: '#1877F2' },
  { key: 'linkedin', label: 'LinkedIn', free: true, letter: 'in', tint: '#0A66C2' },
  { key: 'telegram', label: 'Telegram', free: true, letter: 'T', tint: '#26A5E4' },
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
export type LivePlatform = 'bluesky' | 'mastodon' | 'instagram' | 'facebook' | 'linkedin' | 'telegram';
export const LIVE_PLATFORMS: LivePlatform[] = ['bluesky', 'mastodon', 'instagram', 'facebook', 'linkedin', 'telegram'];
export const isLivePlatform = (p: CrosspostPlatform): p is LivePlatform => (LIVE_PLATFORMS as string[]).includes(p);

/**
 * Aus exklusiven Schaufenstern geht es nur hierhin (Daria, 2026-11-28): Telegram erreicht nur Chat, Kanäle und
 * Gruppen, die der Betrieb selbst wählt. Die Edge Function prüft das noch einmal.
 */
export const EXCLUSIVE_PLATFORMS: LivePlatform[] = ['telegram'];

/** Instagram und Facebook brauchen nur einen Zugangs-Token, kein zweites Feld */
export const tokenOnly = (p: LivePlatform) => p === 'instagram' || p === 'facebook';

/** LinkedIn verbindet per Anmeldung bei LinkedIn, Telegram per „Starten“ im Chat mit dem Bot, beide ohne Felder */
export const viaLogin = (p: LivePlatform) => p === 'linkedin' || p === 'telegram';

/** Echte Schalter sichtbar? Feature `weiterposten` (unlock.ts), nur mit echten Daten. */
export function useCrosspostEnabled(): boolean {
  const { mode } = useStore();
  const on = useFeature('weiterposten');
  return mode === 'live' && on;
}

/** expires_at: Ablauf des Zugangs, nur bei LinkedIn (60 Tage) */
export type CrosspostAccount = { platform: LivePlatform; handle: string; instance: string; expires_at?: string | null };

/** Verbundene Konten der angemeldeten Person, ohne Zugang. Leer bei einem Fehler. */
export async function loadCrosspostAccounts(): Promise<CrosspostAccount[]> {
  const { data, error } = await supabase.from('crosspost_accounts').select('platform, handle, instance, expires_at');
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
 * Konto verbinden. BlueSky: Handle und App-Passwort. Mastodon: Instanz und Zugangs-Token.
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
        : platform === 'mastodon'
          ? 'Anmeldung bei Mastodon hat nicht geklappt. Prüfe Instanz und Zugangs-Token.'
          : platform === 'instagram'
            ? 'Anmeldung bei Instagram hat nicht geklappt. Prüfe den Zugangs-Token.'
            : 'Anmeldung bei Facebook hat nicht geklappt. Prüfe den Seiten-Zugangs-Token.',
    );
  }
  if (reason === 'input') throw new Error(tokenOnly(platform) ? 'Bitte trage den Zugangs-Token ein.' : 'Bitte fülle beide Felder aus.');
  throw new Error('Da ist etwas schiefgegangen. Versuche es bitte noch mal.');
}

/** Zugang abgelaufen oder läuft in den nächsten 7 Tagen ab: Die App bietet „Neu verbinden“ an */
export const expiresSoon = (account: CrosspostAccount) =>
  !!account.expires_at && new Date(account.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

/**
 * LinkedIn verbinden (Daria, 2026-11-28): Die Edge Function legt die Anmeldung an und gibt die Adresse von LinkedIn
 * zurück. Nach dem „Zulassen“ leitet `linkedin-anmeldung` zurück auf diese Seite, mit `?linkedin=ok` oder `fehler`.
 * Web: im selben Fenster. App: im Browser, zurück über kiezcoins://.
 */
export async function startLinkedin(): Promise<void> {
  // Zurück zum Abschnitt Weiterposten unter Dein Konto › Funktionen
  const returnTo =
    Platform.OS === 'web'
      ? `${window.location.origin}/account/features?abschnitt=weiterposten`
      : Linking.createURL('account/features', { queryParams: { abschnitt: 'weiterposten' } });
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>('weiterposten', {
    body: { action: 'linkedin_start', returnTo },
  });
  if (!error && data?.url) {
    if (Platform.OS === 'web') window.location.assign(data.url);
    else await Linking.openURL(data.url);
    return;
  }
  const reason = await reasonOf(error, data);
  throw new Error(
    reason === 'not_configured'
      ? 'LinkedIn ist bei KiezCoins noch nicht eingerichtet. Versuche es bitte später noch mal.'
      : 'Da ist etwas schiefgegangen. Versuche es bitte noch mal.',
  );
}

/**
 * Telegram verbinden (Daria, 2026-11-28): Die Edge Function gibt den Link zum KiezCoins-Bot mit einem Code zurück
 * (t.me/<bot>?start=<code>, 10 Minuten gültig). „Starten“ in Telegram verbindet; die App merkt das beim Nachladen der
 * Konten (CrosspostSwitches fragt nach, bis die Verbindung da ist).
 */
export async function startTelegram(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>('weiterposten', {
    body: { action: 'telegram_start' },
  });
  if (!error && data?.url) {
    // Web: neuer Tab, damit KiezCoins offen bleibt; auf dem Handy öffnet der Link die Telegram-App
    if (Platform.OS === 'web') window.open(data.url, '_blank', 'noopener');
    else await Linking.openURL(data.url);
    return;
  }
  const reason = await reasonOf(error, data);
  throw new Error(
    reason === 'not_configured'
      ? 'Telegram ist bei KiezCoins noch nicht eingerichtet. Versuche es bitte später noch mal.'
      : 'Da ist etwas schiefgegangen. Versuche es bitte noch mal.',
  );
}

/** Kanal oder Gruppe, in die der KiezCoins-Bot für die Person direkt postet */
export type TelegramChat = { chat_id: number; title: string; kind: 'channel' | 'group' | 'supergroup'; username: string | null };

/** Benutzername des Bots und die Kanäle und Gruppen der Person. Leer bei einem Fehler. */
export async function loadTelegramChats(): Promise<{ bot: string; chats: TelegramChat[] }> {
  const { data, error } = await supabase.functions.invoke<{ bot?: string; chats?: TelegramChat[] }>('weiterposten', {
    body: { action: 'telegram_chats' },
  });
  if (error || !data) return { bot: '', chats: [] };
  return { bot: data.bot ?? '', chats: data.chats ?? [] };
}

/** Dort nicht mehr posten: Der Bot verlässt den Kanal oder die Gruppe */
export async function removeTelegramChat(chatId: number): Promise<TelegramChat[]> {
  const { data, error } = await supabase.functions.invoke<{ chats?: TelegramChat[] }>('weiterposten', {
    body: { action: 'telegram_remove', chatId },
  });
  if (error || !data?.chats) throw new Error('Da ist etwas schiefgegangen. Versuche es bitte noch mal.');
  return data.chats;
}

/**
 * Post weiterposten. Läuft im Hintergrund nach dem Veröffentlichen; Fehler landen in `crosspost_posts`.
 * Gibt pro Plattform den Link oder den Fehler zurück.
 */
export async function crosspostChallenge(challengeId: string, platforms: LivePlatform[]) {
  if (!platforms.length) return {};
  // Rahmen und Logo wie unter Funktionen gewählt (Daria, 13.11.2026)
  const look = await loadCrosspostLook();
  const { data } = await supabase.functions.invoke<{ results?: Record<string, { url?: string; error?: string }> }>(
    'weiterposten',
    { body: { action: 'post', challengeId, platforms, look } },
  );
  return data?.results ?? {};
}

/**
 * Termin aus dem Schaufenster weiterposten (Daria, 2026-11-18). Wie crosspostChallenge; Fehler landen in
 * `crosspost_event_posts` (Migration 20261118000400). Der Link führt zur öffentlichen Seite des Schaufensters.
 */
export async function crosspostEvent(eventId: string, platforms: LivePlatform[]) {
  if (!platforms.length) return {};
  const look = await loadCrosspostLook();
  const { data } = await supabase.functions.invoke<{ results?: Record<string, { url?: string; error?: string }> }>(
    'weiterposten',
    { body: { action: 'post_event', eventId, platforms, look } },
  );
  return data?.results ?? {};
}

/**
 * Weiterposten für Me-Challenges (Daria, 2026-11-16: „nach dem Nachher“): Die Auswahl beim Vorher merkt sich das
 * Gerät je Me-Challenge. Beim Nachher steht sie wieder da und lässt sich ändern; mit „Abschließen und posten“ geht
 * der Post weiter. Schließt der Server eine Me-Challenge selbst ab (nach 48 h oder 7 Tagen), geht nichts weiter.
 */
const meKey = (challengeId: string) => `weiterposten-me:${challengeId}`;
export async function rememberMeCrosspostOff(challengeId: string, off: LivePlatform[]) {
  await AsyncStorage.setItem(meKey(challengeId), JSON.stringify(off)).catch(() => undefined);
}
export async function loadMeCrosspostOff(challengeId: string): Promise<LivePlatform[]> {
  try {
    const raw = await AsyncStorage.getItem(meKey(challengeId));
    return raw ? (JSON.parse(raw) as LivePlatform[]) : [];
  } catch {
    return [];
  }
}
/** Nach dem Nachher: weiterposten (im Hintergrund, Fehler stehen in crosspost_posts) und die Auswahl vergessen */
export function crosspostMeChallenge(challengeId: string, off: LivePlatform[]) {
  AsyncStorage.removeItem(meKey(challengeId)).catch(() => undefined);
  loadCrosspostSelection()
    .then((platforms) => crosspostChallenge(challengeId, platforms.filter((p) => !off.includes(p))))
    .catch(() => undefined);
}

/** Ein Weiterpost eines eigenen Posts: Plattform, Stand und Adresse dort */
export type CrosspostState = { platform: LivePlatform; status: 'running' | 'ok' | 'error'; url?: string };

/**
 * Eigene Weiterposts je Post, für die Karten in „Meine Posts“ (Daria, 15.11.2026). Wieder gelöschte (beim Löschen
 * des Posts mitgelöscht) fehlen. Leer bei einem Fehler.
 */
export async function loadOwnCrossposts(): Promise<Map<string, CrosspostState[]>> {
  const result = new Map<string, CrosspostState[]>();
  const { data, error } = await supabase.from('crosspost_posts').select('challenge_id, platform, status, url, error');
  if (error || !data) return result;
  for (const row of data as { challenge_id: string; platform: string; status: CrosspostState['status']; url: string | null; error: string | null }[]) {
    if (row.error === 'deleted' || !(LIVE_PLATFORMS as string[]).includes(row.platform)) continue;
    const item: CrosspostState = { platform: row.platform as LivePlatform, status: row.status, url: row.url ?? undefined };
    result.set(row.challenge_id, [...(result.get(row.challenge_id) ?? []), item]);
  }
  return result;
}

/** Name der Plattform für Texte */
export const platformLabel = (p: CrosspostPlatform) => CROSSPOST_PLATFORMS.find((x) => x.key === p)?.label ?? p;

/**
 * Plattformen für die Rückfrage beim Löschen (dort weitergepostet) oder Wiederherstellen (beim Löschen mitgelöscht).
 * Leer, wenn es keine gibt: Dann reicht die normale Rückfrage.
 */
export async function crosspostTargets(challengeId: string, kind: 'delete' | 'restore'): Promise<LivePlatform[]> {
  let query = supabase.from('crosspost_posts').select('platform').eq('challenge_id', challengeId);
  query = kind === 'delete' ? query.eq('status', 'ok') : query.eq('error', 'deleted');
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((d) => d.platform as string).filter((p): p is LivePlatform => (LIVE_PLATFORMS as string[]).includes(p));
}

const SELECTION_KEY = 'crosspost_selection_v1';

/**
 * Gewählte Plattformen. Die Wahl gilt auch für die nächsten Posts (auf dem Gerät gespeichert). Hat dieses Gerät
 * noch keine Wahl, gelten alle verbundenen Konten (Daria, 2026-11-15: In der Web-App auf dem iPhone war Weiterposten
 * sonst stumm aus, obwohl die Konten verbunden sind).
 */
export async function loadCrosspostSelection(): Promise<LivePlatform[]> {
  try {
    const raw = await AsyncStorage.getItem(SELECTION_KEY);
    if (raw === null) return (await loadCrosspostAccounts()).map((a) => a.platform);
    const saved = JSON.parse(raw);
    return Array.isArray(saved) ? saved.filter((p): p is LivePlatform => LIVE_PLATFORMS.includes(p)) : [];
  } catch {
    return [];
  }
}

export function saveCrosspostSelection(platforms: LivePlatform[]) {
  AsyncStorage.setItem(SELECTION_KEY, JSON.stringify(platforms)).catch(() => undefined);
}
