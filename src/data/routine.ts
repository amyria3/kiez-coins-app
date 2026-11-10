import { useEffect, useState } from 'react';

import { useRoutineShown } from './features';
import { isModerator } from './remote';
import { useStore } from './store';

/**
 * Darf diese Person Routine (Erinnerungen) überhaupt haben? Vorerst nur für Daria zum Testen (2026-11-09),
 * daher nur für Personen in der Tabelle `moderators` und nur mit echten Daten.
 */
export function useRoutineAvailable(): boolean {
  const { mode } = useStore();
  const [moderator, setModerator] = useState(false);
  useEffect(() => {
    if (mode !== 'live') return;
    isModerator().then(setModerator).catch(() => undefined);
  }, [mode]);
  return mode === 'live' && moderator;
}

/** Knopf „Routine“ im Feed und Kater-Hinweise: verfügbar und unter Funktionen nicht ausgeblendet (Daria, 2026-11-10) */
export function useRoutineEnabled(): boolean {
  const available = useRoutineAvailable();
  const shown = useRoutineShown();
  return available && shown;
}
