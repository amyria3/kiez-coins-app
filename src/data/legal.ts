/**
 * Rechtstexte für den Testbetrieb: Impressum, Datenschutzerklärung, Nutzungsbedingungen, Community-Regeln.
 * Angezeigt unter `legal/[doc]`, verlinkt in `onboarding/welcome`, `onboarding/code-of-conduct` und `account`.
 *
 * Offene Angaben stehen als „[offen: …]“ im Text, bis Daria sie in `OPERATOR` einträgt.
 * Ändern sich Inhalte, bekommt `LEGAL_STAND` ein neues Datum.
 */

/** Stand aller Texte (TT.MM.JJJJ). */
export const LEGAL_STAND = '23.11.2026';

/** Angaben zur Anbieterin. Leere Felder erscheinen in der App als „[offen: …]“. */
export const OPERATOR = {
  name: 'Maria Arkadieff',
  /** Ladungsfähige Geschäftsadresse bei Online-Impressum, kein Postfach (Daria, 15.11.2026). */
  street: 'c/o Online-Impressum 13086\nEuroparing 90',
  city: '53757 Sankt Augustin',
  /** Postfach bei Proton für Impressum, Datenschutz und Meldungen (Daria, 15.11.2026). */
  email: 'kontakt@kiezcoins.de',
  /** Zweiter schneller Kontaktweg nach § 5 DDG: Telefon oder Kontaktformular. */
  phone: '',
  /** Zuständige Datenschutz-Aufsichtsbehörde am Wohnort der Anbieterin in Sachsen (Daria, 15.11.2026). Nicht am Ort der c/o-Adresse. */
  authority: 'Die Sächsische Datenschutz- und Transparenzbeauftragte, Devrientstraße 5, 01067 Dresden',
};

const open = (value: string, what: string) => (value.trim() ? value.trim() : `[offen: ${what}]`);

const name = OPERATOR.name;
/** Ohne eingetragene Anschrift nennt der Text sie auf Anfrage (Schutz der Wohnadresse, bis eine c/o-Adresse steht). */
const hasAddress = Boolean(OPERATOR.street.trim() && OPERATOR.city.trim());
const onRequest = 'Die ladungsfähige Anschrift teilen wir bei berechtigtem Interesse auf Anfrage per E-Mail mit.';
const email = open(OPERATOR.email, 'E-Mail-Adresse');
const phone = open(OPERATOR.phone, 'Telefonnummer');
const authority = open(OPERATOR.authority, 'Datenschutz-Aufsichtsbehörde');

export type LegalSection = { heading?: string; paragraphs: string[] };
export type LegalDoc = { title: string; intro?: string; sections: LegalSection[] };
export type LegalDocId = 'impressum' | 'datenschutz' | 'bedingungen' | 'regeln';

