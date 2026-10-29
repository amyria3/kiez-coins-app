import type { Challenge, Comment, ImageSource } from './types';
import { beforeAfterDuration } from './format';
import type { ReiseEntry } from './reise';

// „Was Du so machst“ als Feed für positive Bestärkung (Daria, 29.10.2026): kein Verlauf mehr, nur was geschafft ist.
// Offenes und Wartendes steht unter „Du bist dran“ und in „Deine Challenges“.

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

/** Geschafft: erledigte We-Challenge oder fertig gepostete Me-Challenge */
export function isDone(c: Challenge): boolean {
  if (c.type === 'before_after') return !!c.finishedAt && c.status !== 'draft' && c.status !== 'deleted';
  return c.type === 'individual' && COMPLETED.has(c.status);
}

/** Foto für die Geschafft-Wand: bei Me-Challenges das Nachher, bei We-Challenges das Erledigungsfoto */
export function donePhoto(c: Challenge): ImageSource | undefined {
  if (c.type === 'before_after') return c.imageAfter ?? c.imageBefore ?? c.image;
  return c.report?.photo ?? c.image;
}

export type Erfolge = {
  /** Erledigtes, neueste zuerst */
  done: ReiseEntry[];
  /** We-Challenges, die Du für andere erledigt hast */
  helped: number;
  /** Eigene Challenges, die andere für Dich erledigt haben */
  gotHelp: number;
  /** Fertige Me-Challenges */
  meDone: number;
  /** Zeit in Me-Challenges, Millisekunden */
  meTime: number;
  /** Herzen auf Deinen Beiträgen */
  hearts: number;
  edensteine: number;
  /** Bezahlte Coins für Dich, Euro */
  coins: number;
  /** Danke und gute Worte von anderen, neueste zuerst */
  thanks: { comment: Comment; challenge: Challenge }[];
};

const THANKS = /dank|thank|merci|super|toll|klasse|genial|großartig|wow|❤|♥|😍|🙏|💪/i;

export function erfolge(entries: ReiseEntry[], me: string): Erfolge {
  const done = entries
    .filter((e) => isDone(e.challenge))
    .sort((a, b) => (b.challenge.confirmedAt ?? b.challenge.finishedAt ?? b.lastActivity).localeCompare(a.challenge.confirmedAt ?? a.challenge.finishedAt ?? a.lastActivity));
  const helpedEntries = done.filter((e) => e.role === 'assignee' && e.challenge.type === 'individual');
  const meEntries = done.filter((e) => e.role === 'author' && e.challenge.type === 'before_after');
  const thanks = entries
    .filter((e) => isDone(e.challenge))
    .flatMap((e) => e.challenge.comments.filter((c) => c.authorId !== me && THANKS.test(c.body)).map((comment) => ({ comment, challenge: e.challenge })))
    .sort((a, b) => b.comment.createdAt.localeCompare(a.comment.createdAt));
  return {
    done,
    helped: helpedEntries.length,
    gotHelp: done.filter((e) => e.role === 'author' && e.challenge.type === 'individual').length,
    meDone: meEntries.length,
    meTime: meEntries.reduce((sum, e) => sum + (beforeAfterDuration(e.challenge) ?? 0), 0),
    hearts: entries.filter((e) => e.role === 'author').reduce((sum, e) => sum + (e.challenge.likeCount ?? 0), 0),
    edensteine: helpedEntries.reduce((sum, e) => sum + (e.challenge.edensteine ?? 0), 0),
    coins: entries
      .filter((e) => e.role === 'assignee' && e.challenge.status === 'paid')
      .reduce((sum, e) => sum + (e.challenge.bountyAmount ?? 0), 0),
    thanks,
  };
}

/**
 * Meilensteine (Vorschlag Claude, 29.10.2026, Schwellen bitte mit Daria abstimmen). Es erscheinen nur erreichte,
 * nie ausgegraute, damit kein Druck entsteht. Der höchste erreichte Wert je Reihe zählt.
 */
export function meilensteine(e: Erfolge): string[] {
  const out: string[] = [];
  const step = (n: number, list: [number, string][]) => {
    const hit = list.filter(([min]) => n >= min).at(-1);
    if (hit) out.push(hit[1]);
  };
  step(e.meDone, [[1, 'Erste Me-Challenge geschafft'], [5, '5 Me-Challenges geschafft'], [20, '20 Me-Challenges geschafft']]);
  step(e.helped, [[1, 'Zum ersten Mal geholfen'], [5, '5 Mal geholfen'], [20, '20 Mal geholfen']]);
  step(e.gotHelp, [[1, 'Erste Hilfe bekommen']]);
  step(e.hearts, [[10, '10 Herzen bekommen'], [50, '50 Herzen bekommen'], [100, '100 Herzen bekommen']]);
  step(e.meTime / 3600000, [[1, '1 Stunde für Dich'], [10, '10 Stunden für Dich']]);
  return out;
}
