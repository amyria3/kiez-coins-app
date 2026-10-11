import type { Challenge } from './types';

/** Hat die Person noch offene Challenges oder Bounties? Dann kein Pausieren und kein Löschen. */
export function hasOpenWork(challenges: Challenge[], userId: string): boolean {
  return challenges.some(
    (c) =>
      (c.assigneeId === userId && ['accepted', 'reported', 'payment_open', 'paid_marked'].includes(c.status)) ||
      (c.authorId === userId && ['reported', 'payment_open'].includes(c.status)),
  );
}
