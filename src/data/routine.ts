import { useCalendarShown, useRoutineShown, useRoutineStandardSaved } from './features';
import { useFeature } from './freischaltung';
import { useStore } from './store';

/**
 * Darf diese Person Routine (Erinnerungen) überhaupt haben? Feature `routine` (freischaltung.ts), nur mit echten Daten.
 * Für alle an (Daria, 2026-11-10).
 */
export function useRoutineAvailable(): boolean {
  const { mode } = useStore();
  const on = useFeature('routine');
  return mode === 'live' && on;
}

/** Knopf „Routine“ im Feed und Kater-Hinweise: verfügbar und unter Funktionen nicht ausgeblendet (Daria, 2026-11-10) */
export function useRoutineEnabled(): boolean {
  const available = useRoutineAvailable();
  const shown = useRoutineShown();
  return available && shown;
}

/** Routine ist der Standard und die App öffnet sie beim Start (Dein Konto › Funktionen, Daria, 2026-11-10) */
export function useRoutineIsStandard(): boolean {
  const enabled = useRoutineEnabled();
  const saved = useRoutineStandardSaved();
  return enabled && saved;
}

/**
 * Kalender (Daria, 2026-11-10): gehört zu Routine und hat eine eigene Freischaltung (`kalender`). Verfügbar heißt: Die
 * Person darf ihn haben, er steht unter Dein Konto › Einstellungen.
 */
export function useCalendarAvailable(): boolean {
  const routine = useRoutineAvailable();
  const on = useFeature('kalender');
  return routine && on;
}

/**
 * Kalender an: verfügbar, Routine nicht ausgeblendet und unter Einstellungen › Kalender nicht ausgeschaltet. Der Schalter
 * gilt unabhängig davon, ob ein Kalender eingerichtet ist (Daria, 2026-11-10).
 */
export function useCalendarEnabled(): boolean {
  const available = useCalendarAvailable();
  const routine = useRoutineShown();
  const shown = useCalendarShown();
  return available && routine && shown;
}
