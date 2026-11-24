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
 * @typedef {'share' | 'copyLink' | 'saveContact' | 'message' | 'addContact' | 'qr' | 'mail' | 'mailSelf' | 'follow' | 'befriend' | 'showcase'} CardActionId
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
  // Ersetzt „Deinen Kontakt senden“ und „Kontakte tauschen“: Nachricht an das Schaufenster, Kopie mit der Digitalen
  // Visitenkarte an die eigene Adresse (Daria, 2026-11-24)
  message: 'Nachricht oder Frage senden',
  // Kontakt speichern und Mail senden sind fast dasselbe, die Namen zeigen es (Daria, 2026-11-23)
  addContact: 'Kontakt speichern und per Mail senden',
  qr: 'QR-Code zeigen',
  mail: 'Nur per Mail senden',
  // Fremde senden die Karte sich selbst, ohne Kontakt aufzunehmen (Daria, 2026-11-24: „eine andere User Persona“)
  mailSelf: 'An mich per Mail senden',
  follow: '{name} folgen',
  followGuest: '{name} in KiezCoins folgen',
  befriend: 'Mit {name} anfreunden',
  showcase: 'Zum Schaufenster',
  showcaseBack: 'Zurück zum Schaufenster',
};

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
 * Knöpfe der Digitalen Visitenkarte in ihrer Reihenfolge.
 * - Team (unverändert, 2026-11-23): Teilen als Hauptknopf zuerst, QR-Code, „Kontakt speichern und per Mail senden“ und
 *   „Nur per Mail senden“ hintereinander, zuletzt „Link kopieren“.
 * - Fremde (Daria, 2026-11-24): Was die Beziehung knüpft, steht vorn, was die Karte nur behält oder weitergibt, hinten.
 *   Angemeldet: Folgen, Anfreunden, Zum Schaufenster, Nachricht oder Frage, An mich per Mail, In Kontakte speichern,
 *   QR-Code, Teilen. Gäste: Nachricht oder Frage zuerst, danach Folgen und die übrigen in derselben Reihenfolge.
 *   Teilen bleibt der gefüllte Hauptknopf, auch ganz unten. Der QR-Code bleibt auch nach dem Scan in der Liste.
 * Nachricht oder Frage gibt es nur, wenn das Schaufenster eine Kontakt-Mail hat. Die Herkunft ändert die Reihenfolge
 * nicht mehr; nach dem QR-Code der Karte fragen die Formulare zusätzlich nach dem Ort der Begegnung.
 * @param {{ viewer: CardViewer, origin: CardOrigin, hasContactMail?: boolean, canBefriend?: boolean, following?: boolean }} input
 * @returns {CardAction[]}
 */
export function cardActions({ viewer, hasContactMail = false, canBefriend = false, following = false }) {
  /** @type {(CardActionId | false)[]} */
  const list =
    viewer === 'team'
      ? ['share', 'qr', 'addContact', 'mail', 'copyLink']
      : viewer === 'member'
        ? [!following && 'follow', canBefriend && 'befriend', 'showcase', hasContactMail && 'message', 'mailSelf', 'saveContact', 'qr', 'share']
        : [hasContactMail && 'message', 'follow', canBefriend && 'befriend', 'showcase', 'mailSelf', 'saveContact', 'qr', 'share'];
  return list.filter((id) => !!id).map((id) => ({ id: /** @type {CardActionId} */ (id), primary: id === 'share' }));
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
  return CARD_ACTION_LABELS[id];
}

/**
 * @param {CardActionId} id
 * @param {{ name: string, viewer: CardViewer, origin: CardOrigin }} context
 */
export function cardActionLabel(id, context) {
  return cardActionTemplate(id, context).replace('{name}', context.name);
}
