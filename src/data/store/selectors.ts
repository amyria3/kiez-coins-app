
import { meInProgress } from '../format';
import * as remote from '../remote';
import { topChallengeIds } from '../sample';
import { isPostOnly, type Challenge } from '../types';
import { joinedIds } from '../weChallenge';
import { State } from './reducer';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

/**
 * Leiste oben im Feed. Demo: feste Auswahl aus den Beispieldaten.
 * Live: zuerst Challenges, bei denen Du etwas tun musst, dann offene mit der kürzesten Restzeit.
 */
export function topChallenges(state: Pick<State, 'mode' | 'challenges' | 'currentUserId'>, max = 3): Challenge[] {
  const { challenges, currentUserId: me } = state;
  if (state.mode === 'demo') {
    return topChallengeIds.map((id) => challenges.find((c) => c.id === id)).filter((c): c is Challenge => !!c);
  }
  const mine = challenges.filter(
    (c) =>
      (c.authorId === me && (c.status === 'reported' || c.status === 'payment_open')) ||
      (c.assigneeId === me && (c.status === 'accepted' || c.status === 'paid_marked')) ||
      (c.status === 'accepted' && joinedIds(c).includes(me)),
  );
  const now = Date.now();
  const open = challenges
    .filter((c) => !c.groupId && !isPostOnly(c.type) && c.status === 'open' && Date.parse(c.deadline) > now && !mine.includes(c))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  return [...mine, ...open].filter((c) => !COMPLETED.has(c.status)).slice(0, max);
}

/**
 * Eigene Vorher-Nachher-Entwürfe mit laufendem Timer, der jüngste zuerst. Der Feed zeigt sie oben als Ring.
 * Ein Entwurf älter als 48 h zählt nicht mehr: Den postet der Server beim nächsten Lauf.
 */
export function runningBeforeAfter(challenges: Challenge[], me: string, now = Date.now()): Challenge[] {
  return challenges
    .filter(
      (c) =>
        meInProgress(c) &&
        c.authorId === me &&
        !!c.timerStartedAt &&
        now - Date.parse(c.timerStartedAt) < remote.BEFORE_AFTER_MAX_MS,
    )
    .sort((a, b) => b.timerStartedAt!.localeCompare(a.timerStartedAt!));
}
