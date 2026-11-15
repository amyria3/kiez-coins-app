import { supabase } from '../../lib/supabase';

import type {
  Challenge,
  Gender,
  Group,
  Participant,
  Profile,
  User,
} from '../types';
import { check, FALLBACK_NAME, loadPayoutLines, PAYMENT_STATUSES, toChallenge, toPayout, toUser } from './mapping';
import { ChallengeRow, hasGenderColumn, noGenderColumn, isMissingColumn, ParticipantRow, PayoutRow, ProfileRow, selectProfiles, SettingsRow, ShareRow } from './rows';

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------

// comments(*): reply_to_id kommt mit, sobald die Migration eingespielt ist
export const CHALLENGE_COLUMNS = '*, comments(*)';

export type LiveData = {
  users: User[];
  challenges: Challenge[];
  canOfferBounties: boolean;
  groups: Group[];
  /** Personen, die Du blockiert hast (Migration 20261021000700) */
  blockedIds: string[];
};

/** Eigene Blockierungen. Leer, solange die Migration `moderation` fehlt. */
export async function loadBlockedIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('blocks').select('blocked_id');
  if (error) return new Set();
  return new Set((data ?? []).map((b) => b.blocked_id as string));
}

function hideBlocked(rows: ChallengeRow[], blocked: Set<string>): ChallengeRow[] {
  if (!blocked.size) return rows;
  return rows
    .filter((r) => !blocked.has(r.author_id))
    .map((r) => ({ ...r, comments: (r.comments ?? []).filter((c) => !blocked.has(c.author_id)) }));
}

type GroupRow = {
  id: string;
  name: string;
  founder_id: string;
  invite_code: string;
  /** fehlt, solange Migration 20261022000500_group_leaderboard_toggle aussteht */
  show_leaderboard?: boolean;
  created_at: string;
  group_members: { user_id: string; role: 'founder' | 'member'; joined_at: string }[];
};

/** Eigene Gruppen samt Mitgliedern. Leer, solange die Migration `groups` fehlt. */
async function loadGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from('groups').select('*, group_members(*)').order('created_at');
  if (error) return [];
  return ((data ?? []) as GroupRow[]).map((g) => ({
    id: g.id,
    name: g.name,
    founderId: g.founder_id,
    inviteCode: g.invite_code,
    showLeaderboard: g.show_leaderboard ?? true,
    createdAt: g.created_at,
    members: g.group_members
      .map((m) => ({ userId: m.user_id, role: m.role, joinedAt: m.joined_at }))
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
  }));
}

/** Teilnehmende und Anfragen je Challenge (Migration 20261028000300). Ohne Migration leer. */
async function loadParticipants(challengeIds: string[]): Promise<Map<string, Participant[]>> {
  const byChallenge = new Map<string, Participant[]>();
  if (!challengeIds.length) return byChallenge;
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('challenge_id, user_id, status, requested_at, joined_at')
    .in('challenge_id', challengeIds);
  if (error) return byChallenge;
  for (const r of (data ?? []) as ParticipantRow[]) {
    const list = byChallenge.get(r.challenge_id) ?? [];
    list.push({ userId: r.user_id, status: r.status, requestedAt: r.requested_at, joinedAt: r.joined_at ?? undefined });
    byChallenge.set(r.challenge_id, list);
  }
  return byChallenge;
}

/** Anzahl Likes je Challenge (Funktion like_counts). Ohne Migration leer. */
async function loadLikeCounts(ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.rpc('like_counts', { p_ids: ids });
  if (error || !data) return new Map();
  return new Map((data as { challenge_id: string; n: number }[]).map((r) => [r.challenge_id, Number(r.n)]));
}

type CommentLikes = Map<string, { n: number; mine: boolean }>;

/**
 * Likes je Kommentar (Tabelle comment_likes, Migration 20261109000100, Daria 2026-11-09).
 * Ohne Migration `null`: Die Kommentare zeigen dann kein Herz. Likes blockierter Personen zählen nicht.
 */
