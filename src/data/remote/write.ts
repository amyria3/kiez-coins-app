import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';

import { bountyFits } from '../coins';
import { t } from '../texts';
import type {
  Challenge,
  ChallengeType,
  ExtraPhoto,
  ImageSource,
  JoinMode,
  PhotoText,
  Profile,
} from '../types';
import { CHALLENGE_COLUMNS } from './load';
import { check, errorText, photoUrl, toChallenge } from './mapping';
import { bucketOf, isPrivateAudience, isPrivateChallenge, newPhotoPath, removePhotos, signChallengePhotos } from './photos';
import { ChallengeRow } from './rows';

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
      .update({ handle: profile.handle.trim() || null, kiez: profile.kiez ?? null, ...(profile.gender ? { gender: profile.gender } : {}) })
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
/**
 * Welche der Decknamen sind schon vergeben? Vergleich wie der eindeutige Index: ohne Groß-/Kleinschreibung
 * und ohne Leerraum am Rand. Gibt die vergebenen Namen kleingeschrieben zurück, bei einem Fehler null.
 */
export async function takenHandles(candidates: string[]): Promise<Set<string> | null> {
  const names = candidates.map((c) => c.trim()).filter(Boolean);
  if (!names.length) return new Set();
  // ilike ohne Platzhalter: % und _ maskieren, Anführungszeichen für den or-Filter maskieren
  const filter = names.map((n) => `handle.ilike."${n.replace(/[\\%_]/g, '\\$&').replace(/"/g, '\\"')}"`).join(',');
  const { data, error } = await supabase.from('profiles').select('handle').or(filter);
  if (error) return null;
  return new Set((data ?? []).map((r: { handle: string | null }) => (r.handle ?? '').trim().toLowerCase()));
}

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
 * `isPrivate`: Foto für einen privaten Post oder eine Gruppe, es kommt in den privaten Speicher (photos.ts).
 */
export async function uploadPhoto(userId: string, photo: ImageSource, isPrivate = false): Promise<string> {
  const original = typeof photo === 'object' && photo && 'uri' in photo ? photo.uri : undefined;
  if (!original) throw new Error(t('Foto ohne Datei'));
  const uri = await toJpeg(original);
  // fetch + arrayBuffer funktioniert in React Native für lokale Dateien (file://) und im Browser (blob:, data:).
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const path = newPhotoPath(userId, isPrivate);
  check(await supabase.storage.from(bucketOf(path)).upload(path, body, { contentType: 'image/jpeg', upsert: false }));
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
  if (old && old !== path) await removePhotos([old]).catch(() => undefined);
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
  /** Edensteine statt Euro, 1 bis 10 (Migration 20261028000200) */
  edensteine?: number;
  deadline: string;
  /** Fehlt bei Posts nur mit Text (`pages`) */
  photo?: ImageSource;
  extras?: ExtraPhoto[];
  /** Post nur mit Text: Blätter statt Foto (Migration 20261107000100) */
  pages?: string[];
  sheetFont?: string;
  /** Modus „Privat“: nur Bild, ohne Coins (Migration 20261028000100) */
  private?: boolean;
  /** Nur im Umkreis von 5 km, nicht in „Überall“ (Migration 20261029000100) */
  localOnly?: boolean;
  /** „Sehr privat“: kein Teilen, Fotos nur im privaten Speicher (Migration 20261116000200) */
  veryPrivate?: boolean;
  /** Nur „Nur ein Bild“: Text auf dem Foto (Migration 20261029000200). `null` löscht ihn im Entwurf. */
  photoText?: PhotoText | null;
  participation?: Participation;
};

/**
 * Mehrere Personen in einer We-Challenge (Daria, 27.10.2026, Migration 20261028000300): Höchstzahl und
 * Art des Beitretens. Ohne Angabe bleibt es bei einer Person und „Offen“.
 */
export type Participation = { max: number; mode: JoinMode };

/** Nur nötig, wenn es von „1 Person, offen“ abweicht oder vorher abwich. */
export const isDefaultParticipation = (p?: Participation) => !p || (p.max === 1 && p.mode === 'open');

/** Höchstzahl und Art des Beitretens setzen. Die Datenbank prüft Rolle, Status und Euro-Bounty. */
export const setParticipation = (id: string, p: Participation) =>
  rpc('set_challenge_participation', { p_challenge_id: id, p_max: p.max, p_mode: p.mode });

