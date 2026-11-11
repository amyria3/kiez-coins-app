# Schaufenster: Rechtstexte und rechtliche Lücken

- Zweck: Ergebnis der Rechtsprüfung des Schaufensters mit Textvorschlägen für Datenschutzerklärung und Nutzungsbedingungen.
- Stand: 11.11.2026
- Auftrag: Daria, 11.11.2026: „prüfe die Rechtskonformität (ignoriere die Tatsache, dass ich keine Adresse angegeben habe)“
- Arbeitsteilung: Claude hat Code, Rechtstexte (`src/data/legal.ts`) und die öffentliche Seite (`api/s.mjs`) geprüft und die Vorschläge umgesetzt. Daria hat entschieden. Die Prüfung ersetzt keine anwaltliche Beratung.
- Umgesetzt am 11.11.2026 (Daria: „5 ist ok, den Rest beheben“): Nutzungsbedingungen und Datenschutzerklärung wie unten vorgeschlagen, in allen Sprachen, Stand 11.11.2026; Absatz „Erheben von Nutzungsdaten“ präzisiert; Datenschutzhinweis mit Link auf `kiezcoins.de/schaufenster`; Impressum-Link oben auf der öffentlichen Seite, Fußzeile „Impressum KiezCoins“. Bewusst nicht gebaut: Hinweis bei fehlendem Impressum (Punkt 5).
- Ziel in Documentation: `kiez-coins/konzept/Schaufenster.md`, Abschnitt „Recht“

## Die Rechtstexte decken das Schaufenster nicht ab

### Nutzungsbedingungen verbieten, was das Schaufenster erlaubt

- Abschnitt 3 verbietet „Werbung“. Das Schaufenster ist für Werbung gedacht (Entscheidung Daria, 10.11.2026). Wer heute einen Laden bewirbt, verstößt gegen die eigenen Bedingungen.
- Abschnitt 3 räumt ein Recht „für das Anzeigen in der App“ ein. Das Schaufenster zeigt Inhalte zusätzlich auf `kiezcoins.de/s/<kurzname>`, für Suchmaschinen und künftig beim Weiterposten. Dafür fehlt das Nutzungsrecht.
- Es fehlen Regeln für Läden und Vereine: eigenes Impressum, Kennzeichnung von Werbung, Rechte an Logo und Fotos, Verantwortung für Angebote und Termine.

Vorschlag für Abschnitt 3, Absatz 1 und 3:

> Es gelten die Community-Regeln. Du stellst nur Challenges, Fotos und Kommentare ein, die Du einstellen darfst. Verboten sind rechtswidrige, beleidigende, diskriminierende oder gefährliche Inhalte, Spam und Fotos von Menschen ohne deren explizites Einverständnis. Werbung ist nur im Schaufenster und in seinen Posts erlaubt.

> Für das Anzeigen in der App räumst Du uns ein einfaches, kostenloses Recht an Deinen Inhalten ein. Für Inhalte eines öffentlichen Schaufensters gilt dieses Recht auch für die Seite unter kiezcoins.de und für Suchmaschinen. Es endet, wenn Du den Inhalt oder Dein Konto löschst.

Vorschlag für einen neuen Abschnitt „Schaufenster für Läden, Vereine und Clubs“:

> Mit einem Schaufenster stellen Läden, Vereine und Clubs sich, ihre Posts und Termine vor. Wer ein Schaufenster geschäftsmäßig betreibt, trägt ein eigenes Impressum ein (§ 5 Digitale-Dienste-Gesetz) und ist für Angaben, Angebote, Termine und Werbung selbst verantwortlich. Werbung muss als solche erkennbar sein. Logos, Fotos und Texte stellst Du nur ein, wenn Du die Rechte daran hast. Verträge über Waren, Dienstleistungen oder Termine schließt Du direkt mit Deinen Kund:innen; KiezCoins ist nicht Vertragspartei. Ein öffentliches Schaufenster ist ohne Anmeldung im Internet sichtbar und kann in Suchmaschinen erscheinen.

### Die Datenschutzerklärung beschreibt das Schaufenster nicht

- Die Einleitung sagt: „KiezCoins nutzt keine Werbung“. Mit dem Schaufenster erscheint Werbung von Läden. Der Satz bleibt richtig, wenn er von KiezCoins selbst spricht.
- „Andere angemeldete Personen sehen …“ stimmt für öffentliche Schaufenster nicht mehr: Kopf, Posts, Termine und Impressum sieht jede Person im Internet, Suchmaschinen eingeschlossen (`meta robots` index, `sitemap.xml`, JSON-LD).
- Das Impressum eines Einzelunternehmens enthält Name und Anschrift einer Person. Die Erklärung muss sagen, dass diese Angaben öffentlich und in Suchmaschinen erscheinen.
- Nicht beschrieben sind: Folgen, Zugangsanfragen und Einladungen, gespeicherte Termine samt Zahl der Speichernden, Herzen an Terminen und der Merker im Browser (`localStorage` „kc-termin-herzen“).
- Der Absatz „Erheben von Nutzungsdaten“ („Wir behalten uns vor, anonymisiert Nutzerdaten zu erheben“) nennt weder Zweck noch Rechtsgrundlage noch Dienst. Er gilt für die ganze App. Entweder präzisieren (was, womit, wozu) oder streichen, solange nichts erhoben wird.

