import { supabase } from '../../lib/supabase';

import { t } from '../texts';
import type {
  Challenge,
  ChallengeStatus,
  Participant,
  Payout,
  PayoutLine,
  PayoutShare,
  User,
} from '../types';
import { photoUrl } from './photos';
import { ChallengeRow, PayoutLineRow, PayoutRow, ProfileRow, ShareRow } from './rows';

export { photoUrl };

// ---------------------------------------------------------------------------
// Umwandlung in die Typen der App
// ---------------------------------------------------------------------------

export const FALLBACK_NAME = 'Neue Crew';

export function toPayout(row: PayoutRow): Payout {
  return { accountHolder: row.account_holder ?? '', iban: row.iban ?? '', paypal: row.paypal ?? undefined };
}

export function toUser(row: ProfileRow, payout?: Payout): User {
  const name = row.handle ?? FALLBACK_NAME;
  return {
    id: row.id,
    name,
    firstName: name,
    avatar: photoUrl(row.avatar_path),
    location: row.kiez ?? undefined,
    group: row.is_group,
    gender: row.gender ?? undefined,
    payout,
    test: row.is_test ?? undefined,
  };
}

function toShare(row: ShareRow | undefined): PayoutShare | undefined {
  if (!row) return undefined;
  return { method: row.method, payout: toPayout(row) };
}

/**
 * Freigaben einer Challenge: die eigene (oder bei der Erstellerin die der ersten Person) und alle je Person.
 */
function toShares(row: ChallengeRow, shares: ShareRow[] | undefined, userId?: string) {
  if (!shares?.length) return {};
  const byUser: Record<string, PayoutShare> = {};
  for (const s of shares) if (s.user_id) byUser[s.user_id] = toShare(s)!;
  const own =
    shares.find((s) => s.user_id && s.user_id === userId) ??
    shares.find((s) => s.user_id && s.user_id === row.assignee_id) ??
    shares[0];
  return { payoutShare: toShare(own), payoutShares: Object.keys(byUser).length ? byUser : undefined };
}

const toPayoutLine = (r: PayoutLineRow): PayoutLine => ({
  userId: r.user_id,
  amountCents: r.amount_cents,
  paidMarkedAt: r.paid_marked_at ?? undefined,
  paidAt: r.paid_at ?? undefined,
});

/** Auszahlungen je Challenge (Migration 20261028000400). Ohne Migration leer. */
export async function loadPayoutLines(challengeIds: string[]): Promise<Map<string, PayoutLine[]>> {
  const byChallenge = new Map<string, PayoutLine[]>();
  if (!challengeIds.length) return byChallenge;
  const { data, error } = await supabase
    .from('challenge_payouts')
    .select('challenge_id, user_id, amount_cents, paid_marked_at, paid_at')
    .in('challenge_id', challengeIds);
  if (error) return byChallenge;
  for (const r of (data ?? []) as PayoutLineRow[]) {
    const list = byChallenge.get(r.challenge_id) ?? [];
    list.push(toPayoutLine(r));
    byChallenge.set(r.challenge_id, list);
  }
  return byChallenge;
}

/** Status, in denen es Auszahlungen gibt */
export const PAYMENT_STATUSES = new Set<ChallengeStatus>(['payment_open', 'paid_marked', 'paid']);

