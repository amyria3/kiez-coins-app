// Weiterleitungsoptionen der Digitalen Visitenkarte (2026-11-23): welche Knöpfe in welcher Reihenfolge erscheinen.
// Eine Regel für App (src/components/showcase/CardActions.tsx) und Webseite (api/_visitenkarte.mjs), damit beide
// dieselben Knöpfe mit denselben Namen zeigen. Reines JavaScript ohne Abhängigkeiten: Metro lädt .mjs, die
// Vercel-Funktion importiert die Datei relativ, die Tests bündeln sie mit esbuild.
//
// Zwei Fragen entscheiden: Wer schaut (Team, angemeldetes Mitglied, Gast) und woher die Person kommt (QR-Code der
// Karte, geteilter Link, Schaufenster-Seite, Verwaltung). Die Webseite kennt die Anmeldung der App nicht
// (app.kiezcoins.de), dort gilt jede Person als Gast. Drucken gehört nicht dazu: Die Druckbare Visitenkarte hat einen
// eigenen Knopf in der Verwaltung, damit sie nicht mit dem Weitergeben verwechselt wird (2026-11-23).

/** @typedef {'team' | 'member' | 'guest'} CardViewer */
/** @typedef {'card' | 'link' | 'showcase' | 'manage'} CardOrigin */
/**
 * @typedef {'share' | 'copyLink' | 'saveContact' | 'sendContact' | 'exchange' | 'addContact' | 'qr' | 'mail' | 'follow' | 'befriend' | 'showcase'} CardActionId
 */
/** @typedef {{ id: CardActionId, primary: boolean }} CardAction */

/**
 * Beschriftungen, deutsch wie überall in der App (Übersetzung über app_texts und DeepL). `{name}` ist der Name des
 * Schaufensters. „Zum Schaufenster“ heißt „Zurück zum Schaufenster“, wenn die Person von dort kam.
 */
export const CARD_ACTION_LABELS = {
  share: 'Digitale Visitenkarte teilen',
  copyLink: 'Link kopieren',
  saveContact: 'In Kontakte speichern',
  sendContact: 'Deinen Kontakt schicken',
  exchange: 'Kontakte tauschen',
  // Kontakt speichern und Mail schicken sind fast dasselbe, die Namen zeigen es (Daria, 2026-11-23)
  addContact: 'Kontakt speichern und per Mail schicken',
  qr: 'QR-Code zeigen',
  mail: 'Per Mail schicken',
  mailOnly: 'Nur per Mail schicken',
  follow: '{name} folgen',
  followGuest: '{name} in KiezCoins folgen',
  befriend: 'Mit {name} anfreunden',
  showcase: 'Zum Schaufenster',
  showcaseBack: 'Zurück zum Schaufenster',
};

/**
 * Feste Reihenfolge; der Hauptknopf rückt nach vorn (Daria, 2026-11-23): „Kontakt speichern und per Mail schicken“ und
 * „Nur per Mail schicken“ stehen direkt hintereinander, „Link kopieren“ steht am Ende.
 */
const ORDER = /** @type {CardActionId[]} */ ([
  'share',
  'saveContact',
  'sendContact',
  'exchange',
  'qr',
  'addContact',
  'mail',
  'follow',
  'befriend',
  'showcase',
  'copyLink',
]);

/**
 * Herkunft aus den Parametern der Adresse: `via=karte` heißt QR-Code der Karte (die Person hat das Team getroffen),
 * `von=schaufenster` die Schaufenster-Seite, `von=verwaltung` die Verwaltung. Sonst ein geteilter Link oder eine Mail.
 * @param {{ via?: string | null, von?: string | null }} params
 * @returns {CardOrigin}
 */
export function cardOrigin({ via, von }) {
  if (via === 'karte') return 'card';
  if (von === 'schaufenster') return 'showcase';
  if (von === 'verwaltung') return 'manage';
  return 'link';
}

/**
 * Knöpfe der Digitalen Visitenkarte, der Hauptknopf zuerst.
 * - Team: Teilen, QR-Code, Kontakt speichern und per Mail schicken, nur per Mail schicken, zuletzt Link kopieren.
 * - Mitglied: Kontakt speichern zuerst; Kontakt schicken mit Name und Mail aus dem Profil; folgen und anfreunden.
 * - Gast nach dem QR-Code der Karte: Kontakt speichern (mit Ort der Begegnung), Kontakt schicken und tauschen.
 *   Den QR-Code zeigt die Ansicht hier nicht, die Person hat ihn gerade gescannt.
 * - Gast über Link oder von der Schaufenster-Seite: Teilen zuerst, Kontakt speichern, QR-Code, Mail, folgen.
 * Kontakt schicken und tauschen gehen nur, wenn das Schaufenster eine Kontakt-Mail hat.
 * @param {{ viewer: CardViewer, origin: CardOrigin, hasContactMail?: boolean, canBefriend?: boolean, following?: boolean }} input
 * @returns {CardAction[]}
 */
export function cardActions({ viewer, origin, hasContactMail = false, canBefriend = false, following = false }) {
  const team = viewer === 'team';
  const member = viewer === 'member';
  const met = viewer === 'guest' && origin === 'card';
  /** @type {Record<CardActionId, boolean>} */
  const shown = {
    share: true,
    copyLink: team,
    saveContact: !team,
    sendContact: (member || met) && hasContactMail,
    exchange: (member || met) && hasContactMail,
    addContact: team,
    qr: !met,
    mail: true,
    follow: !team && !(member && following),
    befriend: !team && canBefriend,
    showcase: !team,
  };
  /** @type {CardActionId} */
  const primary = member || met ? 'saveContact' : 'share';
  // Der Hauptknopf ist immer dabei: Teilen gibt es überall, Kontakt speichern bei Mitgliedern und nach dem QR-Code
  const ids = ORDER.filter((id) => shown[id] && id !== primary);
  return [primary, ...ids].map((id) => ({ id, primary: id === primary }));
}

/**
 * Vorlage der Beschriftung mit `{name}`. Die App übersetzt sie mit t(vorlage, { name }), die Webseite setzt den
 * Namen mit cardActionLabel ein.
 * @param {CardActionId} id
 * @param {{ viewer: CardViewer, origin: CardOrigin }} context
 */
export function cardActionTemplate(id, { viewer, origin }) {
  if (id === 'follow') return viewer === 'guest' ? CARD_ACTION_LABELS.followGuest : CARD_ACTION_LABELS.follow;
  if (id === 'showcase') return origin === 'showcase' ? CARD_ACTION_LABELS.showcaseBack : CARD_ACTION_LABELS.showcase;
  // Beim Team steht „Kontakt speichern und per Mail schicken“ davor, deshalb „Nur“
  if (id === 'mail') return viewer === 'team' ? CARD_ACTION_LABELS.mailOnly : CARD_ACTION_LABELS.mail;
  return CARD_ACTION_LABELS[id];
}

/**
 * @param {CardActionId} id
 * @param {{ name: string, viewer: CardViewer, origin: CardOrigin }} context
 */
export function cardActionLabel(id, context) {
  return cardActionTemplate(id, context).replace('{name}', context.name);
}
