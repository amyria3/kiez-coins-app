import { useSyncExternalStore } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { supabase } from '../lib/supabase';
import ar from '../i18n/ar.json';
import en from '../i18n/en.json';
import fr from '../i18n/fr.json';
import he from '../i18n/he.json';
import ru from '../i18n/ru.json';
import uk from '../i18n/uk.json';
import { genderOverlays } from '../i18n/gender';
import type { Gender } from './types';

/**
 * Texte und Sprachen.
 *
 * Alle Texte stehen auf Deutsch im Code. `t(original)` liefert die Fassung in der gewählten Sprache:
 * - Deutsch: Darias Fassung aus der Tabelle `app_texts` (Spalte `text`), sonst das Original.
 * - Andere Sprachen: die Spalte der Sprache in `app_texts` (z. B. `en`), sonst die Übersetzung aus
 *   `src/i18n/<sprache>.json`, sonst das deutsche Original.
 *
 * Platzhalter in geschweiften Klammern, z. B. „Ahoi, {anrede}!“, setzt die App ein. Übersetzungen können
 * Mehrzahlformen enthalten: „{n, plural, one {# день} few {# дні} many {# днів} other {# дня}}“.
 *
 * Geschlecht (Daria, 24.10.2026): Die Grundfassung jeder Sprache ist „unbestimmt“. Ergänzungen in
 * `src/i18n/<sprache>.<er|sie|person>.json` (auch `de`) enthalten nur Texte, die je nach Geschlecht abweichen.
 * `t()` nimmt das Geschlecht der Person, die die App benutzt (Texte an Dich). `tAbout(person, …)` nimmt das
 * Geschlecht der Person, über die der Text spricht (Pronomen, „Initiator“/„Initiatorin“).
 *
 * Neue Texte in die Tabelle bringen: `node scripts/app-texts.mjs` erzeugt SQL für den SQL-Editor.
 * Übersetzungen ergänzen: `node scripts/i18n.mjs` listet fehlende Texte je Sprache.
 */

export const languages = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'uk', name: 'Українська' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'he', name: 'עברית' },
] as const;
export type Lang = (typeof languages)[number]['code'];
export const otherLanguages = ['en', 'fr', 'uk', 'ru', 'ar', 'he'] as const;
type OtherLang = (typeof otherLanguages)[number];
const RTL = new Set<Lang>(['ar', 'he']);
export const isRtl = (l: Lang = lang) => RTL.has(l);

const bundled: Record<OtherLang, Record<string, string>> = { en, fr, uk, ru, ar, he };

const CACHE_KEY = 'app_texts_v2';
const LANG_KEY = 'app_language';
const GENDER_KEY = 'app_gender';

/** Grammatisches Geschlecht der Person, die die App benutzt */
let gender: Gender = 'person';

let lang: Lang = 'de';
/** 'auto': Sprache des Handys */
let choice: Lang | 'auto' = 'auto';
let overrides = new Map<string, string>();
let cms: Partial<Record<OtherLang, Map<string, string>>> = {};
let version = 0;
const listeners = new Set<() => void>();
const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

/** Leerraum wie in JSX zusammenfassen, damit Zeilenumbrüche im Code den Schlüssel nicht ändern. */
export const normalizeText = (s: string) => s.replace(/\s+/g, ' ').trim();

const supported = (code?: string | null): Lang | undefined => languages.find((l) => l.code === code)?.code;

/** Sprache des Handys, wenn die App sie kann, sonst Deutsch */
export function deviceLanguage(): Lang {
  try {
    for (const locale of getLocales()) {
      const code = supported(locale.languageCode);
      if (code) return code;
    }
  } catch {
    // ohne Angabe: Deutsch
  }
  return 'de';
}

function applyDirection() {
  const rtl = isRtl();
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    return;
  }
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
}

/** true, wenn die Schreibrichtung erst nach einem Neustart der App stimmt (iOS, Android) */
export const needsRestartForDirection = () => Platform.OS !== 'web' && I18nManager.isRTL !== isRtl();

export const getLanguage = () => lang;
export const getGender = () => gender;

/** Geschlecht für Texte an Dich. Kommt aus dem Profil und liegt zusätzlich auf dem Gerät. */
export async function setGender(next: Gender) {
  if (next === gender) return;
  gender = next;
  notify();
  try {
    await AsyncStorage.setItem(GENDER_KEY, next);
  } catch {
    // gilt dann bis zum Neustart
  }
}

async function loadGender() {
  try {
    const saved = await AsyncStorage.getItem(GENDER_KEY);
    if (saved === 'er' || saved === 'sie' || saved === 'person') gender = saved;
  } catch {
    // unbestimmt
  }
}
export const getLanguageChoice = () => choice;

/** Sprache wählen. 'auto' folgt dem Handy. */
export async function setLanguage(next: Lang | 'auto') {
  choice = next;
  lang = next === 'auto' ? deviceLanguage() : next;
  applyDirection();
  notify();
  try {
    await AsyncStorage.setItem(LANG_KEY, next);
  } catch {
    // Auswahl gilt dann nur bis zum Neustart
  }
}

/** Beim Start: gespeicherte Wahl, sonst Handysprache */
export async function loadLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    choice = saved === 'auto' || !saved ? 'auto' : (supported(saved) ?? 'auto');
  } catch {
    choice = 'auto';
  }
  await loadGender();
  lang = choice === 'auto' ? deviceLanguage() : choice;
  applyDirection();
  notify();
}

type Row = { original: string; text: string } & Partial<Record<OtherLang, string | null>>;

