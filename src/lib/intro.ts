import { useEffect, useState } from 'react';

/**
 * Startbildschirm (Kater mit Besen, StartKater) vorbei? Der Feed liegt schon darunter, sobald die Anmeldung geladen
 * ist. Was erst wirken soll, wenn man den Feed sieht (Kopf ausblenden nach ein paar Sekunden), wartet hierauf.
 */
let done = false;
const listeners = new Set<() => void>();

/** Ruft src/app/_layout.tsx auf, wenn der Startbildschirm weg ist. */
export function markIntroDone() {
  if (done) return;
  done = true;
  listeners.forEach((l) => l());
}

export function useIntroDone(): boolean {
  const [value, setValue] = useState(done);
  useEffect(() => {
    if (done) {
      setValue(true);
      return;
    }
    const l = () => setValue(true);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return value;
}
