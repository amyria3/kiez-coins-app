import { supabase } from '../../lib/supabase';
import type { SurveyAnswer, SurveyResults } from '../survey';

import { t } from '../texts';
import { check } from './mapping';

// ---------------------------------------------------------------------------
// UX/UI-Umfrage (Migrationen 20261021001500_survey, 20261026000100_survey_frequency_comment)
// ---------------------------------------------------------------------------

/** Eigene Antwort, falls schon abgegeben. */
export async function loadMySurveyAnswer(): Promise<SurveyAnswer | null> {
  const { data } = check(
    await supabase.from('survey_answers').select('opinion, frequency, usability, design, support, recommend, reason, reason_other, comment').maybeSingle(),
  );
  return (data as SurveyAnswer | null) ?? null;
}

/** Antwort speichern. Eine Antwort pro Person; erneutes Absenden ändert sie. */
export async function saveSurveyAnswer(answer: SurveyAnswer) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error(t('Melde Dich bitte neu an und versuche es dann noch mal.'));
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
// Rückmeldung zur Tour (Migration 20261029000300_tour_feedback)
// ---------------------------------------------------------------------------

export type TourFeedbackChoice = 'helpful' | 'motivating' | 'cumbersome' | 'not_needed';
export type TourFeedbackResults = {
  total: number;
  choices: Partial<Record<TourFeedbackChoice, number>>;
  other: { text: string; at: string }[];
};

/**
 * Antwort speichern. Mit Konto eine Antwort pro Person, erneutes Absenden ändert sie.
 * Ohne Konto (Beispieldaten) eine neue Antwort ohne Person (Migration 20261029000400, Daria: alle sollen
 * testen und Rückmeldung geben können).
 */
export async function saveTourFeedback(choices: TourFeedbackChoice[], other: string) {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  const answer = { choices, other: other.trim() || null };
  if (!user) {
    check(await supabase.from('tour_feedback').insert(answer));
    return;
  }
  check(
    await supabase
      .from('tour_feedback')
      .upsert({ user_id: user.id, ...answer, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
  );
}

/** Auswertung für die Moderation */
export async function loadTourFeedbackResults(): Promise<TourFeedbackResults> {
  const { data } = check(await supabase.rpc('tour_feedback_results'));
  return data as TourFeedbackResults;
}

