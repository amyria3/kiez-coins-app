import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LiveData } from './remote';
import type { Profile } from './types';

// Letzter Stand von Profil und Feed auf dem Gerät (Daria, 2026-11-05). Beim Start zeigt die App ihn sofort
// und lädt im Hintergrund neu. Gilt nur für dieselbe Person; beim Abmelden wird er gelöscht.

const KEY = 'start-cache';
/** Bei Änderungen am Format erhöhen, dann verwirft die App alte Stände. */
const VERSION = 1;

type Cache = { version: number; userId: string; profile?: Partial<Profile>; data?: LiveData };

async function read(): Promise<Cache | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const cache = raw ? (JSON.parse(raw) as Cache) : null;
    return cache?.version === VERSION ? cache : null;
  } catch {
    return null;
  }
}

/** Schreiben nacheinander, damit Profil und Feed sich nicht gegenseitig überschreiben */
let chain: Promise<void> = Promise.resolve();

function write(userId: string, patch: Pick<Cache, 'profile'> | Pick<Cache, 'data'>) {
  chain = chain.then(() => writeNow(userId, patch));
  return chain;
}

async function writeNow(userId: string, patch: Pick<Cache, 'profile'> | Pick<Cache, 'data'>) {
  try {
    const before = await read();
    const base = before?.userId === userId ? before : { version: VERSION, userId };
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...base, ...patch }));
  } catch {
    // Speicher voll oder gesperrt: dann eben ohne Vorschau beim nächsten Start
  }
}

/** Gespeicherter Stand dieser Person oder null. */
export async function readStartCache(userId: string) {
  const cache = await read();
  return cache?.userId === userId ? cache : null;
}

export const saveCachedProfile = (userId: string, profile: Partial<Profile>) => write(userId, { profile });
export const saveCachedFeed = (userId: string, data: LiveData) => write(userId, { data });

export function clearStartCache() {
  chain = chain.then(() => AsyncStorage.removeItem(KEY).catch(() => undefined));
  return chain;
}
