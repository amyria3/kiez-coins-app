import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useStore } from './store';
import type { ChallengeType } from './types';

/**
 * Challenge-Typen an- und abschalten. Ein abgeschalteter Typ lässt sich nicht erstellen; sein Reiter ist
 * gedimmt und zeigt den Hinweis aus `plannedTitle`/`plannedHint`. Vorhandene Challenges dieses Typs aus der
 * Datenbank bleiben sichtbar.
 */
export const challengeTypes: Record<
  ChallengeType,
  { active: boolean; label: string; plannedTitle: string; plannedHint: string }
> = {
  individual: {
    active: true,
    label: 'We-Challenge',
    plannedTitle: '',
    plannedHint: '',
  },
  photo: {
    active: true,
    label: 'Bild',
    plannedTitle: '',
    plannedHint: '',
  },
  before_after: {
    active: true,
    label: 'Me-Challenge',
    plannedTitle: '',
    plannedHint: '',
  },
  wave: {
    active: false,
    label: 'Wave',
    plannedTitle: 'Wave Challenges kommen später',
    plannedHint: 'Gruppen und Vereine rufen damit bald den ganzen Kiez zu gemeinsamen Aktionen auf.',
  },
};

export const isTypeActive = (type: ChallengeType) => challengeTypes[type].active;

/**
 * Modi (Daria, 27.10.2026): Privat, Gruppe, Kiez, in dieser Reihenfolge im Umschalter oben (Feed, Erstellen,
 * „Was Du so machst“). We-Challenge, Me-Challenge und Bild lassen sich nicht mehr abschalten. Stattdessen
 * verbirgt jede Person einzelne Modi (Auge in „Dein Konto › Funktionen“) und legt einen als Standard fest,
 * der im Umschalter vorausgewählt ist. Ein Modus bleibt immer sichtbar.
 * Start: Privat und Kiez sichtbar, Gruppe verborgen bis zur ersten Gruppe (wie bisher), Standard Kiez.
 * Gespeichert auf dem Gerät, pro Konto.
 */
export type Mode = 'private' | 'groups' | 'kiez' | 'everywhere';

export const MODES: { key: Mode; label: string; description: string }[] = [
  { key: 'private', label: 'Privat', description: 'Was Du hier postest, siehst nur Du.' },
  { key: 'groups', label: 'Deine Gruppen', description: 'Aufgaben im kleinen Kreis, mit Edensteinen' },
  { key: 'kiez', label: 'Dein Kiez', description: 'Was Du hier postest, sehen alle in Deinem Kiez.' },
  // Überall (Daria, 29.10.2026): alle öffentlichen Beiträge, rechts im Umschalter. Kiez zeigt nur bis 5 km.
  { key: 'everywhere', label: 'Überall', description: 'Alle öffentlichen Beiträge, auch außerhalb Deines Kiezes.' },
];

/** Name des Modus in Links (`?modus=privat`) */
export const MODE_SLUG: Record<Mode, string> = { private: 'privat', groups: 'gruppe', kiez: 'kiez', everywhere: 'ueberall' };
export const modeFromSlug = (slug?: string | string[]): Mode | undefined => {
  const value = (Array.isArray(slug) ? slug[0] : slug)?.toLowerCase();
  return (Object.keys(MODE_SLUG) as Mode[]).find((m) => MODE_SLUG[m] === value);
};

export type ModeState = {
  /** Sichtbare Modi in der Reihenfolge Privat, Gruppe, Kiez, Überall; nie leer */
  visible: Mode[];
  isVisible: (mode: Mode) => boolean;
  /** Standard, immer einer der sichtbaren */
  standard: Mode;
};

type Saved = {
  hidden?: Partial<Record<Mode, boolean>>;
  standard?: Mode;
  /** Alter Schalter „Gruppen“ (bis 27.10.2026) */
  groups?: boolean;
};

const START_STANDARD: Mode = 'kiez';
const KEY = (userId: string) => `kiez-features:${userId}`;
/** Modus aus einem Link, gemerkt bis nach der Anmeldung */
const LINK_KEY = 'kiez-modus-link';
/** Ein Link verbirgt die anderen Modi (Daria, 27.10.2026); über das Auge kommen sie zurück */
const LINK_HIDES_OTHERS = true;

