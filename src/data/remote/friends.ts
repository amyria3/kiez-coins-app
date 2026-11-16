import { supabase } from '../../lib/supabase';

import type {
  User,
} from '../types';
import { check, toUser } from './mapping';
import { ProfileRow, selectProfiles } from './rows';

// ---------------------------------------------------------------------------
// Bio, Webseite und Freundschaften (Migration 20261022000400_bio_friends.sql)
// ---------------------------------------------------------------------------

export type ProfileExtras = { bio: string; website: string };

/** Bio und Webseite einer Person. null bei einem Fehler. */
export async function loadProfileExtras(userId: string): Promise<ProfileExtras | null> {
  const { data, error } = await supabase.from('profiles').select('bio, website').eq('id', userId).maybeSingle();
  if (error) return null;
  return { bio: (data?.bio as string | null) ?? '', website: (data?.website as string | null) ?? '' };
}

/** Webseite vereinheitlichen: ohne Protokoll https:// davor. Leer bleibt leer. */
export function normalizeWebsite(input: string): string {
  const v = input.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export async function saveProfileExtras(userId: string, patch: Partial<ProfileExtras>): Promise<void> {
  const row: Record<string, string | null> = {};
  if (patch.bio !== undefined) row.bio = patch.bio.trim() || null;
  if (patch.website !== undefined) row.website = normalizeWebsite(patch.website) || null;
  check(await supabase.from('profiles').update(row).eq('id', userId));
}

/** none: nichts, sent: ich habe angefragt, received: ich wurde angefragt, friends: befreundet */
export type FriendState = 'none' | 'sent' | 'received' | 'friends';

type FriendshipRow = { requester_id: string; addressee_id: string; status: 'pending' | 'accepted' };

function friendStateOf(row: FriendshipRow | undefined, meId: string): FriendState {
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return row.requester_id === meId ? 'sent' : 'received';
}

/** Stand zwischen mir und einer Person. null bei einem Fehler. */
export async function loadFriendState(meId: string, otherId: string): Promise<FriendState | null> {
  const { data, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(`and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`);
  if (error) return null;
  return friendStateOf((data as FriendshipRow[])[0], meId);
}

export async function requestFriend(otherId: string) {
  check(await supabase.from('friendships').insert({ addressee_id: otherId }));
}

export async function acceptFriend(meId: string, otherId: string) {
  check(
    await supabase
      .from('friendships')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('requester_id', otherId)
      .eq('addressee_id', meId),
  );
}

/** Anfrage zurückziehen, ablehnen oder Freundschaft beenden */
export async function removeFriend(meId: string, otherId: string) {
  check(
    await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`),
  );
}

export type FriendLists = { friends: User[]; incoming: User[]; outgoing: User[] };

/** Freund:innen und offene Anfragen. null bei einem Fehler. */
export async function loadFriends(meId: string): Promise<FriendLists | null> {
  const { data, error } = await supabase.from('friendships').select('requester_id, addressee_id, status');
  if (error) return null;
  const rows = (data ?? []) as FriendshipRow[];
  const otherOf = (r: FriendshipRow) => (r.requester_id === meId ? r.addressee_id : r.requester_id);
  const ids = [...new Set(rows.map(otherOf))];
  const users = new Map<string, User>();
  if (ids.length) {
    const res = check(
      await selectProfiles(ids),
    );
    for (const p of (res.data ?? []) as ProfileRow[]) users.set(p.id, toUser(p));
  }
  const pick = (state: FriendState) =>
    rows.filter((r) => friendStateOf(r, meId) === state).flatMap((r) => users.get(otherOf(r)) ?? []);
  return { friends: pick('friends'), incoming: pick('received'), outgoing: pick('sent') };
}


// ---------------------------------------------------------------------------
// Freundschaftseinladung (Migration 20261024000200)
// ---------------------------------------------------------------------------

/** Eigener Einladungscode, beim ersten Mal angelegt. `renew` erzeugt einen neuen, der alte gilt dann nicht mehr. */
export async function myFriendInvite(renew = false): Promise<string> {
  const { data } = check(await supabase.rpc('my_friend_invite', { p_renew: renew }));
  return data as string;
}

/** Einladung annehmen. Liefert die einladende Person. */
export async function acceptFriendInvite(code: string): Promise<User | null> {
  const { data } = check(await supabase.rpc('accept_friend_invite', { p_code: code }));
  const res = check(await selectProfiles([data as string]));
  const row = ((res.data ?? []) as ProfileRow[])[0];
  return row ? toUser(row) : null;
}

/** Wer seit dem letzten Aufruf eine eigene Einladung angenommen hat. Leer bei einem Fehler. */
export async function takeNewInviteFriends(): Promise<User[]> {
  const { data, error } = await supabase.rpc('take_new_invite_friends');
  if (error || !data?.length) return [];
  const res = check(await selectProfiles(data as string[]));
  return ((res.data ?? []) as ProfileRow[]).map((p) => toUser(p));
}

/** Eigene Gruppe mit diesem Passcode, sonst null. Fragt die Datenbank direkt, unabhängig vom geladenen Stand. */
export async function myGroupByCode(code: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase.from('groups').select('id, name').eq('invite_code', code).maybeSingle();
  if (error || !data) return null;
  return data as { id: string; name: string };
}
