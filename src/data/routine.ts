import { useEffect, useState } from 'react';

import { isModerator } from './remote';
import { useStore } from './store';

/**
 * Knopf „Routine“ im Feed (Daria, 2026-11-09): Dort entstehen die Erinnerungen. Vorerst nur für Daria zum Testen,
 * daher nur für Personen in der Tabelle `moderators` und nur mit echten Daten.
 */
export function useRoutineEnabled(): boolean {
  const { mode } = useStore();
  const [moderator, setModerator] = useState(false);
  useEffect(() => {
    if (mode !== 'live') return;
    isModerator().then(setModerator).catch(() => undefined);
  }, [mode]);
  return mode === 'live' && moderator;
}
