import type { ImageSourcePropType } from 'react-native';

// Datenmodell laut Figma-Komponentenbeschreibungen (ChallengePost, StatusBadge, Flow „Bounty auf Vertrauen“).
// Gespeichert in Supabase (supabase/migrations), Umwandlung in src/data/remote.ts.

/**
 * Ablauf Challenge: draft → open → accepted → reported → confirmed (ohne Bounty) bzw. payment_open (mit Bounty).
 * Entwurf (draft) sieht nur die Ersteller:in. Eine offene Challenge ohne Annehmende lässt sich schließen (closed),
 * sie bleibt dann in der Timeline sichtbar.
 * Ablehnen setzt `reported` zurück auf `accepted`.
 * Ablauf Bounty: payment_open → paid_marked → paid.
 */
export type ChallengeStatus =
  | 'draft'
  | 'open'
  | 'accepted'
  | 'reported'
  | 'confirmed'
  | 'rejected'
  | 'payment_open'
  | 'paid_marked'
  | 'paid'
  | 'closed';

export type ChallengeType = 'individual' | 'wave';

export type ImageSource = ImageSourcePropType;

/** Weiteres Foto einer Challenge. `path` ist gesetzt, sobald es in Supabase liegt. */
export type ExtraPhoto = { photo: ImageSource; path?: string };

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
  /** Antwort auf diesen Kommentar (eine Ebene) */
  replyToId?: string;
};

export type Challenge = {
  /** Grober Punkt (rund 100 m), wenn beim Erstellen der Standort freigegeben war */
  coords?: { latitude: number; longitude: number };
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
  /** Pfad des Fotos im Storage, nur für eigene Entwürfe (Foto bleibt beim Speichern erhalten) */
  imagePath?: string;
  /** Bis zu 2 weitere Fotos (Migration 20261020000700) */
  extraImages?: ExtraPhoto[];
  imageBefore?: ImageSource;
  imageAfter?: ImageSource;
  likedByMe: boolean;
  /** Bei Entwürfen leer: Die Frist entsteht erst beim Veröffentlichen. */
  deadline: string;
  createdAt: string;
  closedAt?: string;
  acceptedAt?: string;
  /** Figma `acceptance.operation_name`: privat, nur für die annehmende Person. Leer = bewusst ohne Taufe */
  operationName?: string;
  report?: ChallengeReport;
  payoutShare?: PayoutShare;
  comments: Comment[];
  /** Aufrufe durch andere, nur bei eigenen Challenges und nur mit Migration `challenge_views` */
  views?: number;
  rejectionReason?: string;
  confirmedAt?: string;
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
