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
  | 'closed'
  | 'deleted';

/**
 * `photo`: nur ein schönes Bild, keine Aufgabe (Daria, 22.10.2026).
 * `before_after`: Vorher-Nachher mit Timer, keine Aufgabe (Daria, 23.10.2026, Migration 20261023000300).
 */
export type ChallengeType = 'individual' | 'wave' | 'photo' | 'before_after';

/** Beiträge ohne Aufgabe: nichts anzunehmen, keine Frist, keine Coins */
export const isPostOnly = (type: ChallengeType) => type === 'photo' || type === 'before_after';

export type ImageSource = ImageSourcePropType;

/** Weiteres Foto einer Challenge. `path` ist gesetzt, sobald es in Supabase liegt. */
export type ExtraPhoto = { photo: ImageSource; path?: string };

export type Payout = {
  accountHolder: string;
  iban: string;
  paypal?: string;
};

/** Grammatisches Geschlecht (Daria, 24.10.2026): steuert Texte an die Person und über sie. „person“ = unbestimmt. */
export type Gender = 'er' | 'sie' | 'person';

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
  /** Grammatisches Geschlecht für Texte über die Person; ohne Angabe unbestimmt */
  gender?: Gender;
  payout?: Payout;
  /** Testkonto: Beiträge tragen die Marke „Testaccount“ (Daria, 27.10.2026) */
  test?: boolean;
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

/**
 * Auszahlung an eine Person (Migration 20261028000400). Entsteht beim Bestätigen einer Challenge mit Coins:
 * Der Betrag wird unter allen geteilt, die dabei sind (Daria, 28.10.2026).
 */
export type PayoutLine = {
  userId: string;
  amountCents: number;
  paidMarkedAt?: string;
  paidAt?: string;
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

/**
 * Teilnahme an einer We-Challenge (Migration 20261028000300). `unconfirmed`: beim Bestätigen abgewählt,
 * ohne Coins und Edensteine (Migration 20261028000400). `requested`: wartet auf die Erstellerin.
 * `joined`: dabei. `declined`, `removed`, `left`: nicht mehr dabei (abgelehnt, ausgeschlossen, ausgestiegen).
 */
export type ParticipantStatus = 'requested' | 'joined' | 'declined' | 'removed' | 'left' | 'unconfirmed';
export type Participant = { userId: string; status: ParticipantStatus; requestedAt: string; joinedAt?: string };

/** `open`: Jede Person tritt direkt bei. `approval`: Die Erstellerin nimmt jede Anfrage an oder lehnt sie ab. */
export type JoinMode = 'open' | 'approval';

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
  /** Erste teilnehmende Person. Erledigt melden kann jede teilnehmende Person, für alle (Daria, 28.10.2026). */
  assigneeId?: string;
  /** Höchstzahl an Teilnehmenden, 1 = eine Person (Daria, 27.10.2026). Ohne Migration 20261028000300 leer. */
  maxParticipants?: number;
  joinMode?: JoinMode;
  /** Alle Teilnehmenden und Anfragen, die Du sehen darfst. Ohne Migration leer. */
  participants?: Participant[];
  /** Straße bzw. Ort, PLZ */
  location: string;
  /** Stadtteil, z. B. „Schönefeld, Leipzig“ (unter dem Namen nach dem Annehmen) */
  kiez?: string;
  /**
   * Coins in Euro, ohne echte Zahlung in der App. Gesamtbetrag: pro Platz 5 bis 50 €, höchstens 10 Personen
   * (Migration 20261028000400). Mehrere Personen teilen ihn.
   */
  bountyAmount?: number;
  status: ChallengeStatus;
  image?: ImageSource;
  /** Pfad des Fotos im Storage, nur für eigene Entwürfe (Foto bleibt beim Speichern erhalten) */
  imagePath?: string;
  /** Nur Gruppenaufgaben: Gruppe und Edensteine (1 bis 10) statt Bounty */
  groupId?: string;
  edensteine?: number;
  /** Modus „Privat“: nur die Ersteller:in sieht den Beitrag (Migration 20261028000100) */
  private?: boolean;
  /** Bis zu 2 weitere Fotos (Migration 20261020000700) */
  extraImages?: ExtraPhoto[];
  imageBefore?: ImageSource;
  imageAfter?: ImageSource;
  /** Nur Vorher-Nachher: Texte ohne #vorher/#nachher, im Entwurf getrennt (nach dem Posten steht beides in `text`) */
  beforeText?: string;
  afterText?: string;
  /** Nur Vorher-Nachher: Pfade der Fotos im Storage */
  imageBeforePath?: string;
  imageAfterPath?: string;
  /** Nur Vorher-Nachher: Timerstart (Server) und Ende beim Posten, höchstens 48 h danach */
  timerStartedAt?: string;
  finishedAt?: string;
  likedByMe: boolean;
  /** Wie viele Leute das mögen (Migration like_counts). Ohne Migration unbekannt. */
  likeCount?: number;
  /** Bei Entwürfen leer: Die Frist entsteht erst beim Veröffentlichen. */
  deadline: string;
  createdAt: string;
  closedAt?: string;
  /** Gelöscht (status deleted): nur die Ersteller:in sieht sie noch und kann sie wieder veröffentlichen. */
  deletedAt?: string;
  acceptedAt?: string;
  /** Figma `acceptance.operation_name`: privat, nur für die annehmende Person. Leer = bewusst ohne Taufe */
  operationName?: string;
  report?: ChallengeReport;
  /** Eigene Freigabe; bei der Erstellerin die der ersten Person */
  payoutShare?: PayoutShare;
  /** Alle Freigaben, die Du sehen darfst, je Person (Erstellerin ab der Bestätigung) */
  payoutShares?: Record<string, PayoutShare>;
  /** Auszahlungen je Person, ab der Bestätigung (Migration 20261028000400) */
  payouts?: PayoutLine[];
  comments: Comment[];
  /** Aufrufe durch andere, nur bei eigenen Challenges und nur mit Migration `challenge_views` */
  views?: number;
  rejectionReason?: string;
  confirmedAt?: string;
  paidMarkedAt?: string;
};

