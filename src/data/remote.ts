import { supabase } from '../lib/supabase';
import type {
  Challenge,
  ChallengeStatus,
  ImageSource,
  Payout,
  PayoutMethod,
  PayoutShare,
  Profile,
  User,
  UserReportReason,
} from './types';

// Zugriff auf die Supabase-Tabellen (Schema: supabase/migrations).
// Statuswechsel laufen über Datenbankfunktionen, die Rolle und Status prüfen.

const PHOTO_BUCKET = 'photos';

// ---------------------------------------------------------------------------
// Zeilen aus der Datenbank
// ---------------------------------------------------------------------------

type ProfileRow = {
  id: string;
  handle: string | null;
  avatar_path: string | null;
  kiez: string | null;
  is_group: boolean;
  can_offer_bounties: boolean;
};

type SettingsRow = {
  address_form: Profile['addressForm'] | null;
  address_custom: string | null;
  push: boolean;
  onboarded: boolean;
  paused_until: string | null;
  age_confirmed_at: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
};

type CommentRow = { id: string; author_id: string; body: string; created_at: string };

type ChallengeRow = {
  id: string;
  type: Challenge['type'];
  title: string;
  body: string;
  challenge_text: string | null;
  author_id: string;
  assignee_id: string | null;
  location: string;
  kiez: string | null;
  bounty_amount: number | null;
  status: ChallengeStatus;
  image_path: string | null;
  image_before_path: string | null;
  image_after_path: string | null;
  deadline: string;
  created_at: string;
  accepted_at: string | null;
  report_photo_path: string | null;
  report_note: string | null;
  rejection_reason: string | null;
  confirmed_at: string | null;
  paid_marked_at: string | null;
  comments: CommentRow[];
};

type ShareRow = {
  challenge_id: string;
  method: PayoutMethod;
  account_holder: string | null;
  iban: string | null;
  paypal: string | null;
};

type PayoutRow = { account_holder: string | null; iban: string | null; paypal: string | null };

// ---------------------------------------------------------------------------
// Umwandlung in die Typen der App
// ---------------------------------------------------------------------------

