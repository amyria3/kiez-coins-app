import { supabase } from '../../lib/supabase';

import { loadCrosspostLook } from '../crosspostLook';
import { t } from '../texts';
import type {
  ChallengeReportReason,
  ModerationReport,
  Payout,
  PayoutShare,
  User,
  UserReportReason,
} from '../types';
import { loadBlockedIds } from './load';
import { check, ShownError, toUser } from './mapping';
import { PRIVATE_BUCKET, removePhotos } from './photos';
import { PHOTO_BUCKET, ProfileRow, selectProfiles } from './rows';
import { rpc } from './write';

/** Offene Challenge löschen (status deleted). Nach dem Annehmen lehnt die Datenbank ab. */
export const deleteChallenge = (id: string) => rpc('delete_challenge', { p_challenge_id: id });

/**
 * Weiterposts (BlueSky, Mastodon) eines gelöschten Posts dort mitlöschen. Ruft die Edge Function `weiterposten`
 * nur, wenn es eigene Weiterposts gibt. Fehler bleiben in `crosspost_posts` stehen.
 */
export async function deleteCrossposts(id: string, platforms?: string[]) {
  if (platforms && !platforms.length) return;
  const { data, error } = await supabase.from('crosspost_posts').select('platform').eq('challenge_id', id).eq('status', 'ok');
  if (error || !data?.length) return;
  await supabase.functions.invoke('weiterposten', { body: { action: 'delete', challengeId: id, platforms } });
}

/**
 * Wiederhergestellter Post: dort neu weiterposten, wo er beim Löschen mitgelöscht wurde.
 * `chosen`: Auswahl aus der Rückfrage; ohne Auswahl alle.
 */
export async function restoreCrossposts(id: string, chosen?: string[]) {
  if (chosen && !chosen.length) return;
  const { data, error } = await supabase.from('crosspost_posts').select('platform').eq('challenge_id', id).eq('error', 'deleted');
  if (error || !data?.length) return;
  const platforms = data.map((d) => d.platform as string).filter((p) => !chosen || chosen.includes(p));
  if (!platforms.length) return;
  const look = await loadCrosspostLook();
  await supabase.functions.invoke('weiterposten', { body: { action: 'post', challengeId: id, platforms, look } });
}

/** Gelöschte Challenge wieder veröffentlichen. `deadline` nur, wenn die alte Frist abgelaufen ist. */
export const restoreChallenge = (id: string, deadline?: string) =>
  rpc('restore_challenge', { p_challenge_id: id, p_deadline: deadline ?? null });

/** Eigenen Post zum Teilen freigeben: Er bekommt die öffentliche Seite kiezcoins.de/c/<id> (Migration 20261103000200). */
export const shareChallengePublicly = (id: string) => rpc('share_challenge', { p_challenge_id: id });

/** Aufruf zählen. Fehler (doppelt, eigene Challenge, Migration fehlt) ignoriert die App. */
export async function recordView(challengeId: string) {
  await supabase.from('challenge_views').upsert({ challenge_id: challengeId }, { ignoreDuplicates: true });
}

/**
 * Mehrere Aufrufe auf einmal zählen (gesehen im Feed). Nur fremde Posts übergeben: Ein eigener Post
 * verletzt die RLS und lässt den ganzen Aufruf scheitern.
 */
export async function recordViews(challengeIds: string[]) {
  if (!challengeIds.length) return;
  await supabase
    .from('challenge_views')
    .upsert(challengeIds.map((challenge_id) => ({ challenge_id })), { ignoreDuplicates: true });
}

/** Gelöschte Challenge endgültig löschen (Migration 20261021000400). */
export async function purgeChallenge(id: string) {
  const res = check(await supabase.from('challenges').delete().eq('id', id).eq('status', 'deleted').select('id'));
  if (!res.data?.length) throw new Error(t('Da ist etwas schiefgegangen. Versuche es bitte noch mal.'));
}

export async function deleteDraft(id: string) {
  check(await supabase.from('challenges').delete().eq('id', id).eq('status', 'draft'));
}

export async function nameOperation(userId: string, challengeId: string, name: string) {
  // Erst löschen, dann neu anlegen: Ändern ist nur für den Namen erlaubt, nicht für die Challenge.
  check(await supabase.from('operation_names').delete().eq('challenge_id', challengeId).eq('user_id', userId));
  check(await supabase.from('operation_names').insert({ challenge_id: challengeId, user_id: userId, name }));
}

/** Kommentar schreiben. Mit Bild (Migration 20261110001400): erst hochladen, dann den Pfad mitschicken. */
export async function addComment(challengeId: string, body: string, replyToId?: string, imagePath?: string) {
  check(
    await supabase.from('comments').insert({
      challenge_id: challengeId,
      body,
      ...(replyToId ? { reply_to_id: replyToId } : null),
      ...(imagePath ? { image_path: imagePath } : null),
    }),
  );
}

/**
 * Kommentar löschen: eigener Kommentar oder als Moderatorin (Migration 20261110001400). Erst das Bild, dann den
 * Kommentar, weil die Moderation nur Bilder löschen darf, die noch an einem Kommentar hängen.
 */
export async function deleteComment(commentId: string, imagePath?: string) {
  if (imagePath) {
    // Bild weg oder nicht löschbar: Der Kommentar verschwindet trotzdem, ohne Kommentar ist das Bild nirgends zu sehen
    await removePhotos([imagePath]).catch((error) => console.warn('Kommentarbild nicht gelöscht', error?.message));
  }
  const { data, error } = await supabase.from('comments').delete().eq('id', commentId).select('id');
  if (error) throw error;
  if (!data?.length) throw new ShownError(t('Der Kommentar ließ sich nicht löschen.'));
}

