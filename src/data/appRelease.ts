import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { supabase } from '../lib/supabase';

/**
 * Neue APK für Android (Daria, 2026-10-25).
 *
 * Code-Änderungen kommen per `expo-updates` von selbst. Eine neue APK braucht es nur bei Änderungen am nativen Teil.
 * Dann setzt der EAS-Workflow `.eas/workflows/android.yml` in `download_settings` die Nummer der neuen APK
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
