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
 * Funktionen, die jede Person für sich an- und abschaltet (Daria, 24.10.2026), damit der Einstieg leicht bleibt.
 * Start: Me-Challenge und Bild. We-Challenge und Gruppen schaltet die Person in „Dein Konto › Funktionen“ zu.
 * Abschalten blendet nur das Erstellen aus. Beiträge anderer bleiben im Feed sichtbar.
 * Gespeichert auf dem Gerät, pro Konto. Eine Sperre bis zur ersten erledigten Challenge kommt später (Übergabe).
 */
export type Feature = 'me' | 'photo' | 'we' | 'groups';

export const features: { key: Feature; label: string; description: string }[] = [
  { key: 'me', label: 'Me-Challenge', description: 'Vorher-Nachher: Du packst selbst etwas an' },
  { key: 'photo', label: 'Bild', description: 'Ein schönes Bild aus dem Kiez, ohne Aufgabe' },
  { key: 'we', label: 'We-Challenge', description: 'Aufgabe für den Kiez, mit Coins als Belohnung' },
  { key: 'groups', label: 'Gruppen', description: 'Aufgaben im kleinen Kreis, mit Edensteinen' },
];

/** Beitragstypen im Kiez. Einer davon bleibt immer an, damit das Erstellen nie leer ist. */
export const POST_FEATURES: Feature[] = ['me', 'photo', 'we'];

export type FeatureState = Record<Feature, boolean>;

const START: FeatureState = { me: true, photo: true, we: false, groups: false };
const KEY = (userId: string) => `kiez-features:${userId}`;

let loadedFor: string | undefined;
let saved: Partial<FeatureState> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

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
  } catch {}
}

/** Schaltet eine Funktion an oder ab. `false`, wenn sie der letzte Beitragstyp ist und an bleiben muss. */
export function setFeature(userId: string, state: FeatureState, key: Feature, on: boolean) {
  if (!on && POST_FEATURES.includes(key) && POST_FEATURES.every((k) => k === key || !state[k])) return false;
  saved = { ...saved, [key]: on };
  emit();
  AsyncStorage.setItem(KEY(userId), JSON.stringify(saved)).catch(() => {});
  return true;
}

/**
 * Aktueller Stand der Funktionen. Ohne gespeicherte Wahl gilt der Start; Gruppen sind an, sobald die Person in
 * einer Gruppe ist (Testerinnen vom Oktober 2026 behalten ihren Reiter).
 */
export function useFeatures(): FeatureState {
  const { currentUserId, groups } = useStore();
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
  return {
    me: saved.me ?? START.me,
    photo: saved.photo ?? START.photo,
    we: saved.we ?? START.we,
    groups: saved.groups ?? (groups.length > 0 || START.groups),
  };
}

/** Gruppe gegründet oder beigetreten: Gruppen gehen an, damit der Reiter im Feed erscheint */
export function turnOnGroups(userId: string | undefined) {
  if (!userId || loadedFor !== userId || saved.groups) return;
  saved = { ...saved, groups: true };
  emit();
  AsyncStorage.setItem(KEY(userId), JSON.stringify(saved)).catch(() => {});
}
