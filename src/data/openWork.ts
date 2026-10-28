import type { Challenge } from './types';
import { isParticipant } from './weChallenge';

/** Hat die Person noch offene Challenges oder Bounties? Dann kein Pausieren und kein Löschen. */
export function hasOpenWork(challenges: Challenge[], userId: string): boolean {
  return challenges.some(
    (c) =>
      (c.assigneeId === userId && ['accepted', 'reported', 'payment_open', 'paid_marked'].includes(c.status)) ||
      (c.authorId === userId && ['reported', 'payment_open'].includes(c.status)) ||
      // Mehrere Personen: alle Teilnehmenden, bis die Challenge bestätigt ist
      (['accepted', 'reported'].includes(c.status) && isParticipant(c, userId)),
  );
}
