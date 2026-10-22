import { supabase } from '../lib/supabase';
import type { SurveyAnswer, SurveyResults } from './survey';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { t } from './texts';
import type {
  Challenge,
  ChallengeReportReason,
  ChallengeStatus,
  ExtraPhoto,
  Group,
  ImageSource,
  Payout,
  PayoutMethod,
  PayoutShare,
  Profile,
  User,
  ModerationReport,
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

type CommentRow = { id: string; author_id: string; body: string; created_at: string; reply_to_id?: string | null };

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
  lat?: number | null;
  lng?: number | null;
  bounty_amount: number | null;
  status: ChallengeStatus;
  image_path: string | null;
  group_id?: string | null;
  edensteine?: number | null;
  extra_image_paths?: string[] | null;
  image_before_path: string | null;
  image_after_path: string | null;
  deadline: string | null;
  created_at: string;
  closed_at: string | null;
  deleted_at?: string | null;
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
    coords: row.lat != null && row.lng != null ? { latitude: row.lat, longitude: row.lng } : undefined,
    kiez: row.kiez ?? undefined,
    bountyAmount: row.bounty_amount ?? undefined,
    status: row.status,
    image: photoUrl(row.image_path),
    imagePath: row.image_path ?? undefined,
    groupId: row.group_id ?? undefined,
    edensteine: row.edensteine ?? undefined,
    extraImages: (row.extra_image_paths ?? []).flatMap((path) => {
      const photo = photoUrl(path);
      return photo ? [{ photo, path }] : [];
    }),
    imageBefore: photoUrl(row.image_before_path),
    imageAfter: photoUrl(row.image_after_path),
    likedByMe: extra.liked,
    deadline: row.deadline ?? '',
    createdAt: row.created_at,
    closedAt: row.closed_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    operationName: extra.operationName,
    report: row.report_photo_path
      ? { photo: photoUrl(row.report_photo_path)!, note: row.report_note ?? undefined }
      : undefined,
    payoutShare: toShare(extra.share),
    comments: [...(row.comments ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({
        id: c.id,
        authorId: c.author_id,
        body: c.body,
        createdAt: c.created_at,
        replyToId: c.reply_to_id ?? undefined,
      })),
    rejectionReason: row.rejection_reason ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    paidMarkedAt: row.paid_marked_at ?? undefined,
  };
}

/** Fehler aus Supabase als Satz, den man der Person zeigen kann. */
export function errorText(error: unknown): string {
  const e = error as { message?: string; hint?: string; code?: string } | null;
  if (e?.hint === 'invalid_transition') {
    return t('Das geht gerade nicht mehr. Jemand war schneller oder der Stand hat sich geändert. Ich lade neu.');
  }
  if (e?.code === 'P0001' && e.message) return t(e.message);
  if (e?.code === '23505') return t('Diesen Decknamen gibt es schon. Such Dir bitte einen anderen aus.');
  if (e?.code === '42501') return t('Das darfst Du gerade nicht. Hast Du schon Deinen Kiez festgelegt?');
  if (/fetch|network/i.test(e?.message ?? '')) return t('Keine Verbindung. Prüf Dein Internet und versuch es noch mal.');
  // Unbekannter Fehler: technischen Grund klein anhängen, damit sich die Ursache finden lässt
  const detail = [e?.code, e?.message].filter(Boolean).join(': ').slice(0, 160);
  return `${t('Da ist etwas schiefgegangen. Versuch es bitte noch mal.')}${detail ? `\n\n(${detail})` : ''}`;
}

function check<T extends { error: unknown }>(result: T): T {
  if (result.error) throw result.error;
  return result;
}

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------

// comments(*): reply_to_id kommt mit, sobald die Migration eingespielt ist
const CHALLENGE_COLUMNS = '*, comments(*)';

export type LiveData = {
  users: User[];
  challenges: Challenge[];
  canOfferBounties: boolean;
  groups: Group[];
  /** Personen, die Du blockiert hast (Migration 20261021000700) */
  blockedIds: string[];
};

