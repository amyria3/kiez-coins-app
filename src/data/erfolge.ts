import type { Challenge, Comment, Group, ImageSource } from './types';
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

export type Quest = {
  key: string;
  title: string;
  value: number;
  goal: number;
  /** Schlüssel, unter dem das Gerät sich merkt, dass das Geschenk schon aufging (Monatsziele pro Monat) */
  seenKey: string;
};

/**
 * Ziele mit Balken und Geschenk (Daria, 29.10.2026). Zählen für das ganze Konto, nicht je Reiter.
 * - Post: jeder veröffentlichte eigene Beitrag (Bild, Me- oder We-Challenge)
 * - Me-Challenge: fertig gepostet. We-Challenge: veröffentlicht oder angenommen
 * - Pro Monat: im laufenden Kalendermonat
 * - Einladung: mindestens eine Freundschaft
 * - Gruppe (Daria, 29.10.2026), nur wenn Gruppen nicht ausgeschaltet sind: Mitglied in mindestens einer Gruppe;
 *   2 Menschen eingeladen = 2 weitere Mitglieder in Gruppen, die Du gegründet hast. Wer eingeladen hat, speichert
 *   die Datenbank nicht, deshalb zählen alle, die später beigetreten sind.
 */
export type GroupProgress = { groups: number; invited: number };

/** Gruppen-Ziele zählen: Mitgliedschaften und weitere Mitglieder in selbst gegründeten Gruppen */
export function groupProgress(groups: Group[], me: string): GroupProgress {
  const mine = groups.filter((g) => g.members.some((m) => m.userId === me));
  const invited = mine
    .filter((g) => g.founderId === me)
    .reduce((n, g) => n + g.members.filter((m) => m.userId !== me).length, 0);
  return { groups: mine.length, invited };
}

/** `groups` leer lassen, wenn Gruppen ausgeschaltet sind: Dann fehlen die Gruppen-Ziele. */
export function quests(entries: ReiseEntry[], friends: number, groups?: GroupProgress, now = new Date()): Quest[] {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const inMonth = (iso?: string) => !!iso && iso.slice(0, 7) === month;
  const own = entries.filter((e) => e.role === 'author');
  const meDone = own.filter((e) => e.challenge.type === 'before_after' && !!e.challenge.finishedAt);
  const we = entries.filter((e) => e.challenge.type === 'individual');
  const weSince = (e: ReiseEntry) => (e.role === 'author' ? e.challenge.createdAt : e.challenge.acceptedAt ?? e.lastActivity);
  const q = (key: string, title: string, value: number, monthly = false, goal = 1): Quest => ({
    key,
    title,
    value: Math.min(value, goal),
    goal,
    seenKey: monthly ? `${key}:${month}` : key,
  });
  return [
    q('post', 'Dein erster Post', own.length),
    q('me', 'Deine erste Me-Challenge', meDone.length),
    q('we', 'Deine erste We-Challenge', we.length),
    q('me-monat', 'Eine Me-Challenge pro Monat', meDone.filter((e) => inMonth(e.challenge.finishedAt)).length, true),
    q('we-monat', 'Eine We-Challenge pro Monat', we.filter((e) => inMonth(weSince(e))).length, true),
    q('einladung', 'Deine erste Einladung', friends),
    ...(groups
      ? [
          q('gruppe', 'Deine erste Gruppe', groups.groups),
          q('gruppe-einladen', 'Du hast 2 Menschen zu Deiner Gruppe eingeladen', groups.invited, false, 2),
        ]
      : []),
  ];
}
