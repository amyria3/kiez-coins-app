import { t } from './texts';
import type { Challenge, ImageSource, JoinMode, Participant } from './types';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

/**
 * We-Challenge (Kiez und Gruppe) mit Vorher und Nachher (Daria, 27.10.2026):
 * Das Foto der Aufgabe ist das Vorher, das Erledigungsfoto das Nachher. Das Nachher erscheint erst nach dem Bestätigen.
 */
export function weChallengeAfter(c: Challenge): ImageSource | undefined {
  return c.type === 'individual' && COMPLETED.has(c.status) ? c.report?.photo : undefined;
}

/**
 * Text einer We-Challenge mit Marken: #vorher vor der Beschreibung, #nachher vor der Notiz zur Erledigung.
 * Eine Marke steht nur, wenn es den Text dazu gibt. Gespeichert sind die Texte ohne Marke.
 */
export function weChallengeText(c: Challenge): string {
  if (c.type !== 'individual') return c.text;
  const before = c.text.trim();
  const note = weChallengeAfter(c) ? c.report?.note?.trim() : undefined;
  return [before ? `#vorher ${before}` : '', note ? `#nachher ${note}` : ''].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// Mehrere Personen in einer We-Challenge (Daria, 27.10.2026, Migration 20261028000300)
// ---------------------------------------------------------------------------

/** Höchstzahl an Teilnehmenden, ohne Angabe 1 */
export const maxParticipants = (c: Challenge) => c.maxParticipants ?? 1;

/** Mehr als eine Person darf mitmachen */
export const isMultiPerson = (c: Challenge) => maxParticipants(c) > 1;

/** Wer dabei ist, die erste Person zuerst. Ohne Liste (alte Daten, Demo) die annehmende Person. */
export function joinedIds(c: Challenge): string[] {
  const joined = (c.participants ?? [])
    .filter((p) => p.status === 'joined')
    .sort((a, b) => (a.joinedAt ?? a.requestedAt).localeCompare(b.joinedAt ?? b.requestedAt))
    .map((p) => p.userId);
  // Die erste Person zählt, außer sie steht mit anderem Status in der Liste (z. B. beim Bestätigen abgewählt)
  const firstOut = c.participants?.some((p) => p.userId === c.assigneeId && p.status !== 'joined');
  return c.assigneeId && !firstOut ? [c.assigneeId, ...joined.filter((id) => id !== c.assigneeId)] : joined;
}

/** Ist die Person dabei? */
export const isParticipant = (c: Challenge, userId: string) => joinedIds(c).includes(userId);

/** Offene Anfragen, die älteste zuerst. Sieht nur die Erstellerin (und jede Person ihre eigene). */
export const joinRequests = (c: Challenge): Participant[] =>
  (c.participants ?? []).filter((p) => p.status === 'requested').sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

/** Eigene Teilnahme, falls es eine gibt */
export const myParticipation = (c: Challenge, userId: string): Participant | undefined =>
  c.participants?.find((p) => p.userId === userId) ??
  (c.assigneeId === userId ? { userId, status: 'joined', requestedAt: c.acceptedAt ?? c.createdAt, joinedAt: c.acceptedAt } : undefined);

/** Freie Plätze */
export const freeSpots = (c: Challenge) => Math.max(0, maxParticipants(c) - joinedIds(c).length);

/** Beitreten und Ausschließen gehen, bis jemand erledigt meldet */
export const participantsOpen = (c: Challenge) =>
  c.type === 'individual' && (c.status === 'open' || c.status === 'accepted') && Date.parse(c.deadline) > Date.now();

/**
 * Kurzer Text zur Teilnahme, z. B. „2 von 5 dabei, auf Anfrage“. Leer bei einer Person, offen (wie bisher).
 * Ohne `joined` (Vorschau, Erstellen): „Bis zu 5 Personen“.
 */
export function participationText(max: number, mode: JoinMode = 'open', joined?: number): string {
  if (max <= 1 && mode === 'open') return '';
  const count =
    joined === undefined
      ? max === 1
        ? t('1 Person')
        : t('Bis zu {n} Personen', { n: max })
      : t('{joined} von {max} dabei', { joined, max });
  return mode === 'approval' ? t('{count}, auf Anfrage', { count }) : count;
}