function apply(rows: Row[]) {
  const next = new Map<string, string>();
  const nextCms: Partial<Record<OtherLang, Map<string, string>>> = {};
  for (const row of rows) {
    const key = normalizeText(row.original);
    const value = row.text?.trim();
    if (value && normalizeText(value) !== key) next.set(key, value);
    for (const l of otherLanguages) {
      const v = row[l]?.trim();
      if (v) (nextCms[l] ??= new Map()).set(key, v);
    }
  }
  overrides = next;
  cms = nextCms;
  notify();
}

/** Beim Start und wenn die App nach vorn kommt: erst der gespeicherte Stand, dann frisch aus Supabase. */
export async function loadTexts() {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) apply(JSON.parse(cached));
  } catch {
    // ohne Speicher geht es mit den Originalen weiter
  }
  try {
    // Alle Spalten: Fehlt eine Sprachspalte noch (Migration nicht gelaufen), gelten die übrigen trotzdem.
    const res = await supabase.from('app_texts').select('*');
    if (res.error || !res.data) return;
    const rows = (res.data as unknown as Row[])
      .filter((r) => (r.text && normalizeText(r.text) !== normalizeText(r.original)) || otherLanguages.some((l) => r[l]?.trim()))
      .map((r) => ({ original: r.original, text: r.text, ...Object.fromEntries(otherLanguages.map((l) => [l, r[l] ?? null])) }) as Row);
    apply(rows);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Tabelle fehlt oder kein Netz: Originale
  }
}

/** Mehrzahlregeln für ganze Zahlen (CLDR, vereinfacht) */
function pluralCategory(l: Lang, n: number): string {
  const abs = Math.abs(Math.trunc(n));
  const m10 = abs % 10;
  const m100 = abs % 100;
  switch (l) {
    case 'fr':
      return abs === 0 || abs === 1 ? 'one' : 'other';
    case 'uk':
    case 'ru':
      if (m10 === 1 && m100 !== 11) return 'one';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'few';
      return 'many';
    case 'ar':
      if (abs === 0) return 'zero';
      if (abs === 1) return 'one';
      if (abs === 2) return 'two';
      if (m100 >= 3 && m100 <= 10) return 'few';
      if (m100 >= 11) return 'many';
      return 'other';
    case 'he':
      if (abs === 1) return 'one';
      if (abs === 2) return 'two';
      return 'other';
    default:
      return abs === 1 ? 'one' : 'other';
  }
}

/** „{n, plural, one {# Tag} other {# Tage}}“ auflösen, dann Platzhalter einsetzen */
export function format(template: string, vars?: Record<string, string | number | null | undefined>, l: Lang = lang): string {
  let out = template;
  if (vars && out.includes(', plural,')) {
    out = out.replace(/\{(\w+), plural,((?:\s*[=\w]+\s*\{[^{}]*\})+)\s*\}/g, (all, name: string, cases: string) => {
      const value = Number(vars[name]);
      if (Number.isNaN(value)) return all;
      const options = new Map<string, string>();
      cases.replace(/([=\w]+)\s*\{([^{}]*)\}/g, (_: string, k: string, v: string) => {
        options.set(k, v);
        return '';
      });
      const chosen = options.get(`=${value}`) ?? options.get(pluralCategory(l, value)) ?? options.get('other') ?? '';
      return chosen.replace(/#/g, String(value));
    });
  }
  if (vars) {
    for (const [name, value] of Object.entries(vars)) out = out.split(`{${name}}`).join(String(value ?? ""));
  }
  return out;
}

/** Fassung in der gewählten Sprache, ohne Platzhalter einzusetzen. `g`: Geschlecht, nach dem sich der Text richtet. */
export function lookup(original: string, l: Lang = lang, g: Gender = gender): string {
  const key = normalizeText(original);
  const byGender = genderOverlays[l]?.[g]?.[key];
  if (l === 'de') return overrides.get(key) ?? byGender ?? original;
  return cms[l]?.get(key) ?? byGender ?? bundled[l][key] ?? overrides.get(key) ?? original;
}

/**
 * Text in der gewählten Sprache. `vars` füllt Platzhalter wie {anrede}.
 * Ohne Übersetzung bleibt der deutsche Text.
 */
export function t(original: string, vars?: Record<string, string | number | null | undefined>): string {
  return format(lookup(original), vars);
}

/**
 * Text über eine andere Person: richtet sich nach deren Geschlecht („er“, „sie“, unbestimmt).
 * Gruppenkonten haben eigene Sätze im Plural und kommen hier nicht hin.
 */
export function tAbout(
  person: { gender?: Gender } | null | undefined,
  original: string,
  vars?: Record<string, string | number | null | undefined>,
): string {
  return format(lookup(original, lang, person?.gender ?? 'person'), vars);
}

/** Wie `t`, behält aber Leerraum am Anfang und Ende (Textstücke zwischen anderen Elementen). */
export function tPadded(original: string): string {
  const key = normalizeText(original);
  if (!key) return original;
  const translated = t(key);
  if (translated === key) return original;
  const lead = /^\s/.test(original) ? ' ' : '';
  const trail = /\s$/.test(original) ? ' ' : '';
  return lead + translated + trail;
}

/** Für Komponenten: rendert neu, sobald Texte oder Sprache wechseln. */
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

/** Sprache für Datum und Zahlen, z. B. 'de-DE' */
export const localeTag = () => ({ de: 'de-DE', en: 'en-GB', fr: 'fr-FR', uk: 'uk-UA', ru: 'ru-RU', ar: 'ar', he: 'he-IL' })[lang];

/** Für den Editor: mitgelieferte Übersetzung eines Texts */
export const bundledTranslation = (original: string, l: OtherLang) => bundled[l][normalizeText(original)];
