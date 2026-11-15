import { Platform } from 'react-native';

/**
 * Browser auf Telefon oder Tablet (Touch). Dort öffnet ein Feld, das beim Laden den Fokus bekommt, keine Tastatur:
 * iOS zeigt die Tastatur nur bei einem Fokus direkt aus einem Tippen. Das Feld sieht dann aktiv aus, und ein Tippen
 * darauf öffnet die Tastatur trotzdem nicht (Daria, 2026-11-15, Anmelden auf dem iPhone).
 */
export const isTouchWeb =
  Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
