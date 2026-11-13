import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

import { color, isFashionable } from './tokens';

/**
 * Bereich, in dem man gerade ist (Daria, 2026-11-13): eine Quelle für die Signalfarben statt mehrerer Schalter.
 * - `me`: „Me & Myself“ (My Structure, My Feed) und Erstellen unter „Privat“. Signalfarbe Gelb.
 * - `public`: Kiez und Überall. Signalfarbe Lila.
 * - `group`: Gruppen. Signalfarbe Lila.
 * Der Feed berechnet den Bereich einmal und gibt ihn mit `SpaceProvider` an alles darunter weiter: Umschalter,
 * Hauptbuttons, Fokusrahmen, Suchfeld, Erstellen. So wechseln alle Farben im selben Moment.
 * Nur im Look „Kiez“; „Fashionable“ bleibt bei Lila.
 */
export type Space = 'me' | 'public' | 'group';

const SpaceContext = createContext<Space>('public');

export const SpaceProvider = SpaceContext.Provider;

export function useSpace(): Space {
  return useContext(SpaceContext);
}

/** Farben eines Bereichs: Akzent (gewählte Knöpfe, Hauptbuttons) und Fokus (Rahmen, Cursor, eingeschaltete Schalter) */
export function spaceColors(space: Space): { accent: string; focus: string } {
  const me = space === 'me' && !isFashionable;
  return { accent: me ? color.accent.private : color.accent.primary, focus: me ? color.accent.private : color.accent.focus };
}

/** Kurzform für Stellen, die nur „privat oder nicht“ kennen, z. B. das Erstellen-Blatt unter „Privat“ */
export function PrivateSignalProvider({ value, children }: { value: boolean; children: ReactNode }) {
  const outer = useSpace();
  return <SpaceContext.Provider value={value ? 'me' : outer === 'me' ? 'public' : outer}>{children}</SpaceContext.Provider>;
}

/** Akzentfarbe an dieser Stelle: Gelb in „Me & Myself“, sonst color/accent/primary */
export function useAccentColor(): string {
  return spaceColors(useSpace()).accent;
}

/** Fokus und eingeschaltete Schalter: Gelbgrün, in „Me & Myself“ Gelb (Daria, 2026-11-13) */
export function useFocusColor(): string {
  return spaceColors(useSpace()).focus;
}

/**
 * Bereich der Seite, die gerade vorn ist (Daria, 2026-11-13). Für alles, was über der ganzen App liegt und deshalb
 * außerhalb des Feeds gezeichnet wird: Dialoge („Foto hinzufügen“), Teilen, Weiterposten. Der Feed setzt ihn,
 * solange er vorn ist; sonst gilt `public`.
 */
let frontSpace: Space = 'public';
const frontListeners = new Set<() => void>();
/** Jede Seite im Vordergrund legt ihren Bereich ab und nimmt ihn beim Verlassen wieder weg; es gilt der zuletzt abgelegte */
const frontStack: { id: number; space: Space }[] = [];
let frontSeq = 0;
function updateFront() {
  const next = frontStack.length ? frontStack[frontStack.length - 1].space : 'public';
  if (next === frontSpace) return;
  frontSpace = next;
  frontListeners.forEach((l) => l());
}
/** Bereich der vorderen Seite setzen. Gibt die Funktion zurück, die ihn wieder entfernt (für useFocusEffect). */
export function pushFrontSpace(space: Space): () => void {
  const id = ++frontSeq;
  frontStack.push({ id, space });
  updateFront();
  return () => {
    const i = frontStack.findIndex((e) => e.id === id);
    if (i >= 0) frontStack.splice(i, 1);
    updateFront();
  };
}

/**
 * Seite, die zu „Me & Myself“ gehört, z. B. Neue Erinnerung, Bearbeiten, Erledigt (Daria, 2026-11-13): gelb wie die
 * Routine, auch in Dialogen über der Seite.
 */
export function MeSpaceScreen({ children }: { children: ReactNode }) {
  useFocusEffect(useCallback(() => pushFrontSpace('me'), []));
  return <SpaceContext.Provider value="me">{children}</SpaceContext.Provider>;
}
export function useFrontSpace(): Space {
  return useSyncExternalStore(
    (l) => {
      frontListeners.add(l);
      return () => frontListeners.delete(l);
    },
    () => frontSpace,
    () => frontSpace,
  );
}
/** Gibt den Bereich der vorderen Seite an Overlays weiter, die über der App liegen */
export function FrontSpaceProvider({ children }: { children: ReactNode }) {
  return <SpaceContext.Provider value={useFrontSpace()}>{children}</SpaceContext.Provider>;
}

/** true, wenn hier Gelb statt Lila gilt */
export function usePrivateSignal(): boolean {
  return useSpace() === 'me' && !isFashionable;
}
