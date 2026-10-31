/**
 * Begrüßung nach dem Anheuern (Route `tour`): kurze Videos zu den Hauptfunktionen.
 *
 * Videos nachreichen: Datei nach `assets/tour/` legen (MP4, H.264, Hochformat 9:16, unter 10 MB)
 * und bei `video` eintragen, z. B. `video: require('../../assets/tour/posten.mp4')`.
 * Alternativ eine öffentliche Adresse, z. B. aus dem Supabase-Storage: `video: 'https://…/posten.mp4'`.
 * Ohne Video zeigt die Seite den Kater.
 */
export type TourStep = {
  key: string;
  title: string;
  text: string;
  /** require('…mp4') oder https-Adresse */
  video?: number | string;
  /** `feedback`: letzte Seite mit der Frage, wie die Erklärung war (Daria, 29.10.2026) */
  kind?: 'feedback';
};

export const tourSteps: TourStep[] = [
  {
    key: 'posten',
    // Titel und Text von Daria (31.10.2026)
    title: 'Fotos machen – Challenges und Bilder posten',
    text: 'Siehst Du etwas, das im Kiez zu tun ist? Oder etwas, das Du besonders magst (Sticker, Blumen, Vögel, schöne Orte)? Tippe auf die Kamera, gib einen Titel und den Ort an.',
  },
  // Titel und Text von Daria (31.10.2026)
  {
    key: 'me-challenge',
    title: 'Was ist eine Me-Challenge?',
    text: 'Du packst gern an, gehst mit gutem Beispiel voran oder teilst Life-Hacks und Rezepte? Dann ist das Vorher-Nachher-Format wahrscheinlich genau das Richtige für Dich.\nZeige die Ausgangslage – schieß ein Foto von vorher und starte den Timer. Wenn Du fertig bist, folgt das „Nachher“-Foto. Dein Post zeigt beides.',
  },
  // Titel und Text von Daria (31.10.2026)
  {
    key: 'we-challenge',
    title: 'Was ist eine We-Challenge?',
    text: 'Hier gibt es etwas zu tun, und andere helfen mit. Du zeigst die Ausgangslage und setzt damit einen Impuls. Hier bei KiezCoins heißt das „We-Challenge“: Andere Nutzer:innen können die Challenge annehmen. Wenn sie erfolgreich sind, dokumentieren sie das Ergebnis ebenfalls mit einem Bild.',
  },
  // Nach der We-Challenge (Daria, 31.10.2026)
  // Ergänzt von Daria (29.10.2026). Titel von Claude, Text von Daria
  {
    key: 'bild',
    title: 'Einfach ein schönes Bild',
    text: 'Ist Dir das alles ein wenig zu viel und zu kompliziert für den Anfang? Dann poste doch einfach ein nettes Bild oder Deine Lieblingsstelle im Wald. Share the Moment (aber nur, wenn Dir danach ist).',
  },
  {
    key: 'annehmen',
    title: 'Annehmen und anpacken',
    text: 'Nimm eine Challenge in Deiner Nähe an, erledige sie und zeige das Ergebnis mit einem Foto. Die Person bestätigt, dann ist es geschafft.',
  },
  {
    key: 'coins',
    title: 'Coins direkt, Vertrauen zuerst',
    // Text von Daria (29.10.2026)
    text: 'Wer beim Erstellen einer Challenge „Das ist mir bares Geld wert“ anklickt, verspricht eine materielle Belohnung. Solche Interaktionen basieren auf Vertrauen. Wir können leider nicht kontrollieren, ob das Versprechen eingehalten wird. Doch die Idee hinter KiezCoins ist, dass Menschen mit Geld und Menschen mit Zeit zum Wohl der Gemeinschaft zusammenfinden. Ob das funktioniert, testen wir gerade.',
  },
  {
    key: 'gruppen',
    title: 'Gruppen für WG, Familie und Verein',
    text: 'Verteilt We-Challenges unter Euch und sammelt Edensteine. Sie gelten nur in Eurer Gruppe.',
  },
  // Titel von Daria, Text von Claude
  {
    key: 'sichtbarkeit',
    title: 'Die Sichtbarkeit Deiner öffentlichen Posts kannst Du begrenzen',
    text: 'Schalte beim Posten „Auf einen Umkreis von 5 km begrenzen“ ein. So sehen nur Menschen in Deinem Kiez den Beitrag, nicht in „Überall“. Ändern kannst Du das später im Menü des Beitrags.',
  },
  // Titel und Text von Claude
  {
    key: 'privat',
    title: 'Privat: nur für Dich',
    text: 'Im Modus „Privat“ siehst nur Du, was Du postest. Halte fest, was Dir gefällt, ganz ohne Publikum. Du findest den Modus oben im Umschalter.',
  },
  // Frage und Antworten von Daria
  {
    key: 'feedback',
    kind: 'feedback',
    title: 'Wie fandest Du diese Erklärung?',
    text: 'Mehrere Antworten möglich',
  },
];

/** Antworten auf der letzten Seite, Wortlaut von Daria (29.10.2026). Schlüssel wie in `tour_feedback.choices`. */
export const tourFeedbackOptions = [
  { key: 'helpful', label: 'Hilfreich' },
  { key: 'motivating', label: 'Hat mir Lust auf die App gemacht' },
  { key: 'cumbersome', label: 'Umständlich' },
  { key: 'not_needed', label: 'Hätte ich nicht gebraucht' },
] as const;
export const TOUR_FEEDBACK_OTHER_MAX = 1000;

export const TOUR_SEEN_KEY = 'tour_seen_v1';

/** Wann die App anbietet, die Tour zu zeigen (Zeitstempel in ms). Gesetzt am Ende des Onboardings. */
export const TOUR_OFFER_KEY = 'tour_offer_at_v1';
/** Etwa 5 Minuten nach der Anmeldung fragt die App, ob sie die wichtigsten Funktionen zeigen soll (Daria, 28.10.2026). */
export const TOUR_OFFER_DELAY_MS = 5 * 60 * 1000;