let loadedFor: string | undefined;
let saved: Saved = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function store(userId: string, next: Saved) {
  saved = next;
  emit();
  AsyncStorage.setItem(KEY(userId), JSON.stringify(saved)).catch(() => {});
}

async function load(userId: string) {
  if (loadedFor === userId) return;
  loadedFor = userId;
  saved = {};
  emit();
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (loadedFor !== userId) return;
    saved = raw ? JSON.parse(raw) : {};
    emit();
    const linked = modeFromSlug((await AsyncStorage.getItem(LINK_KEY)) ?? undefined);
    if (linked && loadedFor === userId) {
      await AsyncStorage.removeItem(LINK_KEY);
      applyLinkMode(userId, linked);
    }
  } catch {}
}

const hiddenOf = (s: Saved): Record<Mode, boolean> => ({
  private: s.hidden?.private ?? false,
  groups: s.hidden?.groups ?? !(s.groups ?? false),
  kiez: s.hidden?.kiez ?? false,
  everywhere: s.hidden?.everywhere ?? false,
});

function stateOf(s: Saved): ModeState {
  const hidden = hiddenOf(s);
  const shown = MODES.map((m) => m.key).filter((m) => !hidden[m]);
  const visible: Mode[] = shown.length ? shown : [START_STANDARD];
  const wanted = s.standard ?? START_STANDARD;
  return {
    visible,
    isVisible: (mode) => visible.includes(mode),
    standard: visible.includes(wanted) ? wanted : visible[0],
  };
}

/** Modus verbergen oder zeigen. Der letzte sichtbare bleibt sichtbar. */
export function setModeHidden(userId: string, mode: Mode, hide: boolean) {
  const hidden = { ...hiddenOf(saved), [mode]: hide };
  if (MODES.every((m) => hidden[m.key])) return;
  store(userId, { ...saved, hidden });
}

/** Standardmodus festlegen; ein verborgener Modus wird dabei wieder sichtbar */
export function setStandardMode(userId: string, mode: Mode) {
  store(userId, { ...saved, standard: mode, hidden: { ...hiddenOf(saved), [mode]: false } });
}

/** Aktueller Stand der Modi */
export function useModes(): ModeState {
  const { currentUserId } = useStore();
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  useEffect(() => {
    if (currentUserId) load(currentUserId);
  }, [currentUserId]);
  return stateOf(saved);
}

/** Gruppe gegründet oder beigetreten: Gruppe wird sichtbar, damit der Reiter im Feed erscheint */
export function turnOnGroups(userId: string | undefined) {
  if (!userId || loadedFor !== userId || !hiddenOf(saved).groups) return;
  store(userId, { ...saved, hidden: { ...hiddenOf(saved), groups: false } });
}

/**
 * Link für eine Zielgruppe, z. B. `…/app/?modus=privat` (Daria, 27.10.2026): Der Modus wird Standard und ist
 * im Umschalter vorausgewählt. Vor der Anmeldung bleibt er auf dem Gerät gemerkt und gilt danach.
 */
export function rememberLinkMode(slug?: string | string[]) {
  const mode = modeFromSlug(slug);
  if (!mode) return;
  if (loadedFor) applyLinkMode(loadedFor, mode);
  else AsyncStorage.setItem(LINK_KEY, MODE_SLUG[mode]).catch(() => {});
}

function applyLinkMode(userId: string, mode: Mode) {
  const hidden = LINK_HIDES_OTHERS
    ? { private: mode !== 'private', groups: mode !== 'groups', kiez: mode !== 'kiez', everywhere: mode !== 'everywhere' }
    : { ...hiddenOf(saved), [mode]: false };
  store(userId, { ...saved, standard: mode, hidden });
}

/** Link, der die App in diesem Modus öffnet */
export const modeLink = (mode: Mode, base: string) => `${base}/?modus=${MODE_SLUG[mode]}`;
