import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Wie Fotos weitergepostet werden (Daria, 13.11.2026): mit Rahmen wie beim Teilen, darin unten das KiezCoins-Logo.
 * Beides ist an, bis die Person es unter Dein Konto › Funktionen › Weiterposten abschaltet. Die Edge Function
 * `weiterposten` zeichnet den Rahmen. Gespeichert auf dem Gerät, wie die Auswahl der Plattformen.
 */
export type CrosspostLook = { frame: boolean; watermark: boolean };
export const FULL_CROSSPOST_LOOK: CrosspostLook = { frame: true, watermark: true };

const LOOK_KEY = 'crosspost_look_v1';

export async function loadCrosspostLook(): Promise<CrosspostLook> {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(LOOK_KEY)) ?? 'null') as Partial<CrosspostLook> | null;
    return { frame: saved?.frame !== false, watermark: saved?.watermark !== false };
  } catch {
    return FULL_CROSSPOST_LOOK;
  }
}

export function saveCrosspostLook(look: CrosspostLook) {
  AsyncStorage.setItem(LOOK_KEY, JSON.stringify(look)).catch(() => undefined);
}
