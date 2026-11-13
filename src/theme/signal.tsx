import { createContext, useContext } from 'react';

import { color, isFashionable } from './tokens';

/**
 * In „Me & Myself“ und beim Erstellen unter „Privat“ ist Gelb die Signalfarbe statt Lila:
 * gewählte Umschalter, Hauptbuttons, Fokusrahmen (Daria, 2026-11-12). Nur im Look „Kiez“.
 */
const PrivateSignal = createContext(false);

export const PrivateSignalProvider = PrivateSignal.Provider;

/** Akzentfarbe an dieser Stelle: Gelb unter „Privat“ / „Me & Myself“, sonst color/accent/primary */
export function useAccentColor(): string {
  const on = useContext(PrivateSignal);
  return on && !isFashionable ? color.accent.private : color.accent.primary;
}

/** Fokus und eingeschaltete Schalter: Gelbgrün, unter „Privat“ / „Me & Myself“ Gelb (Daria, 2026-11-13) */
export function useFocusColor(): string {
  const on = useContext(PrivateSignal);
  return on && !isFashionable ? color.accent.private : color.accent.focus;
}

/** true, wenn hier Gelb statt Lila gilt */
export function usePrivateSignal(): boolean {
  return useContext(PrivateSignal) && !isFashionable;
}
