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
 * Start: alle Modi sichtbar, Standard Kiez. Kein Modus ist nach dem Download verborgen (Daria, 08.11.2026);
 * vorher war Gruppe bis zur ersten Gruppe verborgen. Gespeichert auf dem Gerät, pro Konto.
 */
export type Mode = 'private' | 'groups' | 'kiez' | 'everywhere';

export const MODES: { key: Mode; label: string; description: string }[] = [
  { key: 'private', label: 'Privat', description: 'Was Du hier postest, siehst nur Du.' },
  { key: 'groups', label: 'Deine Gruppen', description: 'We-Challenges im kleinen Kreis, mit Edensteinen' },
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
  /** Alter Schalter „Gruppen“ (bis 27.10.2026), wird nicht mehr ausgewertet */
  groups?: boolean;
  /** Verborgene Modi aus einem alten Zielgruppen-Link sind zurückgeholt (08.11.2026) */
  linkOffen?: boolean;
};

const START_STANDARD: Mode = 'kiez';
const KEY = (userId: string) => `kiez-features:${userId}`;
/** Modus aus einem Link, gemerkt bis nach der Anmeldung */
const LINK_KEY = 'kiez-modus-link';
/**
 * Ein Link setzt nur den Standard und verbirgt nichts (Daria, 08.11.2026). Vom 27.10. bis 08.11.2026 verbarg er
 * alle anderen Modi; diese Geräte bekommen die Modi beim nächsten Laden zurück (`ausLinkVerborgen`).
 */
const LINK_HIDES_OTHERS = false;

let loadedFor: string | undefined;
let saved: Saved = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function store(userId: string, next: Saved) {
  saved = next;
  emit();
  AsyncStorage.setItem(KEY(userId), JSON.stringify(saved)).catch(() => {});
}

/** Läuft gerade ein Laden, wartet `turnOnGroups` darauf */
let loading: Promise<void> = Promise.resolve();

function load(userId: string): Promise<void> {
  if (loadedFor === userId) return loading;
  loading = readSaved(userId);
  return loading;
}

async function readSaved(userId: string) {
  loadedFor = userId;
  saved = {};
  emit();
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (loadedFor !== userId) return;
    saved = raw ? JSON.parse(raw) : {};
    if (ausLinkVerborgen(saved)) {
      saved = { ...saved, hidden: {}, linkOffen: true };
      AsyncStorage.setItem(KEY(userId), JSON.stringify(saved)).catch(() => {});
    }
    emit();
    const linked = modeFromSlug((await AsyncStorage.getItem(LINK_KEY)) ?? undefined);
    if (linked && loadedFor === userId) {
      await AsyncStorage.removeItem(LINK_KEY);
      applyLinkMode(userId, linked);
    }
  } catch {}
}

/** Stand aus einem alten Zielgruppen-Link: genau ein Modus sichtbar, und das ist der Standard */
function ausLinkVerborgen(s: Saved): boolean {
  if (s.linkOffen || !s.hidden || !s.standard) return false;
  const shown = MODES.map((m) => m.key).filter((m) => !s.hidden?.[m]);
  return shown.length === 1 && shown[0] === s.standard;
}

const hiddenOf = (s: Saved): Record<Mode, boolean> => ({
  private: s.hidden?.private ?? false,
  groups: s.hidden?.groups ?? false,
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

/**
 * Gruppe gegründet oder beigetreten: Gruppe wird sichtbar, damit der Reiter im Feed erscheint.
 * Kommt jemand über einen Einladungslink direkt aus dem Onboarding, ist der Stand noch nicht geladen.
 * Dann lädt die App ihn erst, sonst ginge das Einschalten verloren (Daria, 07.11.2026).
 */
export async function turnOnGroups(userId: string | undefined) {
  if (!userId) return;
  if (loadedFor !== userId) await load(userId);
  else await loading;
  if (loadedFor !== userId || !hiddenOf(saved).groups) return;
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
