/**
 * Wo das Logo im Feed-Kopf steht (Fenster-Koordinaten). Der Startbildschirm lässt sein großes Logo genau dorthin
 * gleiten (Daria, 2026-11-16). `null`, solange kein Feed-Kopf zu sehen ist, z. B. beim Start in der Routine.
 */
export type LogoRect = { x: number; y: number; width: number; height: number };

let target: LogoRect | null = null;

export function setLogoTarget(rect: LogoRect | null) {
  target = rect;
}

export function getLogoTarget(): LogoRect | null {
  return target;
}
