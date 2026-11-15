// Konstanten, Reiter und Hilfen des Feeds (aus src/app/feed.tsx, 2026-11-15).
import type { GestureResponderEvent } from 'react-native';
import type { ShowcaseHit } from '../../data/showcase';
import type { Challenge } from '../../data/types';
import type { FeedTab } from '../FeedHeader';

export const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

// Abgeschaltete Typen bleiben sichtbar, wenn es sie in der Datenbank gibt.
/** Reiter aus dem Parameter `reiter` */
export const TAB_OF_PARAM: Record<string, FeedTab> = { privat: 'private', kiez: 'nearby', ueberall: 'everywhere', gruppen: 'groups' };

export function matchesTab(challenge: Challenge, tab: FeedTab, groupId: string | undefined, me: string) {
  // Entwürfe und gelöschte stehen nur in „Deine Challenges“. Geschlossene bleiben in der Timeline.
  if (challenge.status === 'draft' || challenge.status === 'deleted') return false;
  // Privat: nur eigene private Beiträge, und die nur hier (Daria, 27.10.2026)
  if (tab === 'private') return !!challenge.private && challenge.authorId === me;
  if (challenge.private) return false;
  // Gruppenaufgaben nur im Reiter „Gruppen“, dort nur die der gewählten Gruppe
  if (tab === 'groups') return !!groupId && challenge.groupId === groupId;
  if (challenge.groupId) return false;
  if (tab === 'wave') return challenge.type === 'wave';
  if (tab === 'completed') return COMPLETED.has(challenge.status);
  // Überall: alles Öffentliche außer „nur im Umkreis“, eigene Beiträge immer (Daria, 29.10.2026)
  if (tab === 'everywhere') return !challenge.localOnly || challenge.authorId === me;
  return true;
}


/** Fingerposition; im Browser steht sie nur in `touches`, nicht direkt im Ereignis */
export function touchPoint(e: GestureResponderEvent) {
  const t = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
  return { x: t.pageX, y: t.pageY };
}

/** Stories-Leiste oben im Feed (Top-Challenges, später Videos) */
export const STORIES = false;
/** Nach so vielen Millisekunden ohne Interaktion gleiten Logo und Begrüßung weg */
export const HEADER_HIDE_MS = 3500;
/** Suchfeld ein- und ausblenden */
export const SEARCH_FADE_MS = 380;
/** Zug nach unten ganz oben: ab hier kommt das Suchfeld, ab `PULL_HEADER` der Kopf (Daria, 2026-11-13) */
export const PULL_SEARCH = 24;
/** Auf- und Zuklappen des Kalenders, etwas ruhiger als das Suchfeld (Daria, 2026-11-14) */
export const CALENDAR_MS = 520;
export const PULL_HEADER = 96;
/** Höhe des schmalen Kopfs beim Erstellen */
export const COMPOSE_HEADER = 52;

/** Reihenfolge der Reiter, auch für das Wischen: Privat, Gruppe, Kiez, Überall (Daria, 27./29.10.2026) */
export const TAB_ORDER: FeedTab[] = ['private', 'groups', 'nearby', 'everywhere'];
/** Umschalter in „Me & Myself“: links „My Structure“ (Routine), rechts „My Feed“ (Privat), Daria, 2026-11-12 */
export const ME_TABS: { key: 'structure' | 'private'; label: string }[] = [
  { key: 'structure', label: 'Meine Struktur' },
  { key: 'private', label: 'Mein Feed' },
];
/** Mindestweg in Punkten, ab dem ein Wischen den Reiter wechselt */
export const SWIPE_DISTANCE = 64;

/** Leere Zustände: stehen als Fuß der Liste, mittig im freien Platz */
export const EMPTY_KINDS = new Set<FeedItem['kind']>(['groupsEmpty', 'groupNoTasks', 'privateEmpty', 'state']);

export type FeedItem =
  | { kind: 'planned' }
  | { kind: 'audience' }
  | { kind: 'groupsEmpty' }
  | { kind: 'groupBar' }
  | { kind: 'groupNoTasks' }
  | { kind: 'privateEmpty' }
  | { kind: 'loading' }
  | { kind: 'state' }
  | { kind: 'running'; challenge: Challenge }
  | { kind: 'post'; challenge: Challenge }
  | { kind: 'showcase'; hit: ShowcaseHit }
  | { kind: 'searchEmpty' }
  | { kind: 'searchError' };