export function photoUrl(path: string | null | undefined): ImageSource | undefined {
  if (!path) return undefined;
  return { uri: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
}

const FALLBACK_NAME = 'Neue Crew';

function toPayout(row: PayoutRow): Payout {
  return { accountHolder: row.account_holder ?? '', iban: row.iban ?? '', paypal: row.paypal ?? undefined };
}

function toUser(row: ProfileRow, payout?: Payout): User {
  const name = row.handle ?? FALLBACK_NAME;
  return {
    id: row.id,
    name,
    firstName: name,
    avatar: photoUrl(row.avatar_path),
    location: row.kiez ?? undefined,
    group: row.is_group,
    payout,
  };
}

function toShare(row: ShareRow | undefined): PayoutShare | undefined {
  if (!row) return undefined;
  return { method: row.method, payout: toPayout(row) };
}

function toChallenge(
  row: ChallengeRow,
  extra: { liked: boolean; operationName?: string; share?: ShareRow },
): Challenge {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    text: row.body,
    challengeText: row.challenge_text ?? undefined,
    authorId: row.author_id,
    assigneeId: row.assignee_id ?? undefined,
    location: row.location,
    kiez: row.kiez ?? undefined,
    bountyAmount: row.bounty_amount ?? undefined,
    status: row.status,
    image: photoUrl(row.image_path),
    imageBefore: photoUrl(row.image_before_path),
    imageAfter: photoUrl(row.image_after_path),
    likedByMe: extra.liked,
    deadline: row.deadline,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined,
    operationName: extra.operationName,
    report: row.report_photo_path
      ? { photo: photoUrl(row.report_photo_path)!, note: row.report_note ?? undefined }
      : undefined,
    payoutShare: toShare(extra.share),
    comments: [...(row.comments ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({ id: c.id, authorId: c.author_id, body: c.body, createdAt: c.created_at })),
    rejectionReason: row.rejection_reason ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    paidMarkedAt: row.paid_marked_at ?? undefined,
  };
}

/** Fehler aus Supabase als Satz, den man der Person zeigen kann. */
export function errorText(error: unknown): string {
  const e = error as { message?: string; hint?: string; code?: string } | null;
  if (e?.hint === 'invalid_transition') {
    return 'Das geht gerade nicht mehr. Jemand war schneller oder der Stand hat sich geändert. Ich lade neu.';
  }
  if (e?.code === 'P0001' && e.message) return e.message;
  if (e?.code === '23505') return 'Diesen Decknamen gibt es schon. Such Dir bitte einen anderen aus.';
  if (e?.code === '42501') return 'Das darfst Du gerade nicht. Hast Du schon Deinen Kiez festgelegt?';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Keine Verbindung. Prüf Dein Internet und versuch es noch mal.';
  return 'Da ist etwas schiefgegangen. Versuch es bitte noch mal.';
}

function check<T extends { error: unknown }>(result: T): T {
  if (result.error) throw result.error;
  return result;
}

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------

const CHALLENGE_COLUMNS = '*, comments(id, author_id, body, created_at)';

export type LiveData = { users: User[]; challenges: Challenge[]; canOfferBounties: boolean };

/** Lädt Feed, eigene Likes, Operationsnamen, Freigaben und alle beteiligten Profile. */
export async function loadLiveData(userId: string): Promise<LiveData> {
  const [challengesRes, likesRes, namesRes, sharesRes, payoutRes] = await Promise.all([
    supabase.from('challenges').select(CHALLENGE_COLUMNS).order('created_at', { ascending: false }).limit(200),
    supabase.from('likes').select('challenge_id').eq('user_id', userId),
    supabase.from('operation_names').select('challenge_id, name').eq('user_id', userId),
    supabase.from('payout_shares').select('challenge_id, method, account_holder, iban, paypal'),
    supabase.from('payout_details').select('account_holder, iban, paypal').eq('user_id', userId).maybeSingle(),
  ]);
  for (const res of [challengesRes, likesRes, namesRes, sharesRes, payoutRes]) check(res);

  const rows = (challengesRes.data ?? []) as unknown as ChallengeRow[];
  const liked = new Set((likesRes.data ?? []).map((l) => l.challenge_id as string));
  const names = new Map((namesRes.data ?? []).map((n) => [n.challenge_id as string, n.name as string]));
  const shares = new Map(((sharesRes.data ?? []) as ShareRow[]).map((s) => [s.challenge_id, s]));

  const ids = new Set<string>([userId]);
  for (const r of rows) {
    ids.add(r.author_id);
    if (r.assignee_id) ids.add(r.assignee_id);
    for (const c of r.comments ?? []) ids.add(c.author_id);
  }
  const profilesRes = check(
    await supabase
      .from('profiles')
      .select('id, handle, avatar_path, kiez, is_group, can_offer_bounties')
      .in('id', [...ids]),
  );
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const myPayout = payoutRes.data ? toPayout(payoutRes.data as PayoutRow) : undefined;
  const me = profiles.find((p) => p.id === userId);

  const users = profiles.map((p) => toUser(p, p.id === userId ? myPayout : undefined));
  if (!me) users.push({ id: userId, name: FALLBACK_NAME, firstName: FALLBACK_NAME, payout: myPayout });

  return {
    users,
    challenges: rows.map((r) =>
      toChallenge(r, { liked: liked.has(r.id), operationName: names.get(r.id), share: shares.get(r.id) }),
    ),
    canOfferBounties: me?.can_offer_bounties ?? true,
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
      .select('challenge_id, method, account_holder, iban, paypal')
      .eq('challenge_id', id)
      .maybeSingle(),
  ]);
  for (const res of [rowRes, likeRes, nameRes, shareRes]) check(res);
  if (!rowRes.data) return { challenge: null, users: [] };
  const row = rowRes.data as unknown as ChallengeRow;
  const ids = new Set([row.author_id, ...(row.assignee_id ? [row.assignee_id] : []), ...row.comments.map((c) => c.author_id)]);
  ids.delete(userId); // das eigene Profil samt Zahlungsdaten kennt die App schon
  const profilesRes = ids.size
    ? check(
        await supabase
          .from('profiles')
          .select('id, handle, avatar_path, kiez, is_group, can_offer_bounties')
          .in('id', [...ids]),
      )
    : { data: [] };
  return {
    challenge: toChallenge(row, {
      liked: !!likeRes.data,
      operationName: (nameRes.data?.name as string | undefined) ?? undefined,
      share: (shareRes.data as ShareRow | null) ?? undefined,
    }),
    users: ((profilesRes.data ?? []) as ProfileRow[]).map((p) => toUser(p)),
  };
}