async function loadCommentLikes(commentIds: string[], userId: string, blocked: Set<string>): Promise<CommentLikes | null> {
  const likes: CommentLikes = new Map();
  for (let i = 0; i < commentIds.length; i += 150) {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', commentIds.slice(i, i + 150));
    if (error) return null;
    for (const r of (data ?? []) as { comment_id: string; user_id: string }[]) {
      if (blocked.has(r.user_id)) continue;
      const l = likes.get(r.comment_id) ?? { n: 0, mine: false };
      likes.set(r.comment_id, { n: l.n + 1, mine: l.mine || r.user_id === userId });
    }
  }
  return likes;
}

/** Hängt Anzahl und eigenes Like an die Kommentare. Ohne Migration bleiben sie ohne. */
function withCommentLikes(challenge: Challenge, likes: CommentLikes | null): Challenge {
  if (!likes) return challenge;
  return {
    ...challenge,
    comments: challenge.comments.map((c) => ({ ...c, likeCount: likes.get(c.id)?.n ?? 0, likedByMe: likes.get(c.id)?.mine ?? false })),
  };
}

/**
 * Wer einen Kommentar geliked hat, neueste zuerst, ohne blockierte Personen (Tabelle comment_likes,
 * Migration 20261109000100). Ohne Migration `null`.
 */
export async function loadCommentLikers(commentId: string): Promise<User[] | null> {
  const [{ data, error }, blocked] = await Promise.all([
    supabase.from('comment_likes').select('user_id').eq('comment_id', commentId).order('created_at', { ascending: false }),
    loadBlockedIds(),
  ]);
  if (error || !data) return null;
  const ids = (data as { user_id: string }[]).map((r) => r.user_id).filter((id) => !blocked.has(id));
  if (!ids.length) return [];
  const res = await selectProfiles(ids);
  if (res.error || !res.data) return null;
  const byId = new Map((res.data as ProfileRow[]).map((r) => [r.id, toUser(r)]));
  return ids.map((id) => byId.get(id)).filter((u): u is User => !!u);
}

/**
 * Wer einen Post geliked hat, neueste zuerst (Funktion challenge_likers, Migration 20261105000300).
 * Ohne Migration `null`, damit die App sagen kann, dass die Liste noch nicht geht.
 */
export async function loadLikers(challengeId: string): Promise<User[] | null> {
  const { data, error } = await supabase.rpc('challenge_likers', { p_challenge_id: challengeId });
  if (error || !data) return null;
  const ids = (data as { user_id: string }[]).map((r) => r.user_id);
  if (!ids.length) return [];
  const res = await selectProfiles(ids);
  if (res.error || !res.data) return null;
  const byId = new Map((res.data as ProfileRow[]).map((r) => [r.id, toUser(r)]));
  return ids.map((id) => byId.get(id)).filter((u): u is User => !!u);
}