Vorschlag für Einleitung:

> Hier steht, welche Daten KiezCoins verarbeitet, wozu und wie lange. KiezCoins schaltet selbst keine Werbung und nutzt kein Tracking und keine Analyse-Werkzeuge.

Vorschlag für einen neuen Abschnitt „Schaufenster“:

> Für ein Schaufenster speichern wir Name, Kurzname, Logo, Titelbild, Kurztext, Services, Kiez, Adresse, Links, Öffnungszeiten, Impressum, Hintergrundfarbe, Sichtbarkeit, Posts und Termine. Dazu kommen, wer dem Schaufenster folgt, wer Zugang anfragt oder eingeladen ist und wer einen Termin gespeichert hat. Das Team sieht nur die Zahl der Speichernden, keine Namen.
>
> Ein öffentliches Schaufenster sieht jede Person im Internet unter kiezcoins.de/s/<Name>, auch ohne Konto. Suchmaschinen wie Google dürfen die Seite aufnehmen. Das gilt auch für Namen und Anschrift im Impressum. Die Adresse sehen in der App nur Personen mit Zugang. Ein Schaufenster „nur für Eingeladene“ zeigt Posts und Termine nur dem Team und den Eingeladenen.
>
> Herzen an Terminen zählen wir ohne Kennung. Dein Browser merkt sich auf Deinem Gerät, welche Termine Du geliked hast. Das ist technisch nötig, damit das Herz gefüllt bleibt (§ 25 Abs. 2 Nr. 2 TDDDG).
>
> Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).

### Datenschutzhinweis fehlt auf der Anmeldeseite

- `kiezcoins.de/schaufenster` fragt zuerst die E-Mail-Adresse ab und legt damit ein Konto an. Die Zustimmung zu Bedingungen und Datenschutz kommt erst danach.
- Art. 13 DSGVO verlangt die Information bei der Erhebung. Ein Satz unter dem E-Mail-Feld mit Link genügt: „Mit dem Code legst Du ein Konto an. Wie KiezCoins Deine Daten verarbeitet, steht in der Datenschutzerklärung.“
- Das ist eine Code-Änderung (Link unter dem Feld); Claude baut sie auf Wunsch.

## Die öffentliche Seite braucht kleine Änderungen

- **Zwei Impressen auf einer Seite.** Das Impressum des Ladens steht ganz unten nach bis zu 30 Einträgen. Die Fußzeile darunter verlinkt „Impressum“ von KiezCoins. Besucher:innen finden leicht das falsche. Vorschlag: ein Link „Impressum“ oben neben dem Namen, der zum Impressum des Ladens springt, und in der Fußzeile „Impressum KiezCoins“.
- **Pflichtfeld fehlt.** Das Impressum ist freiwillig. Für Läden ist es Pflicht (§ 5 DDG). Vorschlag: Hinweis in der Übersicht „Dein Schaufenster“, solange ein öffentliches Schaufenster kein Impressum hat. Ein Zwang trifft auch Vereine und Clubs ohne Pflicht; deshalb nur ein Hinweis.
- **Werbung im Feed erkennbar machen.** Posts aus Schaufenstern erscheinen im Kiez-Feed mit dem Decknamen, der dem Ladennamen entspricht. Kommerzielle Inhalte müssen erkennbar sein (§ 5a Abs. 4 UWG). Die Pflicht trifft die Läden; KiezCoins hilft mit einem Etikett „Schaufenster“ am Post. Das deckt sich mit Teil 2 („Posts im Feed mit Name und Logo des Schaufensters“).

## Geprüft und ohne Befund

- Schriften der öffentlichen Seite liegen auf kiezcoins.de (`/fonts`), keine Google Fonts.
- Herzen an Terminen speichern keine Kennung in der Datenbank.
- Adresse, Ort und Einladungscode sind per Spaltenrechten geschützt (Migration `20261110000600`).
- Offline geschaltete und „nur für Eingeladene“ Schaufenster antworten öffentlich mit 404 und `noindex`.
- Digital Services Act: Art. 26 (Werbung kennzeichnen) und Art. 30 (Nachverfolgbarkeit von Händlern) gelten für Kleinst- und Kleinunternehmen nicht (Art. 19 DSA). Art. 30 betrifft außerdem nur Plattformen, auf denen Verbraucher:innen Fernabsatzverträge schließen.
- Barrierefreiheitsstärkungsgesetz: Kleinstunternehmen, die Dienstleistungen anbieten, sind ausgenommen (§ 3 Abs. 3 BFSG).
- Der Hinweis „Brauche ich ein Impressum?“ nennt jetzt alle Pflichtangaben nach § 5 DDG (11.11.2026, PR #283).

## Offene Punkte

- Daria: Die Nutzungsbedingungen haben sich geändert (Abschnitt 9 verlangt, dass Nutzer:innen in der App oder per E-Mail davon erfahren).
- Etikett „Schaufenster“ an Posts im Feed (Teil 2 in `2026-11-10_offen_schaufenster.md`).
- Vor dem ersten Abo: neue Fassung der Nutzungsbedingungen (heute „nimmt kein Geld an“), Preisangaben netto nur gegenüber Unternehmen.
