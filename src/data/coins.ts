import type { Challenge, PayoutLine } from './types';
import { formatCents } from './format';
import { t } from './texts';
import { joinedIds } from './weChallenge';

// ---------------------------------------------------------------------------
// Coins in We-Challenges (Daria, 28.10.2026, Migration 20261028000600_we_challenge_coins_geteilt.sql)
// Coins sind die Alternative zu Edensteinen, in jeder We-Challenge im Kiez (nicht in Gruppen).
// Mit Coins machen höchstens 10 Personen mit, pro Platz 5 bis 50 €. Der Betrag wird geteilt.
// ---------------------------------------------------------------------------

/** Höchstzahl an Personen mit Coins */
export const COINS_MAX_PEOPLE = 10;
/** Pro Platz mindestens und höchstens, in Euro */
export const COINS_MIN_PER_PERSON = 5;
export const COINS_MAX_PER_PERSON = 50;

/** Erlaubter Gesamtbetrag für so viele Plätze */
export const bountyRange = (places: number) => ({
  min: COINS_MIN_PER_PERSON * Math.max(1, places),
  max: COINS_MAX_PER_PERSON * Math.max(1, places),
});

/** Passt der Betrag zur Zahl der Plätze? Ohne Betrag immer. */
export function bountyFits(amount: number | undefined, places: number): boolean {
  if (amount === undefined) return true;
  const { min, max } = bountyRange(places);
  return places <= COINS_MAX_PEOPLE && amount >= min && amount <= max;
}

/** Betrag in den erlaubten Bereich holen, z. B. nach einer Änderung der Plätze */
export function clampBounty(amount: number, places: number): number {
  const { min, max } = bountyRange(Math.min(places, COINS_MAX_PEOPLE));
  return Math.min(max, Math.max(min, amount));
}

/** Vorschläge für den Gesamtbetrag: wie bisher 5, 15, 50 € pro Platz */
export const bountyPresets = (places: number) => [5, 15, 50].map((n) => n * Math.max(1, places));

/**
 * Anteile in Cent, die erste Person zuerst. Übrige Cent gehen an die Ersten
 * (20 € für 3 Personen: 667, 667, 666). Wie confirm_challenge in der Datenbank.
 */
export function splitCents(amountEuro: number, people: number): number[] {
  const n = Math.max(1, people);
  const total = Math.round(amountEuro * 100);
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Auszahlung an eine Person, sobald bestätigt */
export const payoutOf = (c: Challenge, userId: string): PayoutLine | undefined =>
  c.payouts?.find((p) => p.userId === userId);

/**
 * Anteil einer Person in Cent: nach der Bestätigung aus der Auszahlung, vorher geschätzt aus allen,
 * die gerade dabei sind (bzw. allen Plätzen, wenn sie nicht dabei ist).
 */
export function shareCentsOf(c: Challenge, userId: string): number {
  if (!c.bountyAmount) return 0;
  const line = payoutOf(c, userId);
  if (line) return line.amountCents;
  const ids = joinedIds(c);
  const i = ids.indexOf(userId);
  const shares = splitCents(c.bountyAmount, Math.max(1, i >= 0 ? ids.length : ids.length + 1));
  return shares[i >= 0 ? i : shares.length - 1];
}

/** Coins für mehrere Personen: Der Betrag wird geteilt */
export const isSharedBounty = (c: Challenge) => !!c.bountyAmount && (c.maxParticipants ?? 1) > 1;

/** „Die Coins werden geteilt: bei 4 Personen 5 € pro Person.“ Leer bei einer Person. */
export function sharedBountyText(amountEuro: number | undefined, places: number): string {
  if (!amountEuro || places <= 1) return '';
  const shares = splitCents(amountEuro, places);
  return t('Die Coins werden geteilt: bei {n} Personen {share} pro Person.', {
    n: places,
    share: formatCents(shares[shares.length - 1]),
  });
}
