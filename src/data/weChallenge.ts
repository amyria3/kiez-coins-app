import type { Challenge, ImageSource } from './types';

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