/**
 * Teilnahme direkt beim Anlegen mitschicken, wenn sie vom Standard abweicht. So passt ein Betrag in Coins
 * für mehrere Plätze schon beim Anlegen zur Regel (pro Platz 5 bis 50 €, Migration 20261028000400).
 */
const participationFields = (p?: Participation) =>
  isDefaultParticipation(p) ? {} : { max_participants: p!.max, join_mode: p!.mode };

/**
 * Betrag und Teilnahme in einer Reihenfolge speichern, bei der die Regel „pro Platz 5 bis 50 €“ in jedem
 * Schritt gilt: erst der Betrag, wenn er zu den bisherigen Plätzen passt, sonst erst die Plätze. Passt
 * beides nicht, kommt der Betrag kurz weg und danach wieder dazu. `save(true)` speichert ohne Betrag.
 */
async function inRewardOrder(
  id: string,
  bounty: number | undefined,
  p: Participation | undefined,
  save: (withoutBounty: boolean) => Promise<void>,
) {
  if (!p) return save(false);
  const { data } = check(
    await supabase.from('challenges').select('bounty_amount, max_participants').eq('id', id).single(),
  );
  const row = data as { bounty_amount: number | null; max_participants: number | null };
  const oldMax = row.max_participants ?? 1;
  if (bountyFits(bounty, oldMax)) {
    await save(false);
    await setParticipation(id, p);
  } else if (bountyFits(row.bounty_amount ?? undefined, p.max)) {
    await setParticipation(id, p);
    await save(false);
  } else {
    await save(true);
    await setParticipation(id, p);
    await save(false);
  }
}

/** Spalten lat/lng, nur mit Punkt */
const coordFields = (coords?: { latitude: number; longitude: number }) =>
  coords ? { lat: coords.latitude, lng: coords.longitude } : {};

/** Weitere Fotos hochladen, soweit sie noch keinen Pfad haben. Gibt alle Pfade zurück. */
async function uploadExtras(userId: string, extras: ExtraPhoto[] | undefined, isPrivate: boolean): Promise<string[] | undefined> {
  if (!extras) return undefined;
  const paths: string[] = [];
  for (const extra of extras.slice(0, 2)) paths.push(extra.path ?? (await uploadPhoto(userId, extra.photo, isPrivate)));
  return paths;
}

/** Punkt und weitere Fotos, soweit vorhanden */
const optionalFields = (coords?: { latitude: number; longitude: number }, extraPaths?: string[]) => ({
  ...coordFields(coords),
  ...(extraPaths ? { extra_image_paths: extraPaths } : {}),
});

/** Text auf dem Foto nur mitschicken, wenn gesetzt oder ausdrücklich gelöscht (`null`). Nur bei „Nur ein Bild“. */
function photoTextFields(type: ChallengeType | undefined, value: PhotoText | null | undefined) {
  if (value === undefined) return {};
  const text = type === 'photo' ? value?.text.trim() : undefined;
  if (!text) return { photo_text: null, photo_text_x: null, photo_text_y: null };
  const round = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
  return { photo_text: text.slice(0, 80), photo_text_x: round(value!.x), photo_text_y: round(value!.y) };
}

/** Blätter nur mitschicken, wenn es welche gibt */
const pagesField = (pages?: string[], font?: string) =>
  pages?.length ? { pages: cleanPages(pages), ...(font && font !== 'inter' ? { sheet_font: font } : { sheet_font: null }) } : {};

/** Höchstens 10 Blätter, leere am Ende fallen weg, ein Blatt bleibt immer. */
export function cleanPages(pages: string[]): string[] {
  const all = pages.slice(0, 10).map((p) => p.replace(/\s+$/, ''));
  while (all.length > 1 && !all[all.length - 1].trim()) all.pop();
  return all;
}

/** Edensteine nur mitschicken, wenn es welche gibt. So legt die App ohne Edensteine weiter an wie bisher. */
const edenField = (edensteine?: number) => (edensteine ? { edensteine } : {});

