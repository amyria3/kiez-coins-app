import { Platform } from 'react-native';

/**
 * Browser auf Telefon oder Tablet (Touch). iOS öffnet die Tastatur nur bei einem Fokus direkt aus einem Tippen.
 * Ein Feld mit automatischem Fokus sieht dann aktiv aus, ohne Tastatur. TextField löst den Fokus deshalb beim
 * Antippen kurz, damit das Tippen die Tastatur öffnet (Daria, 2026-11-15, Anmelden auf dem iPhone).
 */
export const isTouchWeb =
  Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
