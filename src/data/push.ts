import { Platform } from 'react-native';

import { SUPABASE_URL, supabase } from '../lib/supabase';
import { disableNativePush, enableNativePush, nativePushDenied, nativePushOn } from './pushNative';

/**
 * Push-Nachrichten (Daria, 2026-11-16, Migration 20261116000300_push, Edge Function `push`).
 * Web-App: Web-Push über den Service Worker `public/sw.js`. Auf dem iPhone geht das nur in der Web-App auf dem
 * Home-Bildschirm (ab iOS 16.4). Android-App: Expo-Push (`src/data/pushNative.native.ts`).
 * Die Datenbank entscheidet, wer wann etwas bekommt (`queue_push`), die App meldet nur Geräte an und ab.
 */

export type PushCategory = 'messages' | 'challenges' | 'friends' | 'showcase';
export type PushSettings = Record<PushCategory, boolean>;

/**
 * Stand auf diesem Gerät:
 * - `on`: angemeldet, Nachrichten kommen an
 * - `off`: möglich, aber nicht angemeldet
 * - `denied`: im Browser oder System verboten
 * - `install`: iPhone im Browser, geht erst in der Web-App auf dem Home-Bildschirm
 * - `unsupported`: Browser kann kein Web-Push
 */
export type PushState = 'on' | 'off' | 'denied' | 'install' | 'unsupported';

const isIos = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () => {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
};
const webPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function pushState(): Promise<PushState> {
  if (Platform.OS !== 'web') return (await nativePushOn()) ? 'on' : (await nativePushDenied()) ? 'denied' : 'off';
  if (!webPushSupported()) return isIos() && !isStandalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

const toKey = (base64url: string) => {
  const raw = atob(base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/**
 * Dieses Gerät anmelden. Muss direkt aus einem Tippen kommen, sonst zeigt Safari die Frage nach der Erlaubnis nicht.
 * Gibt den neuen Stand zurück.
 */
export async function enablePush(): Promise<PushState> {
  if (Platform.OS !== 'web') return (await enableNativePush()) ? 'on' : pushState();
  if (!webPushSupported()) return pushState();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/push`);
  const { publicKey } = (await res.json()) as { publicKey?: string | null };
  if (!publicKey) throw new Error('Push ist auf dem Server noch nicht eingerichtet.');
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
  const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
  const { error } = await supabase.rpc('save_push_subscription', {
    p_kind: 'web',
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh ?? null,
    p_auth: json.keys?.auth ?? null,
  });
  if (error) throw error;
  return 'on';
}

/** Dieses Gerät abmelden */
export async function disablePush(): Promise<PushState> {
  if (Platform.OS !== 'web') {
    await disableNativePush();
    return pushState();
  }
  if (!webPushSupported()) return pushState();
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
    await sub.unsubscribe().catch(() => undefined);
  }
  return pushState();
}

const COLUMNS: Record<PushCategory, string> = {
  messages: 'push_messages',
  challenges: 'push_challenges',
  friends: 'push_friends',
  showcase: 'push_showcase',
};
export const ALL_ON: PushSettings = { messages: true, challenges: true, friends: true, showcase: true };

/** Schalter je Art. `null` bei einem Fehler. */
export async function loadPushSettings(userId: string): Promise<PushSettings | null> {
  const { data, error } = await supabase
    .from('profile_settings')
    .select(Object.values(COLUMNS).join(', '))
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as Record<string, boolean>;
  return Object.fromEntries(Object.entries(COLUMNS).map(([k, col]) => [k, row[col] !== false])) as PushSettings;
}

export async function savePushSetting(userId: string, category: PushCategory, on: boolean): Promise<boolean> {
  const { error } = await supabase.from('profile_settings').update({ [COLUMNS[category]]: on }).eq('user_id', userId);
  return !error;
}
