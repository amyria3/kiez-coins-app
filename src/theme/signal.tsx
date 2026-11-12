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

/** true, wenn hier Gelb statt Lila gilt */
export function usePrivateSignal(): boolean {
  return useContext(PrivateSignal) && !isFashionable;
}
