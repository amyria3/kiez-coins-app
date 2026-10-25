import type { Href } from 'expo-router';

import type { CatMood } from '../components/icons/Brand';
import type { Challenge } from './types';
import { t } from './texts';

// „Was Du so machst“ (früher „Was Du so machst“, „Deine Reise“ und „Deine Spur im Kiez“): alle Challenges, die Du erstellt oder angenommen hast,
// als Karten. Regeln aus kiez-coins/konto/MVP_Konto.md.

export type ReiseEntry = {
  challenge: Challenge;
  role: 'author' | 'assignee';
  /** Punkt auf der Karte: Du bist dran */
  needsAction: boolean;
  /** Etikett: eigener Operationsname, sonst der Titel */
  label: string;
  href: Href;
  /** Letzte Bewegung, zum Sortieren */
  lastActivity: string;
};

function lastActivity(c: Challenge): string {
  return [c.createdAt, c.acceptedAt, c.report ? c.acceptedAt : undefined, c.confirmedAt, c.paidMarkedAt, c.closedAt]
    .filter((d): d is string => !!d)
    .sort()
    .at(-1)!;
}

/** Wohin ein Tipp auf die Karte führt: zum aktuellen Schritt, sonst ins Detail. */
function target(c: Challenge, role: ReiseEntry['role']): { href: Href; needsAction: boolean } {
  if (role === 'author' && c.status === 'reported') return { href: `/challenge/${c.id}/review`, needsAction: true };
  if (role === 'author' && c.status === 'payment_open') return { href: `/challenge/${c.id}/pay`, needsAction: true };
  if (role === 'assignee' && c.status === 'paid_marked') return { href: `/challenge/${c.id}/payment`, needsAction: true };
  // Angenommen, aber noch nicht erledigt gemeldet: Du bist dran.
  return { href: `/challenge/${c.id}`, needsAction: role === 'assignee' && c.status === 'accepted' };
}

/** Karten mit offener Aufgabe zuerst, dann nach letzter Bewegung (neueste oben). */
export function reiseEntries(challenges: Challenge[], userId: string): ReiseEntry[] {
  const entries: ReiseEntry[] = [];
  for (const c of challenges) {
    if (c.status === 'draft' || c.status === 'deleted') continue; // stehen in „Deine Challenges“
    const role = c.authorId === userId ? 'author' : c.assigneeId === userId ? 'assignee' : null;
    if (!role) continue;
    const { href, needsAction } = target(c, role);
    const label = role === 'assignee' && c.operationName ? c.operationName : c.title;
    entries.push({ challenge: c, role, needsAction, label, href, lastActivity: lastActivity(c) });
  }
  return entries.sort(
    (a, b) => Number(b.needsAction) - Number(a.needsAction) || b.lastActivity.localeCompare(a.lastActivity),
  );
}

/** Stimmung der Status-Katze, Werte wie in MVP_Konto.md vorgeschlagen. */
export type ReiseMood = 'Greedy' | 'Worried' | 'Proud' | 'InLove' | 'Curious' | 'Welcome' | 'Lazy';

const DAY = 24 * 60 * 60 * 1000;
const RECENT = 7 * DAY;
const LAZY_AFTER = 14 * DAY;

/**
 * Treffen mehrere Stimmungen zu, gilt Greedy > Worried > Proud > InLove > Curious > Welcome > Lazy.
 * - Greedy: jemand hat Deine Challenge erledigt gemeldet (oder Du musst noch bezahlen)
 * - Worried: Deine Erledigung wurde abgelehnt
 * - Proud: eine Deiner Challenges wurde in den letzten 7 Tagen erledigt
 * - InLove: Du hast in den letzten 7 Tagen eine Challenge erledigt
 * - Curious: Du hast eine Challenge angenommen und bist dran, oder es tut sich gerade etwas
 * - Welcome: noch keine Reise
 * - Lazy: seit 14 Tagen nichts passiert
 */
export function reiseMood(entries: ReiseEntry[], now = Date.now()): ReiseMood {
  if (entries.length === 0) return 'Welcome';
  const recent = (iso?: string) => !!iso && now - Date.parse(iso) < RECENT;
  const done = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);
  const has = (test: (e: ReiseEntry) => boolean) => entries.some(test);

  if (has((e) => e.role === 'author' && (e.challenge.status === 'reported' || e.challenge.status === 'payment_open')))
    return 'Greedy';
  if (has((e) => e.role === 'assignee' && e.challenge.status === 'accepted' && !!e.challenge.rejectionReason))
    return 'Worried';
  if (has((e) => e.role === 'author' && done.has(e.challenge.status) && recent(e.challenge.confirmedAt))) return 'Proud';
  if (has((e) => e.role === 'assignee' && done.has(e.challenge.status) && recent(e.challenge.confirmedAt)))
    return 'InLove';
  if (has((e) => e.role === 'assignee' && e.challenge.status === 'accepted')) return 'Curious';
  const latest = entries.reduce((max, e) => (e.lastActivity > max ? e.lastActivity : max), '');
  if (now - Date.parse(latest) > LAZY_AFTER) return 'Lazy';
  return 'Curious';
}

/** Was der Kater zur Stimmung sagt. `anrede` z. B. „Pirat:in“. */
export function reiseMoodText(mood: ReiseMood, anrede: string): string {
  switch (mood) {
    case 'Greedy':
      return t('Goldalarm, {anrede}! Bei einer Deiner Challenges bist Du dran.', { anrede });
    case 'Worried':
      return t('Oha. Eine Erledigung kam zurück. Schaue mal, was noch fehlt.');
    case 'Proud':
      return t('Eine Deiner Challenges ist geschafft. Ich bin stolz auf diesen Kiez!');
    case 'InLove':
      return t('Du hast angepackt, {anrede}. Ich schnurre.', { anrede });
    case 'Curious':
      return t('Ich bin gespannt, was als Nächstes kommt.');
    case 'Welcome':
      return t('Willkommen, {anrede}! Hier siehst Du, was Du so machst. Erstelle eine Challenge oder nimm eine an.', { anrede });
    case 'Lazy':
      return t('Ganz schön ruhig hier. Ich leg mich so lange in die Sonne.');
  }
}

/** Kater-Stimmungen von Daria: gierig mit Dollar in der Brille, stolz und verliebt aufgeregt, sonst normal. */
export function catVariant(mood: ReiseMood): CatMood {
  if (mood === 'Greedy') return 'money';
  return mood === 'Proud' || mood === 'InLove' ? 'high' : 'default';
}
