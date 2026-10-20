/**
 * Rechtstexte für den Testbetrieb: Impressum, Datenschutzerklärung, Nutzungsbedingungen.
 * Angezeigt unter `rechtliches/[doc]`, verlinkt in `onboarding/welcome`, `onboarding/kodex` und `account`.
 *
 * Offene Angaben stehen als „[offen: …]“ im Text, bis Daria sie in `OPERATOR` einträgt.
 * Ändern sich Inhalte, bekommt `LEGAL_STAND` ein neues Datum.
 */

/** Stand aller drei Texte (TT.MM.JJJJ). */
export const LEGAL_STAND = '21.10.2026';

/** Angaben zur Anbieterin. Leere Felder erscheinen in der App als „[offen: …]“. */
export const OPERATOR = {
  name: 'Maria Arkadieff',
  /** Ladungsfähige Anschrift: Straße, Hausnummer, PLZ, Ort. Kein Postfach. */
  street: '',
  city: '',
  /** Postfach für Impressum, Datenschutz und Meldungen, zum Beispiel kontakt@kiezcoins.de */
  email: 'kiezkoins@protonmail.com',
  /** Zweiter schneller Kontaktweg nach § 5 DDG: Telefon oder Kontaktformular. */
  phone: '',
  /** Zuständige Datenschutz-Aufsichtsbehörde im Bundesland der Anbieterin. */
  authority: 'Die Sächsische Datenschutz- und Transparenzbeauftragte, Devrientstraße 5, 01067 Dresden',
};

const open = (value: string, what: string) => (value.trim() ? value.trim() : `[offen: ${what}]`);

const name = OPERATOR.name;
/** Ohne eingetragene Anschrift nennt der Text sie auf Anfrage (Schutz der Wohnadresse, bis eine c/o-Adresse steht). */
const hasAddress = Boolean(OPERATOR.street.trim() && OPERATOR.city.trim());
const onRequest = 'Die ladungsfähige Anschrift teilen wir bei berechtigtem Interesse auf Anfrage per E-Mail mit.';
const email = open(OPERATOR.email, 'E-Mail-Adresse');
const phone = open(OPERATOR.phone, 'Telefonnummer');
const authority = open(OPERATOR.authority, 'Aufsichtsbehörde, in Berlin: Berliner Beauftragte für Datenschutz und Informationsfreiheit');

export type LegalSection = { heading?: string; paragraphs: string[] };
export type LegalDoc = { title: string; intro?: string; sections: LegalSection[] };
export type LegalDocId = 'impressum' | 'datenschutz' | 'bedingungen';

export const legalDocIds: LegalDocId[] = ['impressum', 'datenschutz', 'bedingungen'];