/** Lädt Feed, eigene Likes, Operationsnamen, Freigaben und alle beteiligten Profile. */
export async function loadLiveData(userId: string): Promise<LiveData> {
  // Drei Runden statt sechs: alles, was nicht voneinander abhängt, geht gleichzeitig raus (2026-11-05)
  const [challengesRes, likesRes, namesRes, sharesRes, payoutRes, views, groups, blocked] = await Promise.all([
    supabase.from('challenges').select(CHALLENGE_COLUMNS).order('created_at', { ascending: false }).limit(200),
    supabase.from('likes').select('challenge_id').eq('user_id', userId),
    supabase.from('operation_names').select('challenge_id, name').eq('user_id', userId),
    supabase.from('payout_shares').select('challenge_id, user_id, method, account_holder, iban, paypal'),
    supabase.from('payout_details').select('account_holder, iban, paypal').eq('user_id', userId).maybeSingle(),
    loadViewCounts(userId),
    loadGroups(),
    loadBlockedIds(),
  ]);
  for (const res of [challengesRes, likesRes, namesRes, sharesRes, payoutRes]) check(res);

  // Blockierte Personen: ihre Challenges und Kommentare verschwinden für Dich
  const rows = hideBlocked((challengesRes.data ?? []) as unknown as ChallengeRow[], blocked);
  const liked = new Set((likesRes.data ?? []).map((l) => l.challenge_id as string));
  const names = new Map((namesRes.data ?? []).map((n) => [n.challenge_id as string, n.name as string]));
  const shares = new Map<string, ShareRow[]>();
  for (const s of (sharesRes.data ?? []) as ShareRow[]) shares.set(s.challenge_id, [...(shares.get(s.challenge_id) ?? []), s]);
  const [participants, payoutLines, likeCounts, commentLikes] = await Promise.all([
    loadParticipants(rows.filter((r) => r.type === 'individual').map((r) => r.id)),
    loadPayoutLines(rows.filter((r) => r.bounty_amount && PAYMENT_STATUSES.has(r.status)).map((r) => r.id)),
    loadLikeCounts(rows.map((r) => r.id)),
    loadCommentLikes(rows.flatMap((r) => (r.comments ?? []).map((c) => c.id)), userId, blocked),
  ]);

  const ids = new Set<string>([userId]);
  for (const r of rows) {
    ids.add(r.author_id);
    if (r.assignee_id) ids.add(r.assignee_id);
    for (const c of r.comments ?? []) ids.add(c.author_id);
    for (const p of participants.get(r.id) ?? []) ids.add(p.userId);
  }
  for (const g of groups) for (const m of g.members) ids.add(m.userId);
  const profilesRes = check(
    await selectProfiles([...ids]),
  );
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const myPayout = payoutRes.data ? toPayout(payoutRes.data as PayoutRow) : undefined;
  const me = profiles.find((p) => p.id === userId);

  const users = profiles.map((p) => toUser(p, p.id === userId ? myPayout : undefined));
  if (!me) users.push({ id: userId, name: FALLBACK_NAME, firstName: FALLBACK_NAME, payout: myPayout });

  return {
    users,
    challenges: rows.map((r) => ({
      ...withCommentLikes(toChallenge(r, {
        liked: liked.has(r.id),
        operationName: names.get(r.id),
        shares: shares.get(r.id),
        participants: participants.get(r.id),
        payouts: payoutLines.get(r.id),
        userId,
      }), commentLikes),
      ...(r.author_id === userId && views ? { views: views.get(r.id) ?? 0 } : {}),
      ...(likeCounts.size ? { likeCount: likeCounts.get(r.id) ?? 0 } : {}),
    })),
    canOfferBounties: me?.can_offer_bounties ?? true,
    groups,
    blockedIds: [...blocked],
  };
}

