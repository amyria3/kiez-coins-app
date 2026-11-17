import { createContext, useCallback, useContext, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

import type { Space } from './spaces';
import { color } from './tokens';

/**
 * Bereich, in dem man gerade ist (Daria, 2026-11-13): eine Quelle für die Signalfarben statt mehrerer Schalter.
 * Drei Themes (Daria, 2026-11-14), der Bereich wählt sie, nicht die Person. Schalter (an) und Fokus haben die
 * Akzentfarbe des Bereichs, ausgeschaltete Schalter eine dunkle Tönung (Daria, 2026-11-15):
 * - Friendship (Standard, `public` und `group`): Knöpfe, Schalter und Fokus Lila; aus dunkles Grau-Violett.
 * - Happy (`me`): Knöpfe, Schalter und Fokus Gelb.
 * - Functional (`functional`): Seiten unter dem Menü (Konto, Funktionen, Moderation, Texte).
 *   Knöpfe, Schalter und Fokus Grün wie das Menü-Icon und die Herzen in der Brille des Katers (seit 2026-11-17).
 * - `me`: „Me & Myself“ (My Structure, My Feed) und Erstellen unter „Privat“. Signalfarbe Gelb.
 * - `public`: Kiez und Überall. Signalfarbe Lila.
 * - `group`: Gruppen. Signalfarbe Lila.
 * - Schaufenster (`showcase`, seit 2026-11-17): alle Seiten des Schaufensters, auch Verwalten und Bearbeiten.
 *   Knöpfe, Schalter und Fokus Gelbgrün wie „Folgen“ und die Termine.
 * Den Bereich jeder Seite bestimmt eine Stelle: `RouteSpace` im Root-Layout (siehe `spaceOfRoute`). Alles darunter
 * liest ihn: Umschalter, Hauptbuttons, Fokusrahmen, Suchfeld, Erstellen. So wechseln alle Farben im selben Moment.
 * Nur im Look „Kiez“; „Fashionable“ bleibt bei Lila.
 */
export type { Space } from './spaces';
export { isFunctionalRoute, spaceOfRoute } from './spaces';

const SpaceContext = createContext<Space>('public');

export function useSpace(): Space {
  return useContext(SpaceContext);
}

/** Farben eines Bereichs: Akzent (gewählte Knöpfe, Hauptbuttons) und Fokus (Rahmen, Cursor, eingeschaltete Schalter) */
export function spaceColors(space: Space): { accent: string; focus: string; off: string } {
  if (space === 'me') return { accent: color.accent.private, focus: color.accent.private, off: color.toggle.offPrivate };
  if (space === 'functional') return { accent: color.accent.functional, focus: color.accent.functional, off: color.toggle.offFunctional };
  if (space === 'showcase') return { accent: color.accent.showcase, focus: color.accent.showcase, off: color.toggle.offShowcase };
  return { accent: color.accent.primary, focus: color.accent.focus, off: color.toggle.off };
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

/** Ausgeschaltete Schalter im Farbton des Themes (Daria, 2026-11-14) */
export function useToggleOffColor(): string {
  return spaceColors(useSpace()).off;
}

/** Fokus und eingeschaltete Schalter: Akzent des Bereichs, in Feeds Lila, in „Me & Myself“ Gelb (Daria, 2026-11-15) */
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

const SpaceOverrideContext = createContext<((space: Space | undefined) => void) | undefined>(undefined);

/** Bereich einer Seite samt Dialogen darüber. Nur für `RouteSpace`. */
export function SpaceScreen({ space, children }: { space: Space; children: ReactNode }) {
  const [override, setOverride] = useState<Space | undefined>();
  const value = override ?? space;
  useFocusEffect(useCallback(() => pushFrontSpace(value), [value]));
  return (
    <SpaceOverrideContext.Provider value={setOverride}>
      <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>
    </SpaceOverrideContext.Provider>
  );
}

/**
 * Die Seite bestimmt den Bereich selbst, weil eine Wahl auf ihr ihn ändert (z. B. Reiter im Feed, Ziel beim
 * Erstellen). `undefined`: wieder der Bereich aus der Route.
 */
export function useSpaceOverride(space: Space | undefined) {
  const set = useContext(SpaceOverrideContext);
  // Vor dem Zeichnen, damit die Seite nicht kurz in der falschen Farbe erscheint
  useLayoutEffect(() => {
    set?.(space);
  }, [set, space]);
  useLayoutEffect(() => () => set?.(undefined), [set]);
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
  return useSpace() === 'me' && true;
}