export const legalDocs: Record<LegalDocId, LegalDoc> = {
  impressum: {
    title: 'Impressum',
    sections: [
      {
        heading: 'Angaben nach § 5 DDG',
        paragraphs: hasAddress ? [`${name}\n${OPERATOR.street.trim()}\n${OPERATOR.city.trim()}\nDeutschland`] : [name, onRequest],
      },
      {
        heading: 'Kontakt',
        paragraphs: [OPERATOR.phone.trim() ? `E-Mail: ${email}\nTelefon: ${phone}` : `E-Mail: ${email}\nIn der App: „Dein Konto“ › Support`],
      },
      {
        heading: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
        paragraphs: [hasAddress ? `${name}, Anschrift wie oben` : name],
      },
      {
        heading: 'Kontaktstelle nach dem Digital Services Act',
        paragraphs: [
          `Behörden, die EU-Kommission und Nutzerinnen und Nutzer erreichen uns unter ${email}, auf Deutsch oder Englisch. Rechtswidrige Inhalte meldest Du direkt in der App über „Person melden“ oder per E-Mail.`,
        ],
      },
      {
        heading: 'Testbetrieb',
        paragraphs: ['Kiez Coins ist eine kostenlose Testversion. Es gelten die Nutzungsbedingungen für die Testphase.'],
      },
    ],
  },

  datenschutz: {
    title: 'Datenschutz',
    intro: 'Hier steht, welche Daten Kiez Coins verarbeitet, wozu und wie lange. Kiez Coins nutzt keine Werbung, kein Tracking und keine Analyse-Werkzeuge.',
    sections: [
      {
        heading: 'Verantwortlich ist die Anbieterin',
        paragraphs: [hasAddress ? `${name}, ${OPERATOR.street.trim()}, ${OPERATOR.city.trim()}, E-Mail: ${email}` : `${name}, E-Mail: ${email}. Anschrift im Impressum.`],
      },
      {
        heading: 'Dein Konto',
        paragraphs: [
          'Für das Konto speichern wir Deine E-Mail-Adresse und, wenn Du eines festlegst, Dein Passwort als verschlüsselten Hash. Die Anmeldung per Code schickt Dir einen Einmalcode per E-Mail. Auf Deinem Gerät bleibt die Sitzung gespeichert, damit Du angemeldet bleibst.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Dein Profil und Deine Beiträge',
        paragraphs: [
          'Wir speichern Deinen Decknamen, Dein Profilbild, Deine Ansprache, Deinen Kiez (als Text, zum Beispiel „Prenzlauer Berg, 10435 Berlin“), Deine Einstellungen und die Zeitpunkte Deiner Zustimmung zu diesen Bedingungen.',
          'Zu Challenges speichern wir Titel, Text, Fotos, Ort als Text, Frist, Bounty, Status und einen auf rund 100 Meter gerundeten Punkt. Dazu kommen Kommentare, Likes, private Operationsnamen und Gruppen samt Mitgliedschaft.',
          'Andere angemeldete Personen sehen Deinen Decknamen, Dein Profilbild, Deinen Kiez, Deine Challenges und Kommentare. Challenges in Gruppen sehen nur die Mitglieder der Gruppe. Fotos liegen unter einer öffentlichen Adresse. Wer diese Adresse kennt, kann das Foto auch ohne Konto öffnen.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Dein Standort bleibt auf Deinem Gerät',
        paragraphs: [
          'Gibst Du den Standort frei, ermittelt Dein Handy daraus Ortsteil, Postleitzahl und Straße. Dafür nutzt es den Ortsdienst des Betriebssystems (Apple bei iPhone, Google bei Android). Kiez Coins speichert Deinen genauen Standort nicht. Gespeichert wird nur der Kiez als Text und bei Challenges der gerundete Punkt. Entfernungen im Feed berechnet Dein Handy selbst.',
          'In der Web-App fragt Dein Browser Kiez und Straße bei OpenStreetMap ab (Dienst Nominatim der OpenStreetMap Foundation, Vereinigtes Königreich). Er schickt dafür nur den auf etwa 100 Meter gerundeten Punkt, technisch bedingt auch Deine IP-Adresse. Grundlage ist Deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) und der Angemessenheitsbeschluss der EU für das Vereinigte Königreich.',
          'Die Freigabe ist freiwillig und lässt sich jederzeit in den Einstellungen Deines Handys oder Browsers zurücknehmen. Ohne Freigabe trägst Du Deinen Kiez von Hand ein.',
        ],
      },
      {
        heading: 'Zahlungsdaten gibst Du gezielt frei',
        paragraphs: [
          'Kontoinhaberin oder Kontoinhaber, IBAN und PayPal-Adresse speichern wir nur, wenn Du sie einträgst. Sie sind privat. Für eine Bounty gibst Du sie genau der Person frei, die Dir die Bounty zahlt. Kiez Coins wickelt keine Zahlungen ab.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Meldungen, Support und Sicherheit',
        paragraphs: [
          'Meldest Du eine Person oder schreibst Du dem Support, speichern wir Deine Nachricht, um sie zu bearbeiten. Zum Schutz vor Missbrauch speichert unser Hosting-Dienst technische Protokolle mit IP-Adresse und Zeitpunkt für kurze Zeit.',
          'Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren, fairen Betrieb (Art. 6 Abs. 1 lit. f DSGVO) und die Bearbeitung von Meldungen nach dem Digital Services Act (Art. 6 Abs. 1 lit. c DSGVO).',
        ],
      },
      {
        heading: 'Diese Dienste verarbeiten Daten in unserem Auftrag',
        paragraphs: [
          'Supabase Inc. hostet Datenbank, Anmeldung und Fotos. Die Server stehen in der EU (Paris, Frankreich). Für mögliche Zugriffe aus den USA gelten EU-Standardvertragsklauseln.',
          'Brevo (Sendinblue SAS, Paris, Frankreich) verschickt die E-Mails mit Anmeldecodes. Brevo erhält dafür Deine E-Mail-Adresse und den Code.',
          'Vercel Inc. (USA) liefert die Download-Seite und die Web-App aus und verarbeitet dafür Deine IP-Adresse. Grundlage sind das EU-US Data Privacy Framework und EU-Standardvertragsklauseln.',
          'Mit diesen Diensten besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.',
        ],
      },
      {
        heading: 'So lange bleiben Deine Daten',
        paragraphs: [
          'Deine Daten bleiben, bis Du Dein Konto löschst. „Konto löschen“ entfernt Konto, Profil, Fotos, Challenges, Kommentare, Zahlungsdaten, Meldungen und Support-Anfragen sofort. Reste in Sicherungskopien verschwinden, wenn Supabase diese turnusmäßig überschreibt.',
          'Am Ende der Testphase können wir alle Daten löschen. Darüber informieren wir Dich vorher per E-Mail.',
        ],
      },
      {
        heading: 'Deine Rechte',
        paragraphs: [
          `Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Schreib dafür an ${email} oder nutze den Support in der App. Vieles änderst oder löschst Du direkt unter „Dein Konto“.`,
          `Du kannst Dich bei einer Datenschutz-Aufsichtsbehörde beschweren. Zuständig für uns ist: ${authority}.`,
        ],
      },
      {
        heading: 'Alter',
        paragraphs: ['Kiez Coins ist für Personen ab 18 Jahren. Wir verarbeiten keine Daten von Kindern.'],
      },
    ],
  },

  bedingungen: {
    title: 'Nutzungsbedingungen',
    intro: 'Diese Bedingungen gelten für die kostenlose Testphase von Kiez Coins.',
    sections: [
      {
        heading: '1. Anbieterin und Testbetrieb',
        paragraphs: [
          `Kiez Coins betreibt ${name} (Anschrift im Impressum). Die App ist eine Testversion und kostenlos. Funktionen können sich ändern, ausfallen oder wegfallen. Am Ende der Testphase können wir Daten zurücksetzen und kündigen das vorher per E-Mail an.`,
        ],
      },
      {
        heading: '2. Konto',
        paragraphs: [
          'Mitmachen dürfen Personen ab 18 Jahren. Jede Person hat ein Konto und hält ihre Zugangsdaten geheim. Die E-Mail-Adresse muss Dir gehören und erreichbar sein.',
        ],
      },
      {
        heading: '3. So gehen wir miteinander um',
        paragraphs: [
          'Du stellst nur Challenges, Fotos und Kommentare ein, die Du einstellen darfst. Verboten sind rechtswidrige, beleidigende, diskriminierende oder gefährliche Inhalte, Werbung, Spam und Fotos von Menschen ohne deren Einverständnis.',
          'Challenges beschreiben kleine, sichere Hilfen in der Nachbarschaft. Aufgaben, die eine Erlaubnis, eine Ausbildung oder besondere Gefahr voraussetzen (zum Beispiel Arbeiten an Strom, Gas oder auf Dächern), gehören nicht in die App.',
          'Für das Anzeigen in der App räumst Du uns ein einfaches, kostenloses Recht an Deinen Inhalten ein. Es endet, wenn Du den Inhalt oder Dein Konto löschst.',
        ],
      },
      {
        heading: '4. Bounties laufen direkt zwischen Euch',
        paragraphs: [
          'Eine Bounty ist eine freiwillige Anerkennung zwischen zwei Personen. Kiez Coins ist nicht Vertragspartei, nimmt kein Geld an und zahlt keins aus. Das Geld fließt direkt per Überweisung oder PayPal. Barzahlung und Treffen zur Zahlung sind nicht vorgesehen.',
          'Jede Person ist selbst dafür verantwortlich, eine Aufgabe sorgfältig zu erledigen, eine zugesagte Bounty zu zahlen und Einnahmen gegebenenfalls zu versteuern. Eine Challenge begründet kein Arbeitsverhältnis.',
        ],
      },
      {
        heading: '5. Melden und Moderation',
        paragraphs: [
          'Über „Person melden“ oder per E-Mail meldest Du Verstöße und rechtswidrige Inhalte. Wir prüfen jede Meldung und entfernen Inhalte, die gegen diese Bedingungen oder geltendes Recht verstoßen. Bei Verstößen können wir ein Konto sperren oder das Anbieten von Bounties beschränken. Wir begründen solche Entscheidungen per E-Mail. Du kannst ihnen per E-Mail widersprechen.',
        ],
      },
      {
        heading: '6. Haftung',
        paragraphs: [
          'Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden an Leben, Körper und Gesundheit. Sonst haften wir für den kostenlosen Testbetrieb nicht. Für Absprachen, Aufgaben und Zahlungen zwischen Nutzerinnen und Nutzern haften die beteiligten Personen.',
        ],
      },
      {
        heading: '7. Ende der Nutzung',
        paragraphs: [
          'Du kannst Dein Konto jederzeit unter „Dein Konto“ löschen. Wir können die Testphase jederzeit beenden und kündigen das vorher per E-Mail an.',
        ],
      },
      {
        heading: '8. Änderungen und Recht',
        paragraphs: [
          'Ändern sich diese Bedingungen, informieren wir Dich in der App oder per E-Mail. Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften Deines Wohnsitzlandes bleiben unberührt.',
        ],
      },
    ],
  },
};

/** Alle offenen Angaben, zum Prüfen vor der Veröffentlichung. */
export const openLegalFields = (Object.keys(OPERATOR) as (keyof typeof OPERATOR)[]).filter((key) => !OPERATOR[key].trim());