export function toChallenge(
  row: ChallengeRow,
  extra: {
    liked: boolean;
    operationName?: string;
    shares?: ShareRow[];
    participants?: Participant[];
    payouts?: PayoutLine[];
    userId?: string;
  },
): Challenge {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    text: row.body,
    challengeText: row.challenge_text ?? undefined,
    authorId: row.author_id,
    assigneeId: row.assignee_id ?? undefined,
    maxParticipants: row.max_participants ?? undefined,
    joinMode: row.join_mode ?? undefined,
    participants: extra.participants,
    location: row.location,
    coords: row.lat != null && row.lng != null ? { latitude: row.lat, longitude: row.lng } : undefined,
    kiez: row.kiez ?? undefined,
    bountyAmount: row.bounty_amount ?? undefined,
    status: row.status,
    image: photoUrl(row.image_path),
    imagePath: row.image_path ?? undefined,
    groupId: row.group_id ?? undefined,
    private: row.visibility === 'private' || undefined,
    localOnly: row.local_only || undefined,
    veryPrivate: row.very_private || undefined,
    photoText: row.photo_text?.trim()
      ? { text: row.photo_text, x: row.photo_text_x ?? 0.5, y: row.photo_text_y ?? 0.5 }
      : undefined,
    edensteine: row.edensteine ?? undefined,
    pages: row.pages?.length ? row.pages : undefined,
    sheetFont: row.pages?.length ? (row.sheet_font ?? undefined) : undefined,
    routineLabel: row.routine_label ?? undefined,
    extraImages: (row.extra_image_paths ?? []).flatMap((path) => {
      const photo = photoUrl(path);
      return photo ? [{ photo, path }] : [];
    }),
    imageBefore: photoUrl(row.image_before_path),
    imageAfter: photoUrl(row.image_after_path),
    imageBeforePath: row.image_before_path ?? undefined,
    imageAfterPath: row.image_after_path ?? undefined,
    beforeText: row.before_text ?? undefined,
    afterText: row.after_text ?? undefined,
    timerStartedAt: row.timer_started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
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
    ...toShares(row, extra.shares, extra.userId),
    payouts: extra.payouts,
    comments: [...(row.comments ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({
        id: c.id,
        authorId: c.author_id,
        body: c.body,
        createdAt: c.created_at,
        replyToId: c.reply_to_id ?? undefined,
        image: photoUrl(c.image_path),
        imagePath: c.image_path ?? undefined,
      })),
    rejectionReason: row.rejection_reason ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    paidMarkedAt: row.paid_marked_at ?? undefined,
  };
}

/**
 * Fehler, dessen Text schon für die Person formuliert ist (aus `errorText`). `errorText` gibt ihn unverändert
 * weiter, statt ihn noch einmal als unbekannten Fehler einzupacken.
 */
export class ShownError extends Error {}

/** Technischer Grund eines Fehlers, z. B. „42501: new row violates row-level security policy …“. Leer, wenn keiner da ist. */
export function errorDetail(error: unknown): string {
  const e = error as { message?: string; code?: string; details?: string } | null;
  return [e?.code, e?.message, e?.details].filter(Boolean).join(': ').slice(0, 200);
}

/** Technischer Grund klein unter dem Satz, damit sich die Ursache finden lässt (Daria, 30.10.2026) */
function withDetail(sentence: string, e: unknown) {
  const detail = errorDetail(e);
  return detail ? `${sentence}\n\n(${detail})` : sentence;
}

/**
 * Fehler aus Supabase als Satz, den man der Person zeigen kann. Außer bei eigenen Meldungen der Datenbank
 * (P0001) und bekannten Fällen hängt der technische Grund klein darunter, auch bei fehlenden Rechten.
 */
export function errorText(error: unknown): string {
  if (error instanceof ShownError) return error.message;
  const e = error as { message?: string; hint?: string; code?: string; details?: string } | null;
  if (e?.hint === 'invalid_transition') {
    return t('Das geht gerade nicht mehr. Jemand war schneller oder der Stand hat sich geändert. Ich lade neu.');
  }
  if (e?.code === 'P0001' && e.message) return t(e.message);
  // Doppelter Eintrag: nur beim Decknamen ein eigener Satz, sonst der allgemeine Fehler
  if (e?.code === '23505' && /profiles_handle_unique/.test(e.message ?? '')) {
    return t('Diesen Decknamen gibt es schon. Suche Dir bitte einen anderen aus.');
  }
  // Fehlende Rechte: Policy (RLS) oder Spaltenrecht. Der Grund steht darunter, z. B. welche Tabelle.
  // Die Frage nach dem Kiez nur bei Challenges, denn nur dort hängt das Recht am Kiez.
  if (e?.code === '42501') {
    const sentence = /challenges/.test(e.message ?? '')
      ? t('Das darfst Du gerade nicht. Hast Du schon Deinen Kiez festgelegt?')
      : t('Das darfst Du gerade nicht.');
    return withDetail(sentence, e);
  }
  if (/fetch|network/i.test(e?.message ?? '')) return t('Keine Verbindung. Prüfe Dein Internet und versuche es noch mal.');
  // Unbekannter Fehler
  return withDetail(t('Da ist etwas schiefgegangen. Versuche es bitte noch mal.'), e);
}

export function check<T extends { error: unknown }>(result: T): T {
  if (result.error) throw result.error;
  return result;
}

