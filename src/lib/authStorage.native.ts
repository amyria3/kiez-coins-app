import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Speicher für die Anmeldung in der App (CRA-Risikobewertung, Befund 6, Daria, 16.11.2026).
// Die Sitzung (Zugangs- und Erneuerungs-Token) liegt im geschützten Speicher des Geräts (Android Keystore,
// iOS Keychain) statt im offenen App-Speicher. SecureStore nimmt je Eintrag nur ungefähr 2 KB, darum wird ein
// längerer Wert in Stücke geteilt. Ältere App-Versionen hatten die Sitzung in AsyncStorage: Beim ersten Lesen
// wird sie umgezogen, so bleibt man angemeldet.

const CHUNK = 1800;

/** SecureStore erlaubt in Schlüsseln nur Buchstaben, Ziffern, „.“, „-“ und „_“ */
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function readSecure(key: string): Promise<string | null> {
  const k = safeKey(key);
  const count = await SecureStore.getItemAsync(`${k}.n`);
  if (count === null) return null;
  const parts: string[] = [];
  for (let i = 0; i < Number(count); i++) {
    const part = await SecureStore.getItemAsync(`${k}.${i}`);
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function removeSecure(key: string): Promise<void> {
  const k = safeKey(key);
  const count = await SecureStore.getItemAsync(`${k}.n`);
  await SecureStore.deleteItemAsync(`${k}.n`);
  for (let i = 0; i < Number(count ?? 0); i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
}

async function writeSecure(key: string, value: string): Promise<void> {
  await removeSecure(key);
  const k = safeKey(key);
  const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [''];
  for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(`${k}.${i}`, parts[i]);
  // Die Anzahl zuletzt: Fehlt sie, gilt der Eintrag als nicht vorhanden (kein halber Wert).
  await SecureStore.setItemAsync(`${k}.n`, String(parts.length));
}

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    const value = await readSecure(key);
    if (value !== null) return value;
    const old = await AsyncStorage.getItem(key);
    if (old === null) return null;
    await writeSecure(key, old);
    await AsyncStorage.removeItem(key);
    return old;
  },
  async setItem(key: string, value: string): Promise<void> {
    await writeSecure(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await removeSecure(key);
    await AsyncStorage.removeItem(key);
  },
};