export const legalDocIds: LegalDocId[] = ['regeln', 'bedingungen', 'datenschutz', 'impressum'];

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
          `Behörden, die EU-Kommission und Nutzer:innen erreichen uns unter ${email}, auf Deutsch oder Englisch. Rechtswidrige Inhalte meldest Du direkt in der App über die Fahne an Challenges und Kommentaren, über „Person melden“ im Profil oder per E-Mail.`,
        ],
      },
      {
        heading: 'Testbetrieb',
        paragraphs: ['KiezCoins ist eine kostenlose Testversion. Es gelten die Nutzungsbedingungen für die Testphase.'],
      },
    ],
  },

  datenschutz: {
    title: 'Datenschutz',
    intro: 'Hier steht, welche Daten KiezCoins verarbeitet, wozu und wie lange. KiezCoins schaltet selbst keine Werbung und nutzt kein Tracking und keine Analyse-Werkzeuge.',
    sections: [
      {
        heading: 'Verantwortlich ist die Anbieterin',
        paragraphs: [hasAddress ? `${name}, ${OPERATOR.street.trim().replace(/\n/g, ', ')}, ${OPERATOR.city.trim()}, E-Mail: ${email}` : `${name}, E-Mail: ${email}`],
      },
      {
        heading: 'Dein Konto',
        paragraphs: [
          'Für das Konto speichern wir Deine E-Mail-Adresse und, wenn Du eines festlegst, Dein Passwort als verschlüsselten Hash. Die Anmeldung per Code sendet Dir einen Einmalcode per E-Mail. Auf Deinem Gerät bleibt die Sitzung gespeichert, damit Du angemeldet bleibst.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Dein Profil und Deine Beiträge',
        paragraphs: [
          'Wir speichern Deinen Decknamen, Dein Profilbild, Deine Ansprache, Deinen Kiez (als Text, zum Beispiel „Prenzlauer Berg, 10435 Berlin“), Deine Einstellungen und die Zeitpunkte Deiner Zustimmung zu diesen Bedingungen.',
          'Zu Challenges speichern wir Titel, Text, Fotos, Ort als Text, Frist, Coins, Status und einen auf rund 100 Meter gerundeten Punkt. Dazu kommen Kommentare, Likes, private Operationsnamen und Gruppen samt Mitgliedschaft.',
          'Andere angemeldete Personen sehen Deinen Decknamen, Dein Profilbild, Deinen Kiez, Deine Challenges und Kommentare. Challenges in Gruppen sehen nur die Mitglieder der Gruppe, private Posts nur Du. Fotos aus öffentlichen Posts liegen unter einer öffentlichen Adresse. Wer diese Adresse kennt, kann das Foto auch ohne Konto öffnen. Fotos aus privaten Posts, aus Gruppen und aus sehr privaten Posts liegen in einem geschützten Speicher. Die App zeigt sie nur Personen, die den Post sehen dürfen, über Links, die 24 Stunden gelten.',
          'Mit „Sehr privat“ legst Du für jeden Post fest, dass niemand ihn teilen kann. Dann gibt es keinen Teilen-Knopf und keine öffentliche Seite. Schaltest Du „Sehr privat“ später ein, bekommen die Fotos neue Adressen, und schon versendete Links funktionieren nicht mehr. Kopien, die jemand vorher gespeichert oder weitergepostet hat, können wir nicht zurückholen.',
          'Teilst Du einen eigenen öffentlichen Post, steht er mit Foto, Deckname, Kiez, Titel und Text unter kiezcoins.de/c/ im Internet, auch für Menschen ohne Konto, solange der Post öffentlich ist. Suchmaschinen nehmen diese Seite nicht auf. Messenger zeigen beim Teilen eine Vorschau. Besuche der Seite zählen wir ohne Kennung.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Dein Standort bleibt auf Deinem Gerät',
        paragraphs: [
          'Gibst Du den Standort frei, ermittelt Dein Handy daraus Ortsteil, Postleitzahl und Straße. Dafür nutzt es den Ortsdienst des Betriebssystems (Apple bei iPhone, Google bei Android). KiezCoins speichert Deinen genauen Standort nicht. Gespeichert wird nur der Kiez als Text und bei Challenges der gerundete Punkt. Entfernungen im Feed berechnet Dein Handy selbst.',
          'In der Web-App fragt Dein Browser Kiez und Straße bei OpenStreetMap ab (Dienst Nominatim der OpenStreetMap Foundation, Vereinigtes Königreich). Er sendet dafür nur den auf etwa 100 Meter gerundeten Punkt, technisch bedingt auch Deine IP-Adresse. Grundlage ist Deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) und der Angemessenheitsbeschluss der EU für das Vereinigte Königreich.',
          'Die Freigabe ist freiwillig und lässt sich jederzeit in den Einstellungen Deines Handys oder Browsers zurücknehmen. Ohne Freigabe trägst Du Deinen Kiez von Hand ein.',
          'Tippst Du bei einer Erinnerung einen Ort ein, schlägt die App passende Orte vor. Dafür sendet sie den getippten Text an Photon, einen Suchdienst der komoot GmbH (Deutschland) mit Daten von OpenStreetMap. Damit nahe Orte oben stehen, sendet sie einen auf etwa 10 Kilometer gerundeten Punkt mit: Deinen Standort, wenn Du ihn freigegeben hast, sonst Deinen Kiez. Technisch bedingt erhält der Dienst auch Deine IP-Adresse. Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      // Nachrichten, Routine, Kalender und Weiterposten (Daria, 2026-11-14: fehlten bisher)
      {
        heading: 'Nachrichten an Freund:innen',
        paragraphs: [
          'Nachrichten kannst Du nur Personen senden, mit denen Du befreundet bist. Wir speichern Absender:in, Empfänger:in, Text und Zeitpunkte. Lesen können sie in der App nur Ihr beide. Nach einem Monat löschen wir Nachrichten automatisch.',
          'Das Team öffnet einen Chat nur bei einer Meldung oder einem Hinweis auf Missbrauch. Jedes Öffnen wird dauerhaft mit Zeitpunkt, Person und Grund protokolliert.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO), für das Öffnen bei Meldungen unser berechtigtes Interesse an einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO).',
        ],
      },
      {
        heading: 'Deine Erinnerungen sind privat',
        paragraphs: [
          'Für Erinnerungen und Termine in Routine speichern wir Titel, Beschreibung, Tag, Uhrzeit, Ort, Telefon und Link, soweit Du sie einträgst, und wann Du etwas erledigt, abgesagt oder gelöscht hast. Nur Du siehst sie.',
          'Was Du auf „später“ schiebst und welche importierten Termine Du ausblendest, merkt sich nur Dein Gerät.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Kalender verbindest Du selbst',
        paragraphs: [
          'Termine exportieren: Du bekommst einen persönlichen, geheimen Abo-Link. Dein Kalenderdienst, zum Beispiel Apple, Google oder Microsoft, ruft darüber regelmäßig Deine Termine aus KiezCoins ab und speichert sie nach seinen eigenen Regeln. Wer den Link kennt, sieht Deine Termine. „Neuen Link erstellen“ macht den alten ungültig, ausgeschaltet liefert der Link keine Termine mehr.',
          'Termine anzeigen über einen Link: Wir speichern die iCal-Adresse und den Namen, den Du dem Kalender gibst. Öffnest Du Routine, ruft unser Server bei Supabase die Adresse ab und sendet die Termine der nächsten 60 Tage an Deine App. Die Termine selbst speichern wir nicht. Der Kalenderdienst sieht dabei die Anfrage unseres Servers, nicht Deine IP-Adresse.',
          'Kalender auf dem Handy (Android): Gibst Du den Zugriff frei, liest die App die gewählten Kalender direkt auf dem Gerät. Die Termine verlassen Dein Handy nicht. Den Zugriff nimmst Du in den Einstellungen des Handys zurück.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Weiterposten nur auf Deinen Wunsch',
        paragraphs: [
          'Verbindest Du ein Konto bei BlueSky, Mastodon, Instagram oder Facebook, speichern wir Deinen Namen dort, die Adresse des Dienstes und den Zugang. Den Zugang speichern wir verschlüsselt.',
          'Teilst Du einen Post über „Weiterposten“, senden wir Titel, Text, Foto und den Link zu Deinem Post an diesen Dienst. Dort gelten dessen Datenschutzregeln. Meta (Instagram, Facebook) verarbeitet Daten auch in den USA. „Trennen“ löscht den Zugang bei uns.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      // Schaufenster für Läden, Vereine und Clubs (Rechtsprüfung 11.11.2026, Documentation, kiez-coins/offen/2026-11-11_offen_schaufenster-recht.md)
      {
        heading: 'Schaufenster sind öffentlich',
        paragraphs: [
          'Für ein Schaufenster speichern wir Name, Kurzname, Logo, Titelbild, Kurztext, Services, Kiez, Adresse, Links, Öffnungszeiten, Impressum, Hintergrundfarbe, Sichtbarkeit, Posts und Termine. Dazu kommen, wer dem Schaufenster folgt, wer Zugang anfragt oder eingeladen ist und wer einen Termin gespeichert hat. Das Team sieht nur die Zahl der Speichernden, keine Namen.',
          'Ein öffentliches Schaufenster sieht jede Person im Internet unter kiezcoins.de/s/, auch ohne Konto. Suchmaschinen wie Google dürfen die Seite aufnehmen. Das gilt auch für Namen und Anschrift im Impressum. Die Adresse des Schaufensters sehen in der App nur Personen mit Zugang. Ein Schaufenster „nur für Eingeladene“ zeigt Posts und Termine nur dem Team und den Eingeladenen.',
          'Herzen an Terminen zählen wir ohne Kennung. Dein Browser merkt sich auf Deinem Gerät, welche Termine Du geliked hast. Das ist technisch nötig, damit das Herz gefüllt bleibt (§ 25 Abs. 2 Nr. 2 TDDDG).',
          // Zahlen fürs Team (2026-11-23, Migration 20261123000100_schaufenster_zahlen)
          'Für das Team zählen wir, wie oft ein öffentliches Schaufenster und seine Visitenkarte aufgerufen werden, wie oft jemand die Visitenkarte in die eigenen Kontakte speichert und wie oft jemand dem Schaufenster den eigenen Kontakt sendet. Gespeichert wird nur eine Zahl pro Tag, ohne Kennung, ohne IP-Adresse und ohne etwas auf Deinem Gerät. Das Team sieht die Summen der letzten 30 Tage. Rechtsgrundlage ist unser berechtigtes Interesse, Teams zu zeigen, wie ihr Schaufenster ankommt (Art. 6 Abs. 1 lit. f DSGVO).',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Zahlungsdaten gibst Du gezielt frei',
        paragraphs: [
          'Kontoinhaberin oder Kontoinhaber, IBAN und PayPal-Adresse speichern wir nur, wenn Du sie einträgst. Sie sind privat. Für Coins gibst Du sie genau der Person frei, die Dir die Coins zahlt. KiezCoins wickelt keine Zahlungen ab.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
        ],
      },
      {
        heading: 'Meldungen, Support und Sicherheit',
        paragraphs: [
          'Meldest Du eine Person oder Challenge oder schreibst Du dem Support, speichern wir Deine Nachricht, um sie zu bearbeiten. Die gemeldete Person erfährt nicht, wer gemeldet hat. Blockierst Du eine Person, speichern wir, wen Du blockiert hast. Zollst Du Lob, speichern wir, wen Du gelobt hast. Andere sehen nur die Anzahl, nicht wer gelobt hat. Zum Schutz vor Missbrauch speichert unser Hosting-Dienst technische Protokolle mit IP-Adresse und Zeitpunkt für kurze Zeit. Legst Du ein Konto ohne E-Mail an, speichern wir einen Tag lang einen nicht umkehrbaren Fingerabdruck Deiner IP-Adresse, um Massenanmeldungen zu verhindern.',
          'Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren, fairen Betrieb (Art. 6 Abs. 1 lit. f DSGVO) und die Bearbeitung von Meldungen nach dem Digital Services Act (Art. 6 Abs. 1 lit. c DSGVO).',
        ],
      },
      {
        heading: 'Diese Dienste verarbeiten Daten in unserem Auftrag',
        paragraphs: [
          'Supabase Pte. Ltd. hostet Datenbank, Anmeldung und Fotos. Die Server stehen in der EU (Paris, Frankreich). Für mögliche Zugriffe aus den USA gelten EU-Standardvertragsklauseln.',
          'Brevo (Sendinblue SAS, Paris, Frankreich) versendet die E-Mails mit Anmeldecodes. Brevo erhält dafür Deine E-Mail-Adresse und den Code.',
          'Vercel Inc. (USA) liefert die Download-Seite und die Web-App aus und verarbeitet dafür Deine IP-Adresse. Grundlage sind das EU-US Data Privacy Framework und EU-Standardvertragsklauseln.',
          'Mit diesen Diensten besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.',
        ],
      },
      // Anonyme Zählung, z. B. welcher Kamera-Knopf häufiger gedrückt wird (Daria, 31.10.2026)
      {
        heading: 'Erheben von Nutzungsdaten',
        paragraphs: [
          'Wir zählen anonym, wie oft einzelne Knöpfe gedrückt werden, zum Beispiel welcher Kamera-Knopf häufiger genutzt wird. Gespeichert werden nur Knopf, gewählter Look und Zeitpunkt, ohne Konto, ohne Gerät und ohne IP-Adresse. Daraus lässt sich niemand erkennen. Weitere Nutzungsdaten erheben wir nicht.',
        ],
      },
      {
        heading: 'So lange bleiben Deine Daten',
        paragraphs: [
          'Deine Daten bleiben, bis Du Dein Konto löschst. „Konto löschen“ entfernt Konto, Profil, Fotos, Challenges, Kommentare, Nachrichten, Erinnerungen, verbundene Kalender und Konten fürs Weiterposten, Zahlungsdaten, Meldungen, Blockierungen, Lob und Support-Anfragen sofort. Reste in Sicherungskopien verschwinden, wenn Supabase diese turnusmäßig überschreibt.',
          'Am Ende der Testphase können wir alle Daten löschen. Darüber informieren wir Dich vorher per E-Mail.',
        ],
      },
      {
        heading: 'Deine Rechte',
        paragraphs: [
          `Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Schreibe dafür an ${email} oder nutze den Support in der App. Vieles änderst oder löschst Du direkt unter „Dein Konto“.`,
          `Du kannst Dich bei einer Datenschutz-Aufsichtsbehörde beschweren. Zuständig für uns ist: ${authority}.`,
        ],
      },
      {
        heading: 'Alter',
        paragraphs: ['KiezCoins ist für Personen ab 18 Jahren. Wir verarbeiten keine Daten von Kindern.'],
      },
    ],
  },

  bedingungen: {
    title: 'Nutzungsbedingungen',
    intro: 'Diese Bedingungen gelten für die kostenlose Testphase von KiezCoins.',
    sections: [
      {
        heading: '1. Anbieterin und Testbetrieb',
        paragraphs: [
          `KiezCoins betreibt ${name}${hasAddress ? ' (Anschrift im Impressum)' : `, erreichbar unter ${email}`}. Die App ist eine Testversion und kostenlos. Funktionen können sich ändern, ausfallen oder wegfallen. Am Ende der Testphase können wir Daten zurücksetzen und kündigen das vorher per E-Mail an.`,
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
          'Es gelten die Community-Regeln. Du stellst nur Challenges, Fotos und Kommentare ein, die Du einstellen darfst. Verboten sind rechtswidrige, beleidigende, diskriminierende oder gefährliche Inhalte, Spam und Fotos von Menschen ohne deren explizites Einverständnis. Werbung ist nur im Schaufenster und in seinen Posts erlaubt.',
          'Challenges beschreiben kleine, sichere Hilfen in der Nachbarschaft. Aufgaben, die eine Erlaubnis, eine Ausbildung oder besondere Gefahr voraussetzen (zum Beispiel Arbeiten an Strom, Gas oder auf Dächern), gehören nicht in die App.',
          'Für das Anzeigen in der App räumst Du uns ein einfaches, kostenloses Recht an Deinen Inhalten ein. Für Inhalte eines öffentlichen Schaufensters gilt dieses Recht auch für die Seite unter kiezcoins.de und für Suchmaschinen. Es endet, wenn Du den Inhalt oder Dein Konto löschst.',
        ],
      },
      {
        heading: '4. Schaufenster für Läden, Vereine und Clubs',
        paragraphs: [
          'Mit einem Schaufenster stellen Läden, Vereine und Clubs sich, ihre Posts und Termine vor. Wer ein Schaufenster geschäftsmäßig betreibt, trägt ein eigenes Impressum ein (§ 5 Digitale-Dienste-Gesetz) und ist für Angaben, Angebote, Termine und Werbung selbst verantwortlich. Werbung muss als solche erkennbar sein.',
          'Logos, Fotos und Texte stellst Du nur ein, wenn Du die Rechte daran hast. Verträge über Waren, Dienstleistungen oder Termine schließt Du direkt mit Deinen Kund:innen; KiezCoins ist nicht Vertragspartei.',
          'Ein öffentliches Schaufenster ist ohne Anmeldung im Internet sichtbar und kann in Suchmaschinen erscheinen.',
        ],
      },
      {
        heading: '5. Coins laufen direkt zwischen Euch',
        paragraphs: [
          'Coins sind Versprechen von realem Geld. Das Konzept befindet sich in der Testphase. KiezCoins ist nicht Vertragspartei, nimmt kein Geld an und zahlt keins aus. Das Geld fließt direkt per Überweisung oder PayPal. Barzahlung und Treffen zur Zahlung sind nicht vorgesehen.',
          'Jede Person ist selbst dafür verantwortlich, eine Aufgabe sorgfältig zu erledigen, zugesagte Coins zu zahlen und Einnahmen gegebenenfalls zu versteuern. Eine Challenge begründet kein Arbeitsverhältnis.',
          'Edensteine sind eine ideelle Anerkennung. Sie lassen sich weder kaufen noch in Geld tauschen.',
        ],
      },
      {
        heading: '6. Melden und Moderation',
        paragraphs: [
          'Über die Fahne an Challenges und Kommentaren, über „Person melden“ oder per E-Mail meldest Du Verstöße und rechtswidrige Inhalte. Wir prüfen jede Meldung und entfernen Inhalte, die gegen diese Bedingungen oder geltendes Recht verstoßen. Bei Verstößen können wir ein Konto sperren oder das Anbieten von Coins beschränken. Wir begründen solche Entscheidungen per E-Mail. Du kannst ihnen per E-Mail widersprechen.',
        ],
      },
      {
        heading: '7. Haftung',
        paragraphs: [
          'Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden an Leben, Körper und Gesundheit. Sonst haften wir für den kostenlosen Testbetrieb nicht. Für Absprachen, Aufgaben und Zahlungen zwischen Nutzer:innen haften die beteiligten Personen.',
        ],
      },
      {
        heading: '8. Ende der Nutzung',
        paragraphs: [
          'Du kannst Dein Konto jederzeit unter „Dein Konto“ löschen. Wir können die Testphase jederzeit beenden und kündigen das vorher per E-Mail an.',
        ],
      },
      {
        heading: '9. Änderungen und Recht',
        paragraphs: [
          'Ändern sich diese Bedingungen, informieren wir Dich in der App oder per E-Mail. Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften Deines Wohnsitzlandes bleiben unberührt.',
        ],
      },
    ],
  },

  regeln: {
    title: 'Community-Regeln',
    intro:
      'Die Idee hinter KiezCoins ist, dass Menschen glücklicher und gesünder sind, wenn sie miteinander kooperieren und robuste soziale Netzwerke bilden. Das setzt gegenseitige Achtung voraus. Missbräuchliches Verhalten, Sexismus, Übergriffe, Antisemitismus, politischer oder religiöser Fundamentalismus, Rassismus und Behindertenfeindlichkeit werden nicht toleriert.',
    sections: [
      {
        heading: 'Respekt gilt für alle',
        paragraphs: [
          'Wir begegnen allen Menschen mit Respekt: unabhängig von Herkunft, Hautfarbe, Religion, Geschlecht, sexueller Orientierung, geschlechtlicher Identität, Behinderung, Alter und sozialer Lage.',
        ],
      },
      {
        heading: 'Diskriminierung hat hier keinen Platz',
        paragraphs: [
          'Diskriminierung ist in Worten, Bildern, Symbolen und Codes verboten. Verfassungsfeindliche Kennzeichen, Volksverhetzung und das Leugnen oder Verharmlosen des Holocaust zeigen wir an.',
        ],
      },
      {
        heading: 'Belästigung und Bedrohung sind verboten',
        paragraphs: [
          'Verboten sind Beleidigungen, Bedrohungen, Einschüchterung, sexuelle Belästigung, Stalking und Bloßstellen.',
          'Private Daten anderer (Adresse, Klarname, Telefonnummer) dürfen niemals veröffentlicht werden. Fotos dürfen ausschließlich mit dem expliziten Einverständnis der Person veröffentlicht werden. Ein Nein beendet den Kontakt.',
        ],
      },
      {
        heading: 'Gewalt bleibt draußen',
        paragraphs: [
          'Physische und verbale Gewalt werden nicht toleriert, ebenso wenig Aufrufe zu und Verherrlichung jener. Challenges dürfen niemanden gefährden, nicht einmal Dich selbst.',
          'Herausforderungen mit Waffen, Drogen, Feuer oder besonderer Gefahr gehören nicht hierher.',
        ],
      },
      {
        heading: 'KiezCoins baut auf gegenseitiges Vertrauen',
        paragraphs: [
          'Ein Profil gehört zu einem echten Menschen oder einer Gruppe echter Menschen. KI-generierte Posts sind nicht erwünscht. Fake-Profile, Täuschung und Spam sind verboten.',
        ],
      },
      {
        heading: 'Gemeinschaft braucht Verlässlichkeit',
        paragraphs: ['Erledigte Aufgaben meldest Du wahrheitsgemäß als erledigt, sonst bleibt der Spaß auf der Strecke.'],
      },
      {
        heading: 'Fotos zeigen Orte, Ergebnisse und Erlebnisse',
        paragraphs: [
          'Bilder von erkennbaren Menschen dürfen nur mit deren explizitem Einverständnis online gehen. Pornografische Inhalte und Nacktheit sind nicht erwünscht.',
        ],
      },
      {
        heading: 'Kinder',
        paragraphs: [
          'Kinder dürfen die App nutzen, wenn Du sie als Elternteil oder Lehrkraft zu einer Gruppe hinzufügst. Du darfst Fotos Deiner Kinder posten, wenn sie sich damit wohlfühlen und damit einverstanden sind. Du darfst keine fremden Kinder ansprechen – besser Vorsicht als Nachsicht.',
        ],
      },
      {
        heading: 'So meldest Du einen Verstoß',
        paragraphs: [
          'Tippe auf die Fahne an einer Challenge oder einem Kommentar oder auf „Person melden“ im Profil. Die gemeldete Person erfährt nicht, wer sie gemeldet hat. Beabsichtigte Falschmeldungen sind selbst ein Verstoß.',
          'Rufe bei akuter Gefahr die Polizei unter 110 oder den Rettungsdienst unter 112.',
          `Für alles andere erreichst Du uns unter ${email}.`,
        ],
      },
      {
        heading: 'Blockieren schützt Dich unmittelbar',
        paragraphs: [
          'Im Profil einer Person tippst Du auf „Person blockieren“. Du siehst ihre Challenges und Kommentare dann nicht mehr und sie kann Deine Challenges weder annehmen noch kommentieren. Sie erfährt nicht den Grund. Unter „Dein Konto“ kannst Du die Blockierung wieder aufheben.',
        ],
      },
      {
        heading: 'So reagiert die Moderation',
        paragraphs: [
          'Wir prüfen Meldungen zeitnah. Bei Verstößen entfernen wir Inhalte, verwarnen, beschränken oder sperren das Konto, bei schweren Verstößen sofort und dauerhaft. Straftaten zeigen wir an.',
          'Unsere Entscheidung begründen wir per E-Mail. Du kannst ihr per E-Mail widersprechen, wir prüfen den Fall dann erneut.',
        ],
      },
      {
        paragraphs: ['Let’s have fun & do some good', 'Cat The Käptn'],
      },
    ],
  },
};
