import { useCallback, useEffect, useRef, useState } from 'react';

import { katerSpruch, type KaterSpruch } from '../data/kater';

/**
 * Was der Kater sagt: `hallo()` und `noch()` holen einen neuen Spruch, `take` zählt mit, damit die Aktion neu startet.
 * Ohne Eingabe sagt er nach `idleMs` von selbst etwas (0: nie).
 */
export function useKater(start: 'hallo' | 'sprueche' | null = null, idleMs = 12000) {
  const [spruch, setSpruch] = useState<KaterSpruch | null>(() => (start ? katerSpruch(start) : null));
  const [take, setTake] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sag = useCallback((liste: 'hallo' | 'sprueche') => {
    setSpruch(katerSpruch(liste));
    setTake((n) => n + 1);
  }, []);
  useEffect(() => {
    if (!idleMs) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => sag('sprueche'), idleMs + Math.random() * 5000);
    return () => clearTimeout(timer.current);
  }, [take, idleMs, sag]);
  return { spruch, take, hallo: () => sag('hallo'), noch: () => sag('sprueche') };
}
