import { useCallback, useEffect, useRef, useState } from 'react';

import { katerSaying, type KaterSaying } from '../data/kater';

/**
 * Was der Kater sagt: `hallo()` und `noch()` holen einen neuen Spruch, `take` zählt mit, damit die Aktion neu startet.
 * Ohne Eingabe sagt er nach `idleMs` von selbst etwas (0: nie).
 */
export function useKater(start: 'hallo' | 'sprueche' | null = null, idleMs = 12000) {
  const [saying, setSaying] = useState<KaterSaying | null>(() => (start ? katerSaying(start) : null));
  const [take, setTake] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = useCallback((list: 'hallo' | 'sprueche') => {
    setSaying(katerSaying(list));
    setTake((n) => n + 1);
  }, []);
  useEffect(() => {
    if (!idleMs) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => say('sprueche'), idleMs + Math.random() * 5000);
    return () => clearTimeout(timer.current);
  }, [take, idleMs, say]);
  return { spruch: saying, take, hallo: () => say('hallo'), noch: () => say('sprueche') };
}