/** Profil (öffentlich und privat) der angemeldeten Person. */
export async function loadOwnProfile(userId: string): Promise<Partial<Profile> | null> {
  const [profileRes, settingsRes] = await Promise.all([
    supabase.from('profiles').select('handle, kiez').eq('id', userId).maybeSingle(),
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

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------

/** Speichert Profil und Einstellungen. Wirft bei Fehlern (z. B. Deckname vergeben). */
export async function saveOwnProfile(userId: string, profile: Profile): Promise<void> {
  check(
    await supabase
      .from('profiles')
      .update({ handle: profile.handle.trim() || null, kiez: profile.kiez ?? null })
      .eq('id', userId),
  );
  check(
    await supabase
      .from('profile_settings')
      .update({
        address_form: profile.addressForm ?? null,
        address_custom: profile.addressForm === 'custom' ? (profile.addressCustom ?? null) : null,
        push: profile.push,
        onboarded: profile.onboarded,
        paused_until: profile.pausedUntil ?? null,
        age_confirmed_at: profile.ageConfirmedAt ?? null,
        terms_accepted_at: profile.termsAcceptedAt ?? null,
        privacy_accepted_at: profile.privacyAcceptedAt ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId),
  );
}

/** Deckname sofort speichern, damit „gibt es schon“ direkt beim Eingeben auffällt. Gibt eine Fehlermeldung zurück oder null. */
export async function saveHandle(userId: string, handle: string): Promise<string | null> {
  const { error } = await supabase.from('profiles').update({ handle: handle.trim() }).eq('id', userId);
  return error ? errorText(error) : null;
}

/** Lädt ein Foto vom Gerät in den eigenen Ordner hoch und gibt den Pfad zurück. */
export async function uploadPhoto(userId: string, photo: ImageSource): Promise<string> {
  const uri = typeof photo === 'object' && photo && 'uri' in photo ? photo.uri : undefined;
  if (!uri) throw new Error('Foto ohne Datei');
  // fetch + arrayBuffer funktioniert in React Native für lokale Dateien (file://) und im Browser (blob:, data:).
  const response = await fetch(uri);
  const header = response.headers.get('content-type') ?? '';
  const fromUri = /\.(png|webp|heic)$/i.exec(uri)?.[1]?.toLowerCase();
  const contentType = header.startsWith('image/') ? header.split(';')[0] : fromUri ? `image/${fromUri}` : 'image/jpeg';
  const ext = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = await response.arrayBuffer();
  check(await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType, upsert: false }));
  return path;
}

export type NewChallenge = {
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  deadline: string;
  photo: ImageSource;
};

/** Neue Challenge anlegen. Gibt die gespeicherte Challenge zurück. */
export async function createChallenge(userId: string, draft: NewChallenge): Promise<Challenge> {
  const imagePath = await uploadPhoto(userId, draft.photo);
  const { data } = check(
    await supabase
      .from('challenges')
      .insert({
        author_id: userId,
        title: draft.title,
        body: draft.text,
        location: draft.location,
        bounty_amount: draft.bountyAmount ?? null,
        deadline: draft.deadline,
        image_path: imagePath,
      })
      .select(CHALLENGE_COLUMNS)
      .single(),
  );
  return toChallenge(data as unknown as ChallengeRow, { liked: false });
}

const rpc = async (fn: string, args: Record<string, unknown>) => {
  check(await supabase.rpc(fn, args));
};

export const challengeActions = {
  accept: (id: string) => rpc('accept_challenge', { p_challenge_id: id }),
  giveBack: (id: string) => rpc('give_back_challenge', { p_challenge_id: id }),
  report: (id: string, photoPath: string, note?: string) =>
    rpc('report_challenge', { p_challenge_id: id, p_photo_path: photoPath, p_note: note ?? null }),
  confirm: (id: string) => rpc('confirm_challenge', { p_challenge_id: id }),
  undoConfirm: (id: string) => rpc('undo_confirm_challenge', { p_challenge_id: id }),
  reject: (id: string, reason: string) => rpc('reject_challenge', { p_challenge_id: id, p_reason: reason }),
  markPaid: (id: string) => rpc('mark_challenge_paid', { p_challenge_id: id }),
  unmarkPaid: (id: string) => rpc('unmark_challenge_paid', { p_challenge_id: id }),
  confirmReceived: (id: string) => rpc('confirm_bounty_received', { p_challenge_id: id }),
};

export async function nameOperation(userId: string, challengeId: string, name: string) {
  // Erst löschen, dann neu anlegen: Ändern ist nur für den Namen erlaubt, nicht für die Challenge.
  check(await supabase.from('operation_names').delete().eq('challenge_id', challengeId).eq('user_id', userId));
  check(await supabase.from('operation_names').insert({ challenge_id: challengeId, user_id: userId, name }));
}

export async function addComment(challengeId: string, body: string) {
  check(await supabase.from('comments').insert({ challenge_id: challengeId, body }));
}

export async function setLike(challengeId: string, userId: string, liked: boolean) {
  if (liked) check(await supabase.from('likes').insert({ challenge_id: challengeId }));
  else check(await supabase.from('likes').delete().eq('challenge_id', challengeId).eq('user_id', userId));
}

export async function sharePayout(challengeId: string, share: PayoutShare) {
  check(await supabase.from('payout_shares').delete().eq('challenge_id', challengeId));
  check(
    await supabase.from('payout_shares').insert({
      challenge_id: challengeId,
      method: share.method,
      account_holder: share.payout.accountHolder || null,
      iban: share.payout.iban || null,
      paypal: share.payout.paypal || null,
    }),
  );
}

export async function revokeShare(challengeId: string) {
  check(await supabase.from('payout_shares').delete().eq('challenge_id', challengeId));
}

export async function savePayout(userId: string, payout: Payout) {
  check(
    await supabase.from('payout_details').upsert({
      user_id: userId,
      account_holder: payout.accountHolder || null,
      iban: payout.iban || null,
      paypal: payout.paypal || null,
      updated_at: new Date().toISOString(),
    }),
  );
}

export async function reportUser(input: {
  reportedId: string;
  challengeId?: string;
  reason: UserReportReason;
  description?: string;
}) {
  check(
    await supabase.from('user_reports').insert({
      reported_id: input.reportedId,
      challenge_id: input.challengeId ?? null,
      reason: input.reason,
      description: input.description?.trim() || null,
    }),
  );
}

export async function sendSupportRequest(body: string) {
  check(await supabase.from('support_requests').insert({ body: body.trim() }));
}

export async function deleteMyAccount() {
  check(await supabase.rpc('delete_my_account'));
}