/** Eigene Blockierungen. Leer, solange die Migration `moderation` fehlt. */
async function loadBlockedIds(): Promise<Set<string>> {
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
  /** fehlt, solange Migration 20261022000500 aussteht */
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

/** Anzahl Likes je Challenge (Funktion like_counts). Ohne Migration leer. */
async function loadLikeCounts(ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.rpc('like_counts', { p_ids: ids });
  if (error || !data) return new Map();
  return new Map((data as { challenge_id: string; n: number }[]).map((r) => [r.challenge_id, Number(r.n)]));
}

/** Lädt Feed, eigene Likes, Operationsnamen, Freigaben und alle beteiligten Profile. */
export async function loadLiveData(userId: string): Promise<LiveData> {
  const [challengesRes, likesRes, namesRes, sharesRes, payoutRes, views, groups] = await Promise.all([
    supabase.from('challenges').select(CHALLENGE_COLUMNS).order('created_at', { ascending: false }).limit(200),
    supabase.from('likes').select('challenge_id').eq('user_id', userId),
    supabase.from('operation_names').select('challenge_id, name').eq('user_id', userId),
    supabase.from('payout_shares').select('challenge_id, method, account_holder, iban, paypal'),
    supabase.from('payout_details').select('account_holder, iban, paypal').eq('user_id', userId).maybeSingle(),
    loadViewCounts(),
    loadGroups(),
  ]);
  const blocked = await loadBlockedIds();
  for (const res of [challengesRes, likesRes, namesRes, sharesRes, payoutRes]) check(res);

  // Blockierte Personen: ihre Challenges und Kommentare verschwinden für Dich
  const rows = hideBlocked((challengesRes.data ?? []) as unknown as ChallengeRow[], blocked);
  const liked = new Set((likesRes.data ?? []).map((l) => l.challenge_id as string));
  const names = new Map((namesRes.data ?? []).map((n) => [n.challenge_id as string, n.name as string]));
  const shares = new Map(((sharesRes.data ?? []) as ShareRow[]).map((s) => [s.challenge_id, s]));

  const ids = new Set<string>([userId]);
  for (const r of rows) {
    ids.add(r.author_id);
    if (r.assignee_id) ids.add(r.assignee_id);
    for (const c of r.comments ?? []) ids.add(c.author_id);
  }
  for (const g of groups) for (const m of g.members) ids.add(m.userId);
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
  const likeCounts = await loadLikeCounts(rows.map((r) => r.id));
  if (!me) users.push({ id: userId, name: FALLBACK_NAME, firstName: FALLBACK_NAME, payout: myPayout });

  return {
    users,
    challenges: rows.map((r) => ({
      ...toChallenge(r, { liked: liked.has(r.id), operationName: names.get(r.id), share: shares.get(r.id) }),
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
      .select('challenge_id, method, account_holder, iban, paypal')
      .eq('challenge_id', id)
      .maybeSingle(),
  ]);
  for (const res of [rowRes, likeRes, nameRes, shareRes]) check(res);
  if (!rowRes.data) return { challenge: null, users: [] };
  const [row] = hideBlocked([rowRes.data as unknown as ChallengeRow], await loadBlockedIds());
  if (!row) return { challenge: null, users: [] };
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
  const likeCounts = await loadLikeCounts([row.id]);
  return {
    challenge: {
      ...toChallenge(row, {
        liked: !!likeRes.data,
        operationName: (nameRes.data?.name as string | undefined) ?? undefined,
        share: (shareRes.data as ShareRow | null) ?? undefined,
      }),
      ...(likeCounts.size ? { likeCount: likeCounts.get(row.id) ?? 0 } : {}),
    },
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
/** Legt Profil und Einstellungen an, falls sie fehlen (Migration 20261021000800). */
export async function ensureOwnProfile(): Promise<void> {
  check(await supabase.rpc('ensure_own_profile'));
}

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

/** Längste Kante beim Hochladen, größere Fotos werden verkleinert */
const MAX_EDGE = 2048;

/**
 * Lädt ein Foto vom Gerät in den eigenen Ordner hoch und gibt den Pfad zurück.
 * Jedes Foto wird vorher zu JPEG umgewandelt und auf höchstens 2048 px verkleinert. So klappen auch
 * Formate, die der Speicher nicht annimmt (z. B. Apple ProRAW als image/x-adobe-dng), und Uploads bleiben klein.
 */
export async function uploadPhoto(userId: string, photo: ImageSource): Promise<string> {
  const original = typeof photo === 'object' && photo && 'uri' in photo ? photo.uri : undefined;
  if (!original) throw new Error(t('Foto ohne Datei'));
  const uri = await toJpeg(original);
  // fetch + arrayBuffer funktioniert in React Native für lokale Dateien (file://) und im Browser (blob:, data:).
  const response = await fetch(uri);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const body = await response.arrayBuffer();
  check(await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false }));
  return path;
}

async function toJpeg(uri: string): Promise<string> {
  const first = await manipulateAsync(uri, [], { format: SaveFormat.JPEG, compress: 0.85 });
  const longest = Math.max(first.width, first.height);
  if (longest <= MAX_EDGE) return first.uri;
  const resize = first.width >= first.height ? { width: MAX_EDGE } : { height: MAX_EDGE };
  const small = await manipulateAsync(uri, [{ resize }], { format: SaveFormat.JPEG, compress: 0.85 });
  return small.uri;
}

/**
 * Profilbild setzen oder mit `null` entfernen. Lädt das Foto in den eigenen Ordner, trägt den Pfad
 * in `profiles.avatar_path` ein und löscht das alte Bild. Gibt die neue Bildquelle zurück.
 */
export async function saveAvatar(userId: string, photo: ImageSource | null): Promise<ImageSource | undefined> {
  const { data: before } = await supabase.from('profiles').select('avatar_path').eq('id', userId).maybeSingle();
  const path = photo ? await uploadPhoto(userId, photo) : null;
  check(await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId));
  const old = before?.avatar_path;
  // Altes Bild weg, Fehler dabei sind egal
  if (old && old !== path) await supabase.storage.from(PHOTO_BUCKET).remove([old]).catch(() => undefined);
  return photoUrl(path);
}

export type NewChallenge = {
  /** `photo`: nur ein Bild, ohne Aufgabe und ohne Coins */
  type?: 'individual' | 'photo';
  title: string;
  text: string;
  location: string;
  /** Gerundeter Punkt (location.ts, roundCoords) */
  coords?: { latitude: number; longitude: number };
  bountyAmount?: number;
  deadline: string;
  photo: ImageSource;
  extras?: ExtraPhoto[];
};

/** Spalten lat/lng (Migration 20261020000400). Ohne Punkt bleiben sie weg, damit es auch ohne Migration läuft. */
const coordFields = (coords?: { latitude: number; longitude: number }) =>
  coords ? { lat: coords.latitude, lng: coords.longitude } : {};

/** Weitere Fotos hochladen, soweit sie noch keinen Pfad haben. Gibt alle Pfade zurück. */
async function uploadExtras(userId: string, extras?: ExtraPhoto[]): Promise<string[] | undefined> {
  if (!extras) return undefined;
  const paths: string[] = [];
  for (const extra of extras.slice(0, 2)) paths.push(extra.path ?? (await uploadPhoto(userId, extra.photo)));
  return paths;
}

/** Neue, optionale Spalten: Punkt (Migration 20261020000400) und weitere Fotos (20261020000700). */
const optionalFields = (coords?: { latitude: number; longitude: number }, extraPaths?: string[]) => ({
  ...coordFields(coords),
  ...(extraPaths ? { extra_image_paths: extraPaths } : {}),
});

/** Fehlen neue Spalten noch (Migration nicht eingespielt), noch einmal ohne sie speichern. */
async function retryWithoutCoords<T>(run: (withCoords: boolean) => Promise<T>): Promise<T> {
  try {
    return await run(true);
  } catch (error) {
    const e = error as { code?: string; message?: string };
    if (e?.code === 'PGRST204' || /\b(lat|lng|extra_image_paths)\b/.test(e?.message ?? '')) return run(false);
    throw error;
  }
}

/** Neue Challenge anlegen. Gibt die gespeicherte Challenge zurück. */
export async function createChallenge(userId: string, draft: NewChallenge): Promise<Challenge> {
  const imagePath = await uploadPhoto(userId, draft.photo);
  const extraPaths = await uploadExtras(userId, draft.extras);
  const { data } = await retryWithoutCoords(async (withCoords) =>
    check(
      await supabase
        .from('challenges')
        .insert({
          author_id: userId,
          type: draft.type ?? 'individual',
          title: draft.title,
          body: draft.text,
          location: draft.location,
          bounty_amount: draft.bountyAmount ?? null,
          ...(withCoords ? optionalFields(draft.coords, extraPaths) : {}),
          deadline: draft.deadline,
          image_path: imagePath,
        })
        .select(CHALLENGE_COLUMNS)
        .single(),
    ),
  );
  return toChallenge(data as unknown as ChallengeRow, { liked: false });
}

const rpc = async (fn: string, args: Record<string, unknown>) => {
  check(await supabase.rpc(fn, args));
};

/** Gruppen (Migration 20261021000100). Gründen und Beitreten geben die id der Gruppe zurück. */
export const groupActions = {
  create: async (name: string) => check(await supabase.rpc('create_group', { p_name: name })).data as string,
  join: async (code: string) => check(await supabase.rpc('join_group', { p_code: code })).data as string,
  leave: (groupId: string) => rpc('leave_group', { p_group_id: groupId }),
  removeMember: (groupId: string, userId: string) =>
    rpc('remove_group_member', { p_group_id: groupId, p_user_id: userId }),
  transferFounder: (groupId: string, userId: string) =>
    rpc('transfer_group_founder', { p_group_id: groupId, p_user_id: userId }),
  setLeaderboard: (groupId: string, show: boolean) =>
    rpc('set_group_leaderboard', { p_group_id: groupId, p_show: show }),
};

export type NewGroupTask = {
  groupId: string;
  title: string;
  text: string;
  edensteine: number;
  deadline: string;
  photo?: ImageSource;
};

/** Gruppenaufgabe direkt veröffentlichen (ohne Entwurf, ohne Ort). */
export async function createGroupTask(userId: string, task: NewGroupTask): Promise<Challenge> {
  const imagePath = task.photo ? await uploadPhoto(userId, task.photo) : null;
  const { data } = check(
    await supabase
      .from('challenges')
      .insert({
        author_id: userId,
        group_id: task.groupId,
        edensteine: task.edensteine,
        title: task.title.trim(),
        body: task.text.trim(),
        location: '',
        deadline: task.deadline,
        image_path: imagePath,
      })
      .select(CHALLENGE_COLUMNS)
      .single(),
  );
  return toChallenge(data as unknown as ChallengeRow, { liked: false });
}

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

export type ChallengeEdit = {
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  deadline: string;
  /** Neues Foto vom Gerät; ohne bleibt das bisherige */
  photo?: ImageSource;
};

/**
 * Eigene offene Challenge bearbeiten (Migration 20261020000100_edit_open_challenge.sql).
 * Ein neues Foto wird hochgeladen und per set_challenge_image eingetragen (Migration 20261022000300).
 */
export async function editChallenge(id: string, edit: ChallengeEdit, userId?: string) {
  await rpc('edit_open_challenge', {
    p_challenge_id: id,
    p_title: edit.title,
    p_body: edit.text,
    p_location: edit.location,
    p_bounty_amount: edit.bountyAmount ?? null,
    p_deadline: edit.deadline,
  });
  if (edit.photo && userId) {
    const path = await uploadPhoto(userId, edit.photo);
    await rpc('set_challenge_image', { p_challenge_id: id, p_image_path: path });
  }
}

/** Eigene offene Challenge schließen. Sie bleibt in der Timeline sichtbar (Migration 20261020000200). */
export const closeChallenge = (id: string) => rpc('close_challenge', { p_challenge_id: id });

export type DraftInput = {
  type?: 'individual' | 'photo';
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  coords?: { latitude: number; longitude: number };
  /** Neues Foto vom Gerät. Ohne neues Foto bleibt `imagePath`. */
  photo?: ImageSource;
  imagePath?: string;
  extras?: ExtraPhoto[];
};

/** Entwurf anlegen (ohne id) oder aktualisieren. Lädt ein neues Foto hoch. Gibt den gespeicherten Entwurf zurück. */
export async function saveDraft(userId: string, id: string | undefined, draft: DraftInput): Promise<Challenge> {
  const imagePath = draft.imagePath ?? (draft.photo ? await uploadPhoto(userId, draft.photo) : null);
  const extraPaths = await uploadExtras(userId, draft.extras);
  const fields = {
    type: draft.type ?? 'individual',
    title: draft.title.trim(),
    body: draft.text.trim(),
    location: draft.location.trim(),
    bounty_amount: draft.bountyAmount ?? null,
    image_path: imagePath,
  };
  const { data } = await retryWithoutCoords(async (withCoords) => {
    const all = { ...fields, ...(withCoords ? optionalFields(draft.coords, extraPaths) : {}) };
    const query = id
      ? supabase.from('challenges').update(all).eq('id', id).eq('status', 'draft')
      : supabase.from('challenges').insert({ ...all, author_id: userId, status: 'draft' });
    return check(await query.select(CHALLENGE_COLUMNS).single());
  });
  return toChallenge(data as unknown as ChallengeRow, { liked: false });
}

/** Entwurf veröffentlichen. Die Datenbank prüft Titel, Ort, Foto, Frist und Bounty. */
export const publishDraft = (id: string, deadline: string) =>
  rpc('publish_challenge', { p_challenge_id: id, p_deadline: deadline });

/** Offene Challenge löschen (status deleted). Nach dem Annehmen lehnt die Datenbank ab. */
export const deleteChallenge = (id: string) => rpc('delete_challenge', { p_challenge_id: id });

/** Gelöschte Challenge wieder veröffentlichen. `deadline` nur, wenn die alte Frist abgelaufen ist. */
export const restoreChallenge = (id: string, deadline?: string) =>
  rpc('restore_challenge', { p_challenge_id: id, p_deadline: deadline ?? null });

/**
 * Aufrufe eigener Challenges (RLS liefert nur die eigenen).
 * `null`, solange die Migration `challenge_views` fehlt. Die App blendet die Zahl dann aus.
 */
async function loadViewCounts(): Promise<Map<string, number> | null> {
  const { data, error } = await supabase.from('challenge_views').select('challenge_id').limit(10000);
  if (error) return null;
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.challenge_id, (counts.get(row.challenge_id) ?? 0) + 1);
  return counts;
}

/** Aufruf zählen. Fehler (doppelt, eigene Challenge, Migration fehlt) ignoriert die App. */
export async function recordView(challengeId: string) {
  await supabase.from('challenge_views').upsert({ challenge_id: challengeId }, { ignoreDuplicates: true });
}

/** Gelöschte Challenge endgültig löschen (Migration 20261021000400). */
export async function purgeChallenge(id: string) {
  const res = check(await supabase.from('challenges').delete().eq('id', id).eq('status', 'deleted').select('id'));
  if (!res.data?.length) throw new Error('Endgültig löschen ging nicht. Läuft schon Migration 20261021000400?');
}

export async function deleteDraft(id: string) {
  check(await supabase.from('challenges').delete().eq('id', id).eq('status', 'draft'));
}

export async function nameOperation(userId: string, challengeId: string, name: string) {
  // Erst löschen, dann neu anlegen: Ändern ist nur für den Namen erlaubt, nicht für die Challenge.
  check(await supabase.from('operation_names').delete().eq('challenge_id', challengeId).eq('user_id', userId));
  check(await supabase.from('operation_names').insert({ challenge_id: challengeId, user_id: userId, name }));
}

export async function addComment(challengeId: string, body: string, replyToId?: string) {
  check(
    await supabase
      .from('comments')
      .insert(replyToId ? { challenge_id: challengeId, body, reply_to_id: replyToId } : { challenge_id: challengeId, body }),
  );
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

export async function reportChallenge(input: { challengeId: string; reason: ChallengeReportReason; description?: string }) {
  const res = await supabase.from('challenge_reports').insert({
    challenge_id: input.challengeId,
    reason: input.reason,
    description: input.description?.trim() || null,
  });
  // Zweite Meldung derselben Person zur selben Challenge: die erste liegt schon bei der Moderation
  if ((res.error as { code?: string } | null)?.code === '23505') return;
  check(res);
}

export async function blockUser(userId: string) {
  const res = await supabase.from('blocks').insert({ blocked_id: userId });
  if ((res.error as { code?: string } | null)?.code === '23505') return;
  check(res);
}

export async function unblockUser(userId: string) {
  check(await supabase.from('blocks').delete().eq('blocked_id', userId));
}

/** Profile der blockierten Personen, für die Liste in „Dein Konto“. */
export async function loadBlockedUsers(): Promise<User[]> {
  const ids = [...(await loadBlockedIds())];
  if (!ids.length) return [];
  const res = check(
    await supabase.from('profiles').select('id, handle, avatar_path, kiez, is_group, can_offer_bounties').in('id', ids),
  );
  return ((res.data ?? []) as ProfileRow[]).map((p) => toUser(p));
}

/** Lob: Anzahl und ob Du schon gelobt hast. null, solange die Migration fehlt. */
export async function loadPraise(userId: string, meId: string): Promise<{ count: number; mine: boolean } | null> {
  const [countRes, mineRes] = await Promise.all([
    supabase.rpc('praise_count', { p_user: userId }),
    supabase.from('praises').select('receiver_id').eq('giver_id', meId).eq('receiver_id', userId).maybeSingle(),
  ]);
  if (countRes.error || mineRes.error) return null;
  return { count: (countRes.data as number) ?? 0, mine: !!mineRes.data };
}

export async function setPraise(userId: string, praised: boolean, meId: string) {
  if (praised) check(await supabase.from('praises').insert({ receiver_id: userId }));
  else check(await supabase.from('praises').delete().eq('giver_id', meId).eq('receiver_id', userId));
}

export type AppTextLang = 'en' | 'fr' | 'uk' | 'ar' | 'he';
export type AppTextRow = { original: string; text: string; ort: string | null; updated_at: string } & Partial<
  Record<AppTextLang, string | null>
>;

/** Alle Texte des CMS für den Editor (Route `texte`), mit Übersetzungen, sofern die Migration 1400 gelaufen ist. */
export async function loadAppTexts(): Promise<AppTextRow[]> {
  const full = await supabase.from('app_texts').select('original, text, ort, updated_at, en, fr, uk, ar, he');
  if (!full.error) return (full.data ?? []) as AppTextRow[];
  const { data } = check(await supabase.from('app_texts').select('original, text, ort, updated_at'));
  return (data ?? []) as AppTextRow[];
}

/**
 * Fassung speichern, auf Deutsch (`text`) oder in einer Sprache (`en`, …). Leer: Die App zeigt wieder
 * das Original bzw. die mitgelieferte Übersetzung. Nur für Moderatorinnen (RLS).
 */
export async function saveAppText(original: string, value: string, lang: 'de' | AppTextLang = 'de'): Promise<void> {
  const column = lang === 'de' ? 'text' : lang;
  const { data } = check(
    await supabase.from('app_texts').update({ [column]: value }).eq('original', original).select('original'),
  );
  if (!data?.length) throw new Error(t('Keine Berechtigung zum Ändern der Texte.'));
}

/** true, wenn die angemeldete Person in `moderators` steht. */
export async function isModerator(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_moderator');
  return !error && data === true;
}

type ReportRow = {
  id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: ModerationReport['status'];
  created_at: string;
  reported_id?: string;
  challenge_id: string | null;
};

/** Alle Meldungen für die Moderation, neueste zuerst. */
export async function loadModerationReports(): Promise<{ reports: ModerationReport[]; users: User[]; titles: Record<string, string> }> {
  const [usersRes, challengesRes] = await Promise.all([
    supabase.from('user_reports').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('challenge_reports').select('*').order('created_at', { ascending: false }).limit(200),
  ]);
  check(usersRes);
  check(challengesRes);
  const reports: ModerationReport[] = [
    ...((usersRes.data ?? []) as ReportRow[]).map((r) => ({
      kind: 'user' as const,
      id: r.id,
      reporterId: r.reporter_id,
      reportedId: r.reported_id,
      challengeId: r.challenge_id ?? undefined,
      reason: r.reason,
      description: r.description ?? undefined,
      status: r.status,
      createdAt: r.created_at,
    })),
    ...((challengesRes.data ?? []) as ReportRow[]).map((r) => ({
      kind: 'challenge' as const,
      id: r.id,
      reporterId: r.reporter_id,
      challengeId: r.challenge_id ?? undefined,
      reason: r.reason,
      description: r.description ?? undefined,
      status: r.status,
      createdAt: r.created_at,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const challengeIds = [...new Set(reports.flatMap((r) => (r.challengeId ? [r.challengeId] : [])))];
  const challengeRows = challengeIds.length
    ? ((check(await supabase.from('challenges').select('id, title, author_id').in('id', challengeIds)).data ?? []) as {
        id: string;
        title: string;
        author_id: string;
      }[])
    : [];
  const titles = Object.fromEntries(challengeRows.map((c) => [c.id, c.title]));
  const authors = new Map(challengeRows.map((c) => [c.id, c.author_id]));
  for (const r of reports) if (r.kind === 'challenge' && r.challengeId) r.reportedId = authors.get(r.challengeId);

  const userIds = [...new Set(reports.flatMap((r) => [r.reporterId, ...(r.reportedId ? [r.reportedId] : [])]))];
  const profiles = userIds.length
    ? ((check(
        await supabase.from('profiles').select('id, handle, avatar_path, kiez, is_group, can_offer_bounties').in('id', userIds),
      ).data ?? []) as ProfileRow[])
    : [];
  return { reports, users: profiles.map((p) => toUser(p)), titles };
}

export async function setReportStatus(report: Pick<ModerationReport, 'kind' | 'id'>, status: ModerationReport['status']) {
  const table = report.kind === 'user' ? 'user_reports' : 'challenge_reports';
  check(
    await supabase
      .from(table)
      .update({ status, handled_at: status === 'new' ? null : new Date().toISOString() })
      .eq('id', report.id),
  );
}

export async function sendSupportRequest(body: string) {
  check(await supabase.from('support_requests').insert({ body: body.trim() }));
}

/**
 * Löscht alle Fotos im eigenen Ordner. Storage-Dateien hängen nicht an den Fremdschlüsseln,
 * deshalb räumt die App sie vor `delete_my_account` selbst ab (braucht Migration `own_photos_select`).
 */
async function deleteOwnPhotos() {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  for (;;) {
    const { data: files, error } = await bucket.list(userId, { limit: 100 });
    if (error) throw error;
    if (!files?.length) return;
    const { data: removed, error: removeError } = await bucket.remove(files.map((file) => `${userId}/${file.name}`));
    if (removeError) throw removeError;
    // Ohne Leserecht meldet Storage keinen Fehler, löscht aber nichts. Dann nicht endlos weiterversuchen.
    if (!removed?.length) return;
  }
}

export async function deleteMyAccount() {
  await deleteOwnPhotos();
  check(await supabase.rpc('delete_my_account'));
}

// ---------------------------------------------------------------------------
// UX/UI-Umfrage (Migration 20261021001500_survey)
// ---------------------------------------------------------------------------

/** Eigene Antwort, falls schon abgegeben. */
export async function loadMySurveyAnswer(): Promise<SurveyAnswer | null> {
  const { data } = check(
    await supabase.from('survey_answers').select('opinion, usability, design, support, recommend').maybeSingle(),
  );
  return (data as SurveyAnswer | null) ?? null;
}

/** Antwort speichern. Eine Antwort pro Person; erneutes Absenden ändert sie. */
export async function saveSurveyAnswer(answer: SurveyAnswer) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('not signed in');
  check(
    await supabase
      .from('survey_answers')
      .upsert({ user_id: data.user.id, ...answer, updated_at: new Date().toISOString() }),
  );
}

/** Auswertung für die Moderation. */
export async function loadSurveyResults(): Promise<SurveyResults> {
  const { data } = check(await supabase.rpc('survey_results'));
  return data as SurveyResults;
}

// ---------------------------------------------------------------------------
// Bio, Webseite und Freundschaften (Migration 20261022000400_bio_friends.sql)
// ---------------------------------------------------------------------------

export type ProfileExtras = { bio: string; website: string };

/** Bio und Webseite einer Person. null, solange die Migration fehlt. */
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

/** Stand zwischen mir und einer Person. null, solange die Migration fehlt. */
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

/** Freund:innen und offene Anfragen. null, solange die Migration fehlt. */
export async function loadFriends(meId: string): Promise<FriendLists | null> {
  const { data, error } = await supabase.from('friendships').select('requester_id, addressee_id, status');
  if (error) return null;
  const rows = (data ?? []) as FriendshipRow[];
  const otherOf = (r: FriendshipRow) => (r.requester_id === meId ? r.addressee_id : r.requester_id);
  const ids = [...new Set(rows.map(otherOf))];
  const users = new Map<string, User>();
  if (ids.length) {
    const res = check(
      await supabase.from('profiles').select('id, handle, avatar_path, kiez, is_group, can_offer_bounties').in('id', ids),
    );
    for (const p of (res.data ?? []) as ProfileRow[]) users.set(p.id, toUser(p));
  }
  const pick = (state: FriendState) =>
    rows.filter((r) => friendStateOf(r, meId) === state).flatMap((r) => users.get(otherOf(r)) ?? []);
  return { friends: pick('friends'), incoming: pick('received'), outgoing: pick('sent') };
}

