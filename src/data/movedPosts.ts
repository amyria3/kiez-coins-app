import { useEffect, useState } from 'react';

/**
 * Verschobene Posts (Daria, 2026-11-16): Nach „Verschieben …“ steht im Feed, aus dem der Post verschwindet, an seiner
 * Stelle eine schließbare Nachricht „Dein Post wurde verschoben.“ mit Link zum neuen Ort. Kein eigener Bildschirm.
 * Gemerkt wird nur für die laufende Sitzung: wo der Post vorher stand und wohin er ging.
 */
export type MoveTarget = 'private' | 'nearby' | 'everywhere';
export type Moved = { before: { private: boolean; localOnly: boolean }; to: MoveTarget };

const moved = new Map<string, Moved>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function rememberMove(id: string, entry: Moved) {
  moved.set(id, entry);
  notify();
}

export function forgetMove(id: string) {
  if (moved.delete(id)) notify();
}

/** Aktuelle Liste als neue Map nach jeder Änderung (für useMemo) */
export function useMovedPosts(): ReadonlyMap<string, Moved> {
  const [snapshot, setSnapshot] = useState(() => new Map(moved));
  useEffect(() => {
    const listener = () => setSnapshot(new Map(moved));
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snapshot;
}

/** Knopf zum neuen Ort und Reiter im Feed */
export const MOVE_LINK: Record<MoveTarget, string> = {
  private: 'In Me & Myself ansehen',
  nearby: 'Im Kiez ansehen',
  everywhere: 'In „Überall“ ansehen',
};
