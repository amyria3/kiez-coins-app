/**
 * Tastaturhöhe und Statusleiste für `revealFocused` (Nudge.tsx), gesetzt vom KeyboardProvider (Keyboard.tsx).
 * Eigenes Modul, weil Keyboard.tsx Nudge.tsx importiert und nicht umgekehrt (2026-11-23).
 */
export const keyboardMetrics = {
  /** Höhe der offenen Tastatur in Punkten, 0 wenn sie zu ist */
  height: 0,
  /** Höhe der Statusleiste oben; im Browser 0, in der Web-App auf dem Home-Bildschirm die Uhrzeile */
  safeTop: 0,
};
