import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';

/**
 * Einfaches CMS für Button-Beschriftungen und Kater-Texte.
 *
 * Die Texte stehen weiter im Code. Die Tabelle `app_texts` in Supabase hält zu jedem Text (`original`)
 * eine Fassung (`text`), die Daria im Table Editor ändert. Die App lädt beim Start alle geänderten
 * Fassungen und zeigt sie statt des Originals. Ohne Netz gilt der zuletzt geladene Stand, ohne den das Original.
 *
 * Platzhalter in geschweiften Klammern, z. B. „Ahoi, {anrede}!“, setzt die App ein. Sie müssen in der
 * geänderten Fassung erhalten bleiben.
 *
 * Neue Texte in die Tabelle bringen: `node scripts/app-texts.mjs` erzeugt SQL für den SQL-Editor.
 */

const CACHE_KEY = 'app_texts_v1';

let overrides = new Map<string, string>();
let version = 0;
const listeners = new Set<() => void>();

/** Leerraum wie in JSX zusammenfassen, damit Zeilenumbrüche im Code den Schlüssel nicht ändern. */
export const normalizeText = (s: string) => s.replace(/\s+/g, ' ').trim();

function apply(rows: { original: string; text: string }[]) {
  const next = new Map<string, string>();
  for (const row of rows) {
    const key = normalizeText(row.original);
    const value = row.text?.trim();
    if (value && normalizeText(value) !== key) next.set(key, value);
  }
  overrides = next;
  version += 1;
  listeners.forEach((l) => l());
}

/** Beim Start: erst den gespeicherten Stand, dann frisch aus Supabase. Fehler bleiben still. */
export async function loadTexts() {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) apply(JSON.parse(cached));
  } catch {
    // ohne Speicher geht es mit den Originalen weiter
  }
  try {
    const { data, error } = await supabase.from('app_texts').select('original, text').neq('text', '');
    if (error || !data) return;
    apply(data);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.filter((r) => normalizeText(r.text) !== normalizeText(r.original))));
  } catch {
    // Tabelle fehlt (Migration noch nicht gelaufen) oder kein Netz: Originale
  }
}

/**
 * Text mit Darias Fassung, falls es eine gibt. `vars` füllt Platzhalter wie {anrede}.
 * Ohne Fassung bleibt der Text, wie er ist.
 */
export function t(original: string, vars?: Record<string, string | number>): string {
  let out = overrides.get(normalizeText(original)) ?? original;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) out = out.split(`{${name}}`).join(String(value));
  }
  return out;
}

/** Für Komponenten: rendert neu, sobald die Texte geladen sind. */
export function useTexts(): typeof t {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => version,
  );
  return t;
}