export type GroupMember = { userId: string; role: 'founder' | 'member'; joinedAt: string };

/** Gruppe mit 2 bis 13 Mitgliedern, eigene Aufgaben mit Edensteinen (Migration 20261021000100) */
export type Group = {
  id: string;
  name: string;
  founderId: string;
  /** 6 Zeichen, z. B. „K7M2QX“ */
  inviteCode: string;
  /** Rangliste nach Edensteinen sichtbar. Aus: nur Mitgliederliste (Migration 20261022000500_group_leaderboard_toggle) */
  showLeaderboard: boolean;
  members: GroupMember[];
  createdAt: string;
};

export type FeedState = 'filled' | 'loading' | 'empty' | 'error' | 'offline';

/** `abusive` stammt aus der Zeit vor den Community-Regeln und erscheint nur noch in der Moderation. */
export type UserReportReason =
  | 'not_paid'
  | 'abusive'
  | 'discrimination'
  | 'harassment'
  | 'violence'
  | 'spam'
  | 'other';

/** Gründe für „Challenge melden“ (Migration 20261021000700). */
export type ChallengeReportReason =
  | 'discrimination'
  | 'harassment'
  | 'violence'
  | 'dangerous'
  | 'illegal'
  | 'spam'
  | 'other';

/** Meldung in der Moderationsliste: Person oder Challenge. */
export type ModerationReport = {
  kind: 'user' | 'challenge';
  id: string;
  reporterId: string;
  /** Gemeldete Person; bei Challenges die Ersteller:in */
  reportedId?: string;
  challengeId?: string;
  reason: string;
  description?: string;
  status: 'new' | 'confirmed' | 'dismissed';
  createdAt: string;
};

/** Figma `profile.address_form`: Ansprache, privat, nur für Kater-Texte */
export type AddressForm = 'pirat_colon' | 'pirat_star' | 'pirat' | 'piratin' | 'the_pirat' | 'custom';

/** Profil der Person, die die App benutzt (Onboarding und Konto). */
export type Profile = {
  email: string;
  /** Figma `profile.handle` (Deckname): öffentlich, einmalig */
  handle: string;
  addressForm?: AddressForm;
  addressCustom?: string;
  /** Grammatisches Geschlecht, öffentlich (`profiles.gender`) */
  gender?: Gender;
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
