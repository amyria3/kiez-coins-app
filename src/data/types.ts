import type { ImageSourcePropType } from 'react-native';

// Datenmodell laut Figma-Komponentenbeschreibungen (ChallengePost, StatusBadge, Flow „Bounty auf Vertrauen“).
// Gespeichert in Supabase (supabase/migrations), Umwandlung in src/data/remote.ts.

/**
 * Ablauf Challenge: open → accepted → reported → confirmed (ohne Bounty) bzw. payment_open (mit Bounty).
 * Ablehnen setzt `reported` zurück auf `accepted`.
 * Ablauf Bounty: payment_open → paid_marked → paid.
 */
export type ChallengeStatus =
  | 'open'
  | 'accepted'
  | 'reported'
  | 'confirmed'
  | 'rejected'
  | 'payment_open'
  | 'paid_marked'
  | 'paid';

export type ChallengeType = 'individual' | 'wave';

export type ImageSource = ImageSourcePropType;

export type Payout = {
  accountHolder: string;
  iban: string;
  paypal?: string;
};

export type User = {
  id: string;
  name: string;
  /** Vorname für Texte wie „Peter zahlt die Bounty …“ */
  firstName: string;
  avatar?: ImageSource;
  /** Ort unter dem Namen in der AuthorRow */
  location?: string;
  /** Gruppe statt Einzelperson: Texte sprechen sie mit Artikel und im Plural an */
  group?: boolean;
  payout?: Payout;
};

export type PayoutMethod = 'iban' | 'paypal';

/**
 * Figma `payout_share`: Freigabe der Zahlungsdaten für genau eine Challenge und eine Person.
 * `payout` ist eine Kopie, damit die Freigabe auch ohne gespeicherte Daten im Konto funktioniert.
 */
export type PayoutShare = {
  method: PayoutMethod;
  payout: Payout;
};

export type ChallengeReport = {
  photo: ImageSource;
  note?: string;
};

/** Figma `comment`: öffentlicher Kommentar unter einer Challenge. */
export type Comment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Challenge = {
  id: string;
  type: ChallengeType;
  title: string;
  /** Beschreibung bzw. Beitragstext */
  text: string;
  /** Nur bei Wave: Text der ursprünglichen Challenge */
  challengeText?: string;
  authorId: string;
  assigneeId?: string;
  /** Straße bzw. Ort, PLZ */
  location: string;
  /** Stadtteil, z. B. „Schönefeld, Leipzig“ (unter dem Namen nach dem Annehmen) */
  kiez?: string;
  /** Bounty in Euro, 5–50, ohne echte Zahlung im MVP */
  bountyAmount?: number;
  status: ChallengeStatus;
  image?: ImageSource;
  imageBefore?: ImageSource;
  imageAfter?: ImageSource;
  likedByMe: boolean;
  deadline: string;
  createdAt: string;
  acceptedAt?: string;
  /** Figma `acceptance.operation_name`: privat, nur für die annehmende Person. Leer = bewusst ohne Taufe */
  operationName?: string;
  report?: ChallengeReport;
  payoutShare?: PayoutShare;
  comments: Comment[];
  rejectionReason?: string;
  paidMarkedAt?: string;
};

export type FeedState = 'filled' | 'loading' | 'empty' | 'error' | 'offline';

export type UserReportReason = 'not_paid' | 'abusive' | 'spam' | 'other';

/** Figma `profile.address_form`: Ansprache, privat, nur für Kater-Texte */
export type AddressForm = 'pirat_colon' | 'pirat_star' | 'pirat' | 'piratin' | 'the_pirat' | 'custom';

/** Profil der Person, die die App benutzt (Onboarding und Konto). */
export type Profile = {
  email: string;
  /** Figma `profile.handle` (Deckname): öffentlich, einmalig */
  handle: string;
  addressForm?: AddressForm;
  addressCustom?: string;
  /** Figma `kiez_id`; ohne Kiez darf man nur lesen */
  kiez?: string;
  push: boolean;
  onboarded: boolean;
  pausedUntil?: string;
  /** Kodex im Onboarding: Zeitpunkte der Zustimmung */
  ageConfirmedAt?: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
};