/** Neue Challenge anlegen. Gibt die gespeicherte Challenge zurück. */
export async function createChallenge(userId: string, draft: NewChallenge): Promise<Challenge> {
  const isPrivate = isPrivateAudience(draft);
  const imagePath = draft.photo ? await uploadPhoto(userId, draft.photo, isPrivate) : null;
  const extraPaths = draft.photo ? await uploadExtras(userId, draft.extras, isPrivate) : undefined;
  const { data } = check(
      await supabase
        .from('challenges')
        .insert({
          author_id: userId,
          type: draft.type ?? 'individual',
          title: draft.title,
          body: draft.text,
          location: draft.location,
          bounty_amount: draft.bountyAmount ?? null,
          ...edenField(draft.edensteine),
          ...optionalFields(draft.coords, extraPaths),
          deadline: draft.deadline,
          image_path: imagePath,
          ...pagesField(draft.pages, draft.sheetFont),
          ...(draft.private ? { visibility: 'private' } : {}),
          ...(draft.veryPrivate ? { very_private: true } : {}),
          ...(draft.localOnly && !draft.private ? { local_only: true } : {}),
          ...photoTextFields(draft.type, draft.photoText),
          ...(draft.type === 'photo' ? {} : participationFields(draft.participation)),
        })
        .select(CHALLENGE_COLUMNS)
        .single(),
  );
  await signChallengePhotos([data as unknown as ChallengeRow]);
  return toChallenge(data as unknown as ChallengeRow, { liked: false });
}

export const rpc = async (fn: string, args: Record<string, unknown>) => {
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
  /** `photo`: nur ein Bild für die Gruppe, ohne Edensteine (Migration 20261027000200) */
  type?: 'individual' | 'photo';
  title: string;
  text: string;
  /** Nur bei Aufgaben */
  edensteine?: number;
  deadline: string;
  photo?: ImageSource;
  /** Bis zu zwei weitere Fotos, nur bei Bildern */
  extras?: ExtraPhoto[];
  /** Post nur mit Text (Migration 20261107000100) */
  pages?: string[];
  sheetFont?: string;
  /** Nur bei Aufgaben */
  participation?: Participation;
  /** Nur in öffentlichen Gruppen (GroupPlaceField), freiwillig */
  location?: string;
  /** „Sehr privat“ (Migration 20261116000200) */
  veryPrivate?: boolean;
  coords?: { latitude: number; longitude: number };
};

/** Gruppenaufgabe oder Gruppenbild direkt veröffentlichen (ohne Entwurf). Ort nur in öffentlichen Gruppen. */
export async function createGroupTask(userId: string, task: NewGroupTask): Promise<Challenge> {
  const isPhoto = task.type === 'photo';
  const imagePath = task.photo ? await uploadPhoto(userId, task.photo, true) : null;
  const extraPaths = isPhoto ? await uploadExtras(userId, task.extras, true) : undefined;
  const { data } = check(
    await supabase
      .from('challenges')
      .insert({
        author_id: userId,
        group_id: task.groupId,
        type: isPhoto ? 'photo' : 'individual',
        edensteine: isPhoto ? null : task.edensteine,
        ...(isPhoto ? {} : participationFields(task.participation)),
        ...(extraPaths?.length ? { extra_image_paths: extraPaths } : {}),
        title: task.title.trim(),
        body: task.text.trim(),
        location: task.location?.trim() ?? '',
        ...(task.coords ? { lat: task.coords.latitude, lng: task.coords.longitude } : {}),
        deadline: task.deadline,
        image_path: imagePath,
        ...(task.veryPrivate ? { very_private: true } : {}),
        ...(isPhoto ? pagesField(task.pages, task.sheetFont) : {}),
      })
      .select(CHALLENGE_COLUMNS)
      .single(),
  );
  await signChallengePhotos([data as unknown as ChallengeRow]);
  return toChallenge(data as unknown as ChallengeRow, { liked: false });
}

/** Blätter eines eigenen offenen oder gelöschten Text-Posts ändern (Migration 20261107000100). */
export const setChallengePages = (id: string, pages: string[], font?: string) =>
  rpc('set_challenge_pages', { p_challenge_id: id, p_pages: cleanPages(pages), p_font: font ?? null });

