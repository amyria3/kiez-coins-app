import AsyncStorage from '@react-native-async-storage/async-storage';

// Einladungscode aus einem Link, der vor der Anmeldung geöffnet wurde. Nach dem Onboarding geht es damit
// direkt zu „Gruppe beitreten“.

const KEY = 'pending_invite_code';

export async function rememberInvite(code: string) {
  await AsyncStorage.setItem(KEY, code).catch(() => undefined);
}

/** Liest den gemerkten Code und löscht ihn. */
export async function takeInvite(): Promise<string | null> {
  const code = await AsyncStorage.getItem(KEY).catch(() => null);
  if (code) await AsyncStorage.removeItem(KEY).catch(() => undefined);
  return code;
}

/** Ziel nach dem Onboarding: „Gruppe beitreten“ mit gemerktem Code, sonst der Feed. */
export async function homeAfterOnboarding(): Promise<string> {
  const code = await takeInvite();
  return code ? `/gruppen/beitreten?code=${encodeURIComponent(code)}` : '/feed';
}