/** Lädt eine einzelne Challenge neu, z. B. nach einem Statuswechsel, samt der beteiligten Profile. */
export async function loadChallenge(
  id: string,
  userId: string,
): Promise<{ challenge: Challenge | null; users: User[] }> {
  const [rowRes, likeRes, nameRes, shareRes] = await Promise.all([
    supabase.from('challenges').select(CHALLENGE_COLUMNS).eq('id', id).maybeSingle(),
    supabase.from('likes').select('challenge_id').eq('challenge_id', id).eq('user_id', userId).maybeSingle(),
    supabase.from('operation_names').select('name').eq('challenge_id', id).eq('user_id', userId).maybeSingle(),
    supabase
      .from('payout_shares')
      .select('challenge_id, user_id, method, account_holder, iban, paypal')
      .eq('challenge_id', id),
  ]);
  for (const res of [rowRes, likeRes, nameRes, shareRes]) check(res);
  if (!rowRes.data) return { challenge: null, users: [] };
  const blocked = await loadBlockedIds();
  const [row] = hideBlocked([rowRes.data as unknown as ChallengeRow], blocked);
  if (!row) return { challenge: null, users: [] };
  const participants = row.type === 'individual' ? (await loadParticipants([row.id])).get(row.id) : undefined;
  const payouts =
    row.bounty_amount && PAYMENT_STATUSES.has(row.status) ? (await loadPayoutLines([row.id])).get(row.id) : undefined;
  const ids = new Set([
    row.author_id,
    ...(row.assignee_id ? [row.assignee_id] : []),
    ...row.comments.map((c) => c.author_id),
    ...(participants ?? []).map((p) => p.userId),
  ]);
  ids.delete(userId); // das eigene Profil samt Zahlungsdaten kennt die App schon
  const profilesRes = ids.size
    ? check(
        await selectProfiles([...ids]),
      )
    : { data: [] };
  const [likeCounts, commentLikes] = await Promise.all([
    loadLikeCounts([row.id]),
    loadCommentLikes(row.comments.map((c) => c.id), userId, blocked),
  ]);
  return {
    challenge: {
      ...withCommentLikes(toChallenge(row, {
        liked: !!likeRes.data,
        operationName: (nameRes.data?.name as string | undefined) ?? undefined,
        shares: (shareRes.data as ShareRow[] | null) ?? undefined,
        participants,
        payouts,
        userId,
      }), commentLikes),
      ...(likeCounts.size ? { likeCount: likeCounts.get(row.id) ?? 0 } : {}),
    },
    users: ((profilesRes.data ?? []) as ProfileRow[]).map((p) => toUser(p)),
  };
}

type OwnPublicRow = { handle: string | null; kiez: string | null; gender?: Gender | null };

/** Öffentlicher Teil des eigenen Profils, ohne die Migration 20261024000100 ohne Geschlecht */
async function selectOwnPublic(userId: string) {
  if (hasGenderColumn) {
    const res = await supabase.from('profiles').select('handle, kiez, gender').eq('id', userId).maybeSingle();
    if (!res.error) return { data: res.data as OwnPublicRow | null, error: null };
    if (!isMissingColumn(res.error)) return { data: null, error: res.error };
    noGenderColumn();
  }
  const res = await supabase.from('profiles').select('handle, kiez').eq('id', userId).maybeSingle();
  return { data: res.data as OwnPublicRow | null, error: res.error };
}

/** Profil (öffentlich und privat) der angemeldeten Person. */
export async function loadOwnProfile(userId: string): Promise<Partial<Profile> | null> {
  const [profileRes, settingsRes] = await Promise.all([
    selectOwnPublic(userId),
    supabase
      .from('profile_settings')
      .select(
        'address_form, address_custom, push, onboarded, paused_until, age_confirmed_at, terms_accepted_at, privacy_accepted_at',
      )
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  check(profileRes);
  check(settingsRes);
  if (!profileRes.data || !settingsRes.data) return null;
  const s = settingsRes.data as SettingsRow;
  return {
    handle: profileRes.data.handle ?? '',
    kiez: profileRes.data.kiez ?? undefined,
    gender: profileRes.data.gender ?? undefined,
    addressForm: s.address_form ?? undefined,
    addressCustom: s.address_custom ?? undefined,
    push: s.push,
    onboarded: s.onboarded,
    pausedUntil: s.paused_until ?? undefined,
    ageConfirmedAt: s.age_confirmed_at ?? undefined,
    termsAcceptedAt: s.terms_accepted_at ?? undefined,
    privacyAcceptedAt: s.privacy_accepted_at ?? undefined,
  };
}

/**
 * Aufrufe eigener Challenges. Die RLS liefert die Aufrufe der eigenen Challenges und die eigenen
 * Aufrufe fremder Posts (Migration 20261108000300). Die eigenen fallen hier raus.
 * `null`, solange die Migration `challenge_views` fehlt. Die App blendet die Zahl dann aus.
 */
export async function loadViewCounts(userId: string): Promise<Map<string, number> | null> {
  const { data, error } = await supabase.from('challenge_views').select('challenge_id').neq('user_id', userId).limit(10000);
  if (error) return null;
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.challenge_id, (counts.get(row.challenge_id) ?? 0) + 1);
  return counts;
}