export async function setLike(challengeId: string, userId: string, liked: boolean) {
  if (liked) {
    const res = await supabase.from('likes').insert({ challenge_id: challengeId });
    // Schon geliked (z. B. auf einem anderen Gerät): Ziel erreicht
    if ((res.error as { code?: string } | null)?.code === '23505') return;
    check(res);
  } else check(await supabase.from('likes').delete().eq('challenge_id', challengeId).eq('user_id', userId));
}

/** Kommentar liken oder Like zurücknehmen (Migration 20261109000100) */
export async function setCommentLike(commentId: string, userId: string, liked: boolean) {
  if (liked) {
    const res = await supabase.from('comment_likes').insert({ comment_id: commentId });
    if ((res.error as { code?: string } | null)?.code === '23505') return;
    check(res);
  } else check(await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId));
}

export async function sharePayout(challengeId: string, share: PayoutShare, userId: string) {
  // Nur die eigene Freigabe ersetzen; bei mehreren Personen hat jede ihre eigene (Migration 20261028000400)
  check(await supabase.from('payout_shares').delete().eq('challenge_id', challengeId).eq('user_id', userId));
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

export async function revokeShare(challengeId: string, userId: string) {
  check(await supabase.from('payout_shares').delete().eq('challenge_id', challengeId).eq('user_id', userId));
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
    await selectProfiles(ids),
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

export type AppTextLang = 'en' | 'fr' | 'uk' | 'ru' | 'ar' | 'he';
export type AppTextRow = { original: string; text: string; ort: string | null; updated_at: string } & Partial<
  Record<AppTextLang, string | null>
>;

/** Alle Texte des CMS für den Editor (Route `texts`), mit Übersetzungen, sofern die Migration 1400 gelaufen ist. */
export async function loadAppTexts(): Promise<AppTextRow[]> {
  // Alle Spalten: Fehlt eine Sprachspalte noch (Migration nicht gelaufen), bleibt sie einfach leer.
  const { data } = check(await supabase.from('app_texts').select('*'));
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
  if (data?.length) return;
  // Text aus dem Code, der noch nicht in der Tabelle steht: Zeile anlegen (Migration 20261029000500)
  const { error } = await supabase.from('app_texts').insert({ original, [column]: value });
  // Echten Grund weitergeben (errorText zeigt ihn), statt ihn zu verschlucken (Daria, 30.10.2026)
  if (error) throw error;
}

/**
 * Knopf zählen (Migration 20261031000100): nur Knopf, Look und Zeitpunkt, ohne Person. Fehler stören niemanden
 * (z. B. ohne Migration oder ohne Netz), deshalb still.
 */
export function countButton(button: string, look: string) {
  supabase
    .from('button_presses')
    .insert({ button, look })
    .then(
      () => undefined,
      () => undefined,
    );
}

/** Wie oft jeder Knopf gedrückt wurde (nur Moderatorinnen). `null`, solange die Migration fehlt. */
export async function loadButtonCounts(buttons: string[]): Promise<Record<string, number> | null> {
  const counts: Record<string, number> = {};
  for (const button of buttons) {
    const { count, error } = await supabase.from('button_presses').select('id', { count: 'exact', head: true }).eq('button', button);
    if (error) return null;
    counts[button] = count ?? 0;
  }
  return counts;
}

/** true, wenn die angemeldete Person in `moderators` steht. */
/**
 * Einmaliger Code für den eigenen Punkt auf kiezcoins.de/finanzierung (Migration 20261108000200).
 * Gilt 10 Minuten und nur einmal. Ohne Code zeigt die Seite keinen eigenen Punkt.
 */
export async function financeLinkCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc('finanzierung_link');
  return error || typeof data !== 'string' ? null : data;
}

export type FinanceStand = { registriert: number; aktiv: number; kategorie?: 'aktiv' | 'inaktiv' | null; rang?: number | null };

/**
 * Zahlen für den Abschnitt „Modell KiezCoins“ unten auf „Me“ (Daria, 08.11.2026).
 * Angemeldet: mit eigenem Punkt (Code holen und gleich einlösen). Sonst nur die Zahlen.
 */
export async function loadFinanceStand(withOwnDot: boolean): Promise<FinanceStand | null> {
  const code = withOwnDot ? await financeLinkCode() : null;
  const { data, error } = code
    ? await supabase.rpc('finanzierung_mein_punkt', { p_code: code })
    : await supabase.rpc('finanzierung_ist');
  if (error || !data || typeof data !== 'object') return null;
  return data as FinanceStand;
}

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
        await selectProfiles(userIds),
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
 * Löscht alle Fotos im eigenen Ordner, in beiden Speichern. Storage-Dateien hängen nicht an den Fremdschlüsseln,
 * deshalb räumt die App sie vor `delete_my_account` selbst ab (braucht Migration `own_photos_select`).
 */
async function deleteOwnPhotos() {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  for (const name of [PHOTO_BUCKET, PRIVATE_BUCKET]) await deleteFolder(name, userId);
}

async function deleteFolder(bucketName: string, userId: string) {
  const bucket = supabase.storage.from(bucketName);
  for (;;) {
    const { data: files, error } = await bucket.list(userId, { limit: 100 });
    // Privater Speicher fehlt (Migration 20261116000100 noch nicht eingespielt): nichts zu löschen
    if (error && /bucket not found/i.test(error.message)) return;
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

