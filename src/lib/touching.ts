import { Platform } from 'react-native';

/**
 * Liegt gerade ein Finger auf dem Bildschirm? (Daria, 2026-11-14: „nicht alle verhalten sich erwartungsgemäß“)
 * Was von selbst passiert (Kopf ausblenden, Begrüßung entfernen, Karten neu sortieren), wartet, bis der Finger weg
 * ist. Sonst springt der Inhalt unter dem Finger, und es flackert.
 * Im Browser zählen Zuhörer am Dokument; in der App meldet der Feed Berührungen über `touchStarted`/`touchEnded`.
 */
let active = 0;
const waiting = new Set<() => void>();

function release() {
  if (active > 0) return;
  const run = [...waiting];
  waiting.clear();
  run.forEach((fn) => fn());
}

export function touchStarted() {
  active += 1;
}
export function touchEnded() {
  active = Math.max(0, active - 1);
  // Erst nach dem Ereignis, damit Tippen und Loslassen fertig verarbeitet sind
  setTimeout(release, 0);
}
export const isTouching = () => active > 0;

/**
 * Führt `fn` jetzt aus oder sobald kein Finger mehr liegt. Gibt eine Funktion zum Abbrechen zurück.
 * Sicherung: Geht ein Loslassen verloren (Seite gewechselt, Maus außerhalb des Fensters losgelassen), läuft `fn`
 * spätestens nach `MAX_WAIT_MS`, und der Zähler steht wieder auf null.
 */
const MAX_WAIT_MS = 10_000;
export function whenUntouched(fn: () => void): () => void {
  if (active === 0) {
    fn();
    return () => {};
  }
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    waiting.delete(once);
    fn();
  };
  const timer = setTimeout(() => {
    active = 0;
    once();
  }, MAX_WAIT_MS);
  waiting.add(once);
  return () => {
    done = true;
    clearTimeout(timer);
    waiting.delete(once);
  };
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Jeder Finger einzeln; `touches.length` ist nach dem Loslassen die Zahl der verbliebenen
  const sync = (e: TouchEvent) => {
    const before = active;
    active = e.touches.length;
    if (before > 0 && active === 0) setTimeout(release, 0);
  };
  document.addEventListener('touchstart', sync, { passive: true, capture: true });
  document.addEventListener('touchend', sync, { passive: true, capture: true });
  document.addEventListener('touchcancel', sync, { passive: true, capture: true });
  document.addEventListener('mousedown', () => (active = 1), { capture: true });
  // Fenster verlassen oder verdeckt: Ein Loslassen kommt dann nicht mehr an
  const reset = () => {
    active = 0;
    setTimeout(release, 0);
  };
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => document.hidden && reset());
  document.addEventListener(
    'mouseup',
    () => {
      active = 0;
      setTimeout(release, 0);
    },
    { capture: true },
  );
}