export const challengeActions = {
  accept: (id: string) => rpc('accept_challenge', { p_challenge_id: id }),
  giveBack: (id: string) => rpc('give_back_challenge', { p_challenge_id: id }),
  report: (id: string, photoPath: string, note?: string) =>
    rpc('report_challenge', { p_challenge_id: id, p_photo_path: photoPath, p_note: note ?? null }),
  /** `userIds`: beim Bestätigen ausgewählt; ohne Angabe alle (Migration 20261028000400) */
  confirm: (id: string, userIds?: string[]) =>
    rpc('confirm_challenge', { p_challenge_id: id, ...(userIds ? { p_user_ids: userIds } : {}) }),
  undoConfirm: (id: string) => rpc('undo_confirm_challenge', { p_challenge_id: id }),
  reject: (id: string, reason: string) => rpc('reject_challenge', { p_challenge_id: id, p_reason: reason }),
  markPaid: (id: string) => rpc('mark_challenge_paid', { p_challenge_id: id }),
  unmarkPaid: (id: string) => rpc('unmark_challenge_paid', { p_challenge_id: id }),
  confirmReceived: (id: string) => rpc('confirm_bounty_received', { p_challenge_id: id }),
  /** Eine Person als bezahlt bzw. unbezahlt markieren (Migration 20261028000400) */
  markParticipantPaid: (id: string, userId: string, paid: boolean) =>
    rpc('mark_participant_paid', { p_challenge_id: id, p_user_id: userId, p_paid: paid }),
  /** Beitreten bzw. anfragen (Migration 20261028000300). Mit Standort: über 5 km nur Anfrage (Migration 20261029000100) */
  join: (id: string, coords?: { latitude: number; longitude: number }) =>
    rpc('join_challenge', { p_challenge_id: id, ...(coords ? { p_lat: coords.latitude, p_lng: coords.longitude } : {}) }),
  /** Umkreis-Begrenzung nachträglich ändern (Migration 20261029000100) */
  setLocalOnly: (id: string, localOnly: boolean) =>
    rpc('set_challenge_local_only', { p_challenge_id: id, p_local_only: localOnly }),
  /** „Sehr privat“ an oder aus (Migration 20261116000200) */
  setVeryPrivate: (id: string, on: boolean) => rpc('set_challenge_very_private', { p_challenge_id: id, p_on: on }),
  /** Privat, Kiez oder Überall nachträglich ändern (Migration 20261107000300) */
  setAudience: (id: string, isPrivate: boolean, localOnly: boolean) =>
    rpc('set_challenge_audience', { p_challenge_id: id, p_private: isPrivate, p_local_only: localOnly }),
  /** Aussteigen oder Anfrage zurückziehen */
  leave: (id: string) => rpc('leave_challenge', { p_challenge_id: id }),
  answerRequest: (id: string, userId: string, accept: boolean) =>
    rpc('answer_join_request', { p_challenge_id: id, p_user_id: userId, p_accept: accept }),
  removeParticipant: (id: string, userId: string) =>
    rpc('remove_participant', { p_challenge_id: id, p_user_id: userId }),
};

export type ChallengeEdit = {
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  /** Nur Kiez-Challenges; Gruppenaufgaben behalten ihre Edensteine */
  edensteine?: number;
  deadline: string;
  /** Neues Foto vom Gerät; ohne bleibt das bisherige */
  photo?: ImageSource;
  /** Nur mitgeben, wenn sich etwas ändert */
  participation?: Participation;
  /** Post nur mit Text: neue Blätter und Schrift (Migration 20261107000100) */
  pages?: string[];
  sheetFont?: string;
};


/**
 * Eigene offene Challenge bearbeiten (Migration 20261020000100_edit_open_challenge.sql).
 * Ein neues Foto wird hochgeladen und per set_challenge_image eingetragen (Migration 20261022000300).
 */
export async function editChallenge(id: string, edit: ChallengeEdit, userId?: string) {
  await inRewardOrder(id, edit.bountyAmount, edit.participation, (withoutBounty) => rpc('edit_open_challenge', {
    p_challenge_id: id,
    p_title: edit.title,
    p_body: edit.text,
    p_location: edit.location,
    p_bounty_amount: withoutBounty ? null : (edit.bountyAmount ?? null),
    p_deadline: edit.deadline,
    p_edensteine: edit.edensteine ?? null,
  }));
  if (edit.photo && userId) {
    const path = await uploadPhoto(userId, edit.photo, await isPrivateChallenge(id));
    await rpc('set_challenge_image', { p_challenge_id: id, p_image_path: path });
  }
  if (edit.pages) await setChallengePages(id, edit.pages, edit.sheetFont);
}

/**
 * Eigene gelöschte Challenge bearbeiten, ohne sie zu veröffentlichen (Migration 20261025000100).
 * Ein neues Foto wird vorher hochgeladen; die Datenbank trägt alles in einem Schritt ein.
 */
export async function editDeletedChallenge(id: string, edit: ChallengeEdit, userId?: string) {
  const imagePath = edit.photo && userId ? await uploadPhoto(userId, edit.photo, await isPrivateChallenge(id)) : null;
  await inRewardOrder(id, edit.bountyAmount, edit.participation, (withoutBounty) => rpc('edit_deleted_challenge', {
    p_challenge_id: id,
    p_title: edit.title,
    p_body: edit.text,
    p_location: edit.location,
    p_bounty_amount: withoutBounty ? null : (edit.bountyAmount ?? null),
    p_deadline: edit.deadline,
    p_image_path: imagePath,
    p_edensteine: edit.edensteine ?? null,
  }));
  if (edit.pages) await setChallengePages(id, edit.pages, edit.sheetFont);
}

