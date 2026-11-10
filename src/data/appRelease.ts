import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';

import { supabase } from '../lib/supabase';

/**
 * Neue APK für Android (Daria, 2026-10-25).
 *
 * Code-Änderungen kommen per `expo-updates` von selbst. Eine neue APK braucht es nur bei Änderungen am nativen Teil.
 * Dann setzt der Workflow `.github/workflows/android.yml` in `download_settings` die Nummer der neuen APK
 * (`latest_version_code`). Die App vergleicht sie mit ihrer eigenen Nummer (versionCode) und zeigt den Hinweis.
 */

export type Release = { latest: number | null; min: number | null };

const APK = 'kiez-coins.apk';
const DOWNLOAD_PAGE = 'https://kiezcoins.de/#download';

/** versionCode der installierten APK. Leer im Web, auf dem iPhone und in Expo Go, das eine eigene Nummer hat. */
export function installedVersionCode(): number | null {
  if (Platform.OS !== 'android' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  const code = Number(Application.nativeBuildVersion);
  return Number.isInteger(code) && code > 0 ? code : null;
}

export async function fetchRelease(): Promise<Release> {
  const { data, error } = await supabase.rpc('app_release');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { latest_version_code: number | null; min_version_code: number | null } | undefined;
  return { latest: row?.latest_version_code ?? null, min: row?.min_version_code ?? null };
}

/** 10 Minuten gültiger Link zur APK. Ohne Link (keine Rechte, keine Datei) führt der Weg zur Download-Seite. */
export async function apkDownloadUrl(): Promise<string> {
  const { data } = await supabase.storage.from('downloads').createSignedUrl(APK, 600, { download: APK });
  return data?.signedUrl ?? DOWNLOAD_PAGE;
}

/**
 * Stand der App für „Dein Konto › App-Version“ (Daria, 2026-11-10).
 * `apk`: Eine neuere APK liegt bereit (neuer nativer Teil), also herunterladen und installieren.
 * `update`: Ein neues Code-Update (expo-updates) liegt bereit, also laden und neu starten.
 * `current`: Nichts Neues. `web`: Der Browser holt beim Laden immer die neueste Version.
 * `dev`: Expo Go oder Entwicklung, dort gibt es keine Updates.
 */
export type VersionState =
  | { kind: 'apk'; latest: number }
  | { kind: 'update' }
  | { kind: 'current' }
  | { kind: 'web' }
  | { kind: 'dev' };

/** Kurzer Name der installierten Version, z. B. „Version 3“. Ohne Netz, für die Zeile im Konto. */
export function installedVersionLabel(): string {
  if (Platform.OS === 'web') return 'Web-App';
  const code = installedVersionCode();
  return code === null ? 'Entwicklung' : `Version ${code}`;
}

/** Datum des laufenden Code-Stands: vom letzten Update, sonst vom Bau der APK. */
export function installedSince(): Date | null {
  return Updates.isEnabled ? Updates.createdAt : null;
}

/** Fragt erst nach einer neuen APK, dann nach einem Code-Update. Wirft bei fehlendem Netz. */
export async function checkVersion(): Promise<VersionState> {
  if (Platform.OS === 'web') return { kind: 'web' };
  const installed = installedVersionCode();
  if (Platform.OS === 'android') {
    if (installed === null) return { kind: 'dev' };
    const { latest } = await fetchRelease();
    if (latest !== null && latest > installed) return { kind: 'apk', latest };
  }
  if (__DEV__ || !Updates.isEnabled) return { kind: Platform.OS === 'android' ? 'current' : 'dev' };
  const result = await Updates.checkForUpdateAsync();
  return result.isAvailable ? { kind: 'update' } : { kind: 'current' };
}

/** Lädt das Code-Update und startet die App damit neu. */
export async function installUpdateAndRestart(): Promise<void> {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}
