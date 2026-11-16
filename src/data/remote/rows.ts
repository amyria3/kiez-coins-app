import { supabase } from '../../lib/supabase';

import type {
  Challenge,
  ChallengeStatus,
  Gender,
  JoinMode,
  Participant,
  PayoutMethod,
  Profile,
} from '../types';


// Zugriff auf die Supabase-Tabellen (Schema: supabase/migrations).
// Statuswechsel laufen über Datenbankfunktionen, die Rolle und Status prüfen.

export { PHOTO_BUCKET } from '../photoPaths';

// ---------------------------------------------------------------------------
// Zeilen aus der Datenbank
// ---------------------------------------------------------------------------

export type ProfileRow = {
  id: string;
  handle: string | null;
  avatar_path: string | null;
  kiez: string | null;
  is_group: boolean;
  can_offer_bounties: boolean;
  gender?: Gender | null;
  is_test?: boolean | null;
};

const PROFILE_COLUMNS = 'id, handle, avatar_path, kiez, is_group, can_offer_bounties';
/** Öffentliche Profile mit Geschlecht und Test-Markierung */
export function selectProfiles(ids: string[]) {
  return supabase.from('profiles').select(`${PROFILE_COLUMNS}, gender, is_test`).in('id', ids);
}

export type SettingsRow = {
  address_form: Profile['addressForm'] | null;
  address_custom: string | null;
  push: boolean;
  onboarded: boolean;
  paused_until: string | null;
  age_confirmed_at: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
};

type CommentRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  reply_to_id?: string | null;
  /** Bildkommentare (Migration 20261110001400) */
  image_path?: string | null;
};

export type ChallengeRow = {
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
  /** Mehrere Personen (Migration 20261028000300) */
  max_participants?: number | null;
  join_mode?: JoinMode | null;
  /** Migration 20261028000100 */
  visibility?: 'public' | 'private' | null;
  /** Migration 20261029000100 */
  local_only?: boolean | null;
  /** Migration 20261116000200 */
  very_private?: boolean | null;
  /** Text auf dem Foto (Migration 20261029000200) */
  photo_text?: string | null;
  photo_text_x?: number | null;
  photo_text_y?: number | null;
  extra_image_paths?: string[] | null;
  /** Post nur mit Text (Migration 20261107000100) */
  pages?: string[] | null;
  sheet_font?: string | null;
  /** Markierung aus einer Erinnerung (Migration 20261110000100) */
  routine_label?: string | null;
  image_before_path: string | null;
  image_after_path: string | null;
  /** Vorher-Nachher (Migration 20261023000300) */
  before_text?: string | null;
  after_text?: string | null;
  timer_started_at?: string | null;
  finished_at?: string | null;
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

export type ParticipantRow = {
  challenge_id: string;
  user_id: string;
  status: Participant['status'];
  requested_at: string;
  joined_at: string | null;
};

export type ShareRow = {
  challenge_id: string;
  /** Ohne Spalte in älteren Abfragen leer */
  user_id?: string;
  method: PayoutMethod;
  account_holder: string | null;
  iban: string | null;
  paypal: string | null;
};

/** Auszahlung je Person (Migration 20261028000400) */
export type PayoutLineRow = {
  challenge_id: string;
  user_id: string;
  amount_cents: number;
  paid_marked_at: string | null;
  paid_at: string | null;
};

export type PayoutRow = { account_holder: string | null; iban: string | null; paypal: string | null };

