import { useRoutineShown } from './features';
import { useFeature } from './freischaltung';
import { useStore } from './store';

/**
 * Darf diese Person Routine (Erinnerungen) überhaupt haben? Feature `routine` (freischaltung.ts), nur mit echten Daten.
 * Vorerst nur für Moderatorinnen zum Testen (Daria, 2026-11-09).
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
