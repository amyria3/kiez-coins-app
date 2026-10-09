import type { ImageSourcePropType } from 'react-native';

// Datenmodell laut Figma-Komponentenbeschreibungen (ChallengePost, StatusBadge, Flow „Bounty auf Vertrauen“).
// Supabase kommt später; die Feldnamen sind so gewählt, dass sie sich 1:1 als Tabellenspalten eignen.

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
  /** Gruppe statt Einzelperson: Texte sprechen sie mit Artikel und im Plural an */
  group?: boolean;
  payout?: Payout;
};

export type ChallengeReport = {
  photo: ImageSource;
  note?: string;
  /** Welche Zahlungsdaten für diese Challenge freigegeben sind */
  shareIban: boolean;
  sharePaypal: boolean;
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
  /** Bounty in Euro, 5–50, ohne echte Zahlung im MVP */
  bountyAmount?: number;
  status: ChallengeStatus;
  image?: ImageSource;
  imageBefore?: ImageSource;
  imageAfter?: ImageSource;
  likedByMe: boolean;
  deadline: string;
  createdAt: string;
  report?: ChallengeReport;
  rejectionReason?: string;
  paidMarkedAt?: string;
};

export type FeedState = 'filled' | 'empty' | 'error' | 'offline';

export type UserReportReason = 'not_paid' | 'abusive' | 'spam' | 'other';
