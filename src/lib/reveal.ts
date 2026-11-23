/**
 * Eine Regel für alle Eingabefelder (Daria, 2026-11-23: „Feld lag knapp über der Tastatur am Rand“): Das aktive Feld
 * mit seiner Beschriftung und das nächste Feld darunter stehen im sichtbaren Bereich, mit `REVEAL_GAP` Luft oben und
 * unten. Gescrollt wird nur so weit wie nötig. Passt beides nicht hinein, reicht das aktive Feld; ist es höher als der
 * Platz (lange Beschreibung), steht sein Anfang oben.
 *
 * Reine Rechnung ohne React Native, getestet in tests/reveal.test.ts. Messen und Scrollen: components/Nudge.tsx
 * (`revealFocused`), ausgelöst von components/Keyboard.tsx und beim Sprung ins nächste Feld.
 */

/** Senkrechte Lage auf dem Bildschirm, in Punkten von oben */
export type Span = { top: number; bottom: number };

/** Luft zwischen Feld und Rand des sichtbaren Bereichs (Tastatur, Kopfzeile) */
export const REVEAL_GAP = 24;

/**
 * Wie weit die Scrollfläche scrollen muss: positiv heißt Inhalt nach oben, negativ nach unten, 0 heißt stehen lassen.
 * `visible` ist der Teil der Scrollfläche, den weder Tastatur noch Statusleiste verdecken.
 */
export function revealDelta(field: Span, visible: Span, next?: Span | null, gap = REVEAL_GAP): number {
  const room = visible.bottom - visible.top;
  const top = field.top - gap;
  let bottom = (next && next.top >= field.bottom ? next.bottom : field.bottom) + gap;
  if (bottom - top > room) bottom = field.bottom + gap;
  if (bottom - top > room) bottom = top + room;
  if (top < visible.top) return top - visible.top;
  if (bottom > visible.bottom) return bottom - visible.bottom;
  return 0;
}

/** Sichtbarer Teil einer Scrollfläche: geschnitten mit dem Bereich über der Tastatur und unter der Statusleiste */
export function visibleSpan(scroll: Span, screen: Span): Span {
  return { top: Math.max(scroll.top, screen.top), bottom: Math.min(scroll.bottom, screen.bottom) };
}