/** Eigene offene Challenge schließen. Sie bleibt in der Timeline sichtbar (Migration 20261020000200). */
export const closeChallenge = (id: string) => rpc('close_challenge', { p_challenge_id: id });

export type DraftInput = {
  type?: 'individual' | 'photo';
  /** Entwurf in einer Gruppe, nur beim Anlegen (Migration 20261030000300) */
  groupId?: string;
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  /** Edensteine statt Euro, 1 bis 10 */
  edensteine?: number;
  coords?: { latitude: number; longitude: number };
  /** Neues Foto vom Gerät. Ohne neues Foto bleibt `imagePath`. */
  photo?: ImageSource;
  imagePath?: string;
  extras?: ExtraPhoto[];
  /** Modus „Privat“, nur beim Anlegen (Migration 20261028000100) */
  private?: boolean;
  /** Nur im Umkreis von 5 km, nicht in „Überall“ (Migration 20261029000100) */
  localOnly?: boolean;
  /** „Sehr privat“: kein Teilen, Fotos nur im privaten Speicher (Migration 20261116000200) */
  veryPrivate?: boolean;
  /** Nur „Nur ein Bild“: Text auf dem Foto (Migration 20261029000200). `null` löscht ihn im Entwurf. */
  photoText?: PhotoText | null;
  /** Post nur mit Text (Migration 20261107000100) */
  pages?: string[];
  sheetFont?: string;
  participation?: Participation;
};

/** Entwurf anlegen (ohne id) oder aktualisieren. Lädt ein neues Foto hoch. Gibt den gespeicherten Entwurf zurück. */
export async function saveDraft(userId: string, id: string | undefined, draft: DraftInput): Promise<Challenge> {
  const isPrivate = (id ? await isPrivateChallenge(id) : isPrivateAudience(draft)) || !!draft.veryPrivate;
  const imagePath = draft.imagePath ?? (draft.photo ? await uploadPhoto(userId, draft.photo, isPrivate) : null);
  const extraPaths = await uploadExtras(userId, draft.extras, isPrivate);
  const fields = {
    type: draft.type ?? 'individual',
    title: draft.title.trim(),
    body: draft.text.trim(),
    location: draft.location.trim(),
    bounty_amount: draft.bountyAmount ?? null,
    edensteine: draft.edensteine ?? null,
    image_path: imagePath,
  };
  const isTask = draft.type !== 'photo';
  const write = async (withoutBounty: boolean) => {
    const all = {
      ...fields,
      ...(withoutBounty ? { bounty_amount: null } : {}),
      ...optionalFields(draft.coords, extraPaths),
      // Nur mitschicken, wenn gewählt: Sonst bleibt der gespeicherte Stand des Entwurfs
      ...(draft.localOnly !== undefined && !draft.private ? { local_only: draft.localOnly } : {}),
      ...(draft.veryPrivate !== undefined ? { very_private: draft.veryPrivate } : {}),
      ...photoTextFields(draft.type, draft.photoText),
      ...(draft.type === 'photo' ? pagesField(draft.pages, draft.sheetFont) : {}),
    };
    const query = id
      ? supabase.from('challenges').update(all).eq('id', id).eq('status', 'draft')
      : supabase.from('challenges').insert({
          ...all,
          author_id: userId,
          status: 'draft',
          ...(draft.groupId ? { group_id: draft.groupId } : {}),
          ...(draft.private ? { visibility: 'private' } : {}),
          ...(isTask ? participationFields(draft.participation) : {}),
        });
    const { data } = check(await query.select(CHALLENGE_COLUMNS).single());
    await signChallengePhotos([data as unknown as ChallengeRow]);
    return toChallenge(data as unknown as ChallengeRow, { liked: false });
  };
  // Neuer Entwurf: Teilnahme steckt schon im Anlegen
  if (!id) return write(false);
  let saved: Challenge | undefined;
  // Bestehender Entwurf: Betrag und Plätze in einer Reihenfolge, bei der die Regel für Coins immer gilt
  await inRewardOrder(id, draft.bountyAmount, isTask ? draft.participation : undefined, async (withoutBounty) => {
    saved = await write(withoutBounty);
  });
  const p = isTask ? draft.participation : undefined;
  return p ? { ...saved!, maxParticipants: p.max, joinMode: p.mode } : saved!;
}

