import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { isModerator } from './remote';
import { useStore } from './store';

/**
 * Feature-Freischaltung (Daria, 2026-11-10): Jede Funktion außerhalb des Kerns hat hier einen Schlüssel und ist an oder
 * aus. Ob sie für die angemeldete Person an ist, entscheidet die Datenbank (`public.feature_an`, Migration
 * 20261110001100): Moderatorinnen, Freischaltung für die Person, für eine ihrer Gruppen oder einen Verein, sonst der
 * Standard der Funktion. Neue Funktion: Schlüssel hier eintragen, dieselbe Zeile in `public.features` einfügen und
 * in der App `useFeature('schluessel')` abfragen.
 *
 * Unabhängig davon blendet jede Person Funktionen unter „Dein Konto › Funktionen“ für sich aus (`features.ts`).
 * Freigeschaltet heißt: Die Person darf die Funktion haben. Ausgeblendet heißt: Sie will sie gerade nicht sehen.
 */
export type FeatureKey = 'routine' | 'schaufenster' | 'weiterposten';

/**
 * Standard, solange die Datenbank nichts liefert (Migration fehlt, offline). Muss zu `public.features.default_on`
 * passen. Moderatorinnen haben immer alles an.
 */
export const FEATURE_DEFAULTS: Record<FeatureKey, { name: string; defaultOn: boolean }> = {
  routine: { name: 'Routine', defaultOn: true }, // für alle (Daria, 2026-11-10)
  schaufenster: { name: 'Schaufenster', defaultOn: true }, // für alle (Daria, 2026-11-10)
  weiterposten: { name: 'Weiterposten', defaultOn: true }, // für alle (Daria, 2026-11-09)
};

type FeatureMap = Partial<Record<FeatureKey, boolean>>;

/** Stand pro Person und Gruppe (`''` = ohne Gruppe), einmal pro Sitzung geladen */
const cache = new Map<string, FeatureMap>();
const pending = new Map<string, Promise<FeatureMap>>();
const cacheKey = (userId: string, groupId?: string) => `${userId}:${groupId ?? ''}`;

async function fetchFeatures(groupId?: string): Promise<FeatureMap> {
  const { data, error } = await supabase.rpc('meine_features', groupId ? { p_group_id: groupId } : {});
  if (!error && data && typeof data === 'object') return data as FeatureMap;
  // Migration fehlt oder offline: wie vorher, Moderatorinnen alles, sonst der Standard
  const moderator = await isModerator().catch(() => false);
  const fallback: FeatureMap = {};
  (Object.keys(FEATURE_DEFAULTS) as FeatureKey[]).forEach((k) => (fallback[k] = moderator || FEATURE_DEFAULTS[k].defaultOn));
  return fallback;
}

function loadFeatures(userId: string, groupId?: string): Promise<FeatureMap> {
  const key = cacheKey(userId, groupId);
  const known = cache.get(key);
  if (known) return Promise.resolve(known);
  let running = pending.get(key);
  if (!running) {
    running = fetchFeatures(groupId)
      .then((map) => {
        cache.set(key, map);
        return map;
      })
      .finally(() => pending.delete(key));
    pending.set(key, running);
  }
  return running;
}

/** Neu laden, z. B. nachdem Daria jemanden freigeschaltet hat und die App nicht neu starten soll */
export function forgetFeatures() {
  cache.clear();
}

/**
 * Ist die Funktion für die angemeldete Person an? Mit `groupId` zählt die Freischaltung genau dieser Gruppe
 * (z. B. Schaufenster auf der Gruppenseite). Nur mit echten Daten; in der Demo gilt der Standard.
 */
export function useFeature(feature: FeatureKey, groupId?: string): boolean {
  const { mode, currentUserId } = useStore();
  const live = mode === 'live' && !!currentUserId;
  const [map, setMap] = useState<FeatureMap | undefined>(() =>
    live ? cache.get(cacheKey(currentUserId, groupId)) : undefined,
  );
  useEffect(() => {
    if (!live) return;
    let active = true;
    loadFeatures(currentUserId, groupId).then((m) => active && setMap(m));
    return () => {
      active = false;
    };
  }, [live, currentUserId, groupId]);
  if (!live) return FEATURE_DEFAULTS[feature].defaultOn;
  // Während des Ladens der Standard; unbekannter Schlüssel: an
  if (!map) return FEATURE_DEFAULTS[feature].defaultOn;
  return map[feature] ?? true;
}
