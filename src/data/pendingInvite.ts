import AsyncStorage from '@react-native-async-storage/async-storage';

// Einladungscode aus einem Link, der vor der Anmeldung geöffnet wurde. Nach dem Onboarding geht es damit
// direkt zu „Gruppe beitreten“ oder zur Freundschaftseinladung, die sich dort selbst annimmt.

const KEY = 'pending_invite_code';

export type InviteKind = 'group' | 'friend';
type PendingInvite = { kind: InviteKind; code: string };

export async function rememberInvite(code: string, kind: InviteKind = 'group') {
  const value: PendingInvite = { kind, code };
  await AsyncStorage.setItem(KEY, JSON.stringify(value)).catch(() => undefined);
}

/** Liest die gemerkte Einladung und löscht sie. Ältere Einträge ohne Art sind Gruppencodes. */
export async function takeInvite(): Promise<PendingInvite | null> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return null;
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
  try {
    const parsed = JSON.parse(raw) as Partial<PendingInvite>;
    if (parsed && typeof parsed.code === 'string') return { kind: parsed.kind === 'friend' ? 'friend' : 'group', code: parsed.code };
  } catch {
    // alter Eintrag: nur der Code
  }
  return { kind: 'group', code: raw };
}

/** Ziel nach dem Onboarding: die gemerkte Einladung, sonst der Feed. */
export async function homeAfterOnboarding(): Promise<string> {
  const invite = await takeInvite();
  if (!invite) return '/feed';
  const code = encodeURIComponent(invite.code);
  return invite.kind === 'friend' ? `/friends/invite?code=${code}` : `/groups/join?code=${code}`;
}
