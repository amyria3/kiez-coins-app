import { supabase } from '../../lib/supabase';

import { t } from '../texts';
import type {
  Challenge,
  ImageSource,
} from '../types';
import { loadChallenge } from './load';
import { check } from './mapping';
import { rpc, uploadPhoto } from './write';

// ---------------------------------------------------------------------------
// Vorher-Nachher (Migration 20261023000300)
// ---------------------------------------------------------------------------

/** Höchstdauer des Timers. Danach postet der Server den Entwurf, auch ohne Nachher-Foto. */
export const BEFORE_AFTER_MAX_MS = 48 * 60 * 60 * 1000;
/** Höchstlänge je Erklärung (ohne #vorher/#nachher) */
export const BEFORE_AFTER_TEXT_MAX = 240;

export type NewBeforeAfter = {
  /** leer: öffentlich im Kiez */
  groupId?: string;
  /** Modus „Privat“, nur ohne Gruppe (Migration 20261028000100) */
  private?: boolean;
  /** Nur im Umkreis von 5 km, nicht in „Überall“ (Migration 20261029000100) */
  localOnly?: boolean;
  title: string;
  beforeText: string;
  photo: ImageSource;
};

export type BeforeAfterEdit = {
  title?: string;
  beforeText?: string;
  afterText?: string;
  /** Neue Fotos vom Gerät */
  beforePhoto?: ImageSource;
  afterPhoto?: ImageSource;
};

/** 1. Entwurf mit Vorher-Foto anlegen. Gibt den Entwurf zurück. */
export async function startBeforeAfter(userId: string, input: NewBeforeAfter): Promise<Challenge> {
  const path = await uploadPhoto(userId, input.photo);
  const { data } = check(
    await supabase.rpc('start_before_after', {
      p_group_id: input.groupId ?? null,
      p_title: input.title,
      p_before_text: input.beforeText,
      p_image_before_path: path,
    }),
  );
  // Privat: Der Entwurf bekommt die Sichtbarkeit gleich nach dem Anlegen (Policy „Eigenen Entwurf bearbeiten“)
  if (input.private && !input.groupId) {
    check(await supabase.from('challenges').update({ visibility: 'private' }).eq('id', data as string).eq('status', 'draft'));
  } else if (input.localOnly && !input.groupId) {
    check(await supabase.from('challenges').update({ local_only: true }).eq('id', data as string).eq('status', 'draft'));
  }
  // Gleich offen im Feed statt Entwurf (Daria, 2026-11-09). Ohne Migration 20261109000200 bleibt es ein Entwurf.
  await supabase.rpc('open_before_after', { p_challenge_id: data as string });
  const { challenge } = await loadChallenge(data as string, userId);
  if (!challenge) throw new Error(t('Der Entwurf ist nicht angekommen. Versuche es bitte noch mal.'));
  return challenge;
}

/** 2. Timer starten. Gibt den Startzeitpunkt vom Server zurück. */
export async function startBeforeAfterTimer(id: string): Promise<string> {
  const { data } = check(await supabase.rpc('start_before_after_timer', { p_challenge_id: id }));
  return data as string;
}

/** Timer stoppen: wieder ein Entwurf ohne Timer (Migration 20261027000100). */
export const stopBeforeAfterTimer = (id: string) => rpc('stop_before_after_timer', { p_challenge_id: id });

/** 3. Entwurf ändern: neue Fotos hochladen, Texte setzen. Nicht übergebene Werte bleiben. */
export async function updateBeforeAfter(userId: string, id: string, edit: BeforeAfterEdit): Promise<void> {
  const before = edit.beforePhoto ? await uploadPhoto(userId, edit.beforePhoto) : null;
  const after = edit.afterPhoto ? await uploadPhoto(userId, edit.afterPhoto) : null;
  await rpc('update_before_after', {
    p_challenge_id: id,
    p_title: edit.title ?? null,
    p_before_text: edit.beforeText ?? null,
    p_after_text: edit.afterText ?? null,
    p_image_before_path: before,
    p_image_after_path: after,
  });
}

/** 4. Posten. Die Datenbank setzt den Text aus #vorher und #nachher zusammen. */
export const finishBeforeAfter = (id: string) => rpc('finish_before_after', { p_challenge_id: id });

/** Entwurf veröffentlichen. Die Datenbank prüft Titel, Ort (nur Kiez), Foto (nicht bei Gruppenaufgaben), Frist und Bounty. */
export const publishDraft = (id: string, deadline: string) =>
  rpc('publish_challenge', { p_challenge_id: id, p_deadline: deadline });
