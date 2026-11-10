# Schaufenster für Unternehmen, Vereine und Organisator:innen

- Stand: 10.11.2026
- Status: Teil 1 gebaut am 10.11.2026 (Auftrag Daria: „Machen wir jetzt das Schaufenster nach Plan?“), erstmal nur für Moderatorinnen sichtbar. Wartet auf die Migration `20261110000400_schaufenster`.
- Ziel in Documentation: neue Datei `kiez-coins/konzept/Schaufenster.md`, Entscheidungen in `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Schaufenster“
- Arbeitsteilung: Daria entscheidet später über Abo und Rechtstexte. Claude baut Migration, App-Code und öffentliche Seite, schreibt die Doku und meldet sich vor dem Merge mit der Migration.

## Das Schaufenster ist die öffentliche Seite einer Gruppe

Daria hat das Schaufenster am 10.11.2026 so beschrieben: Alle dürfen es sehen, oder nur eingeladene Personen. Es zeigt nur die neuesten Posts. Es erstellt Termine, und andere speichern Termine bei sich.

Das Schaufenster ist die erste kommerzielle Fläche in KiezCoins. Es ersetzt den Feature-Wunsch vom 09.11.2026: „Feed, besonders für Kleinunternehmen und Vereine“ (`Übergabe/TODO.md`).

## Entscheidungen (Daria, 10.11.2026)

### Wer ein Schaufenster hat und pflegt

- Jede Gruppe darf ein Schaufenster anlegen, höchstens eins pro Gruppe.
- Im Schaufenster posten und Termine anlegen dürfen die Gründer:in der Gruppe und die Mitglieder, die sie dafür freischaltet.
- Niemand prüft ein Schaufenster vorab. Meldungen laufen über die Moderation wie bei Posts.
- Das Schaufenster zeigt Name, Logo, Titelbild, Kurztext, Kiez, Adresse, Webseite, Öffnungszeiten und Impressum.

### Wer das Schaufenster sieht

- **Öffentlich:** alle in der App, dazu eine Webseite `kiezcoins.de/s/<name>` ohne Anmeldung, nach dem Muster der geteilten Posts (`kiezcoins.de/c/<id>`, `api/c.mjs`).
- **Nur für Eingeladene:** für halböffentliche Clubs und Ähnliches (Lesart von Claude für Darias „Demo öffentliche Clubs“). Zugang per Code und Link wie bei Gruppen oder per Anfrage, die das Team freigibt. Eingeladene dürfen kommentieren und liken. Die Posts erscheinen nur bei den Eingeladenen, nicht im Kiez-Feed.
- Die Gründer:in schaltet die Sichtbarkeit jederzeit um.

### Was das Schaufenster postet

- Bild, Textpost, We-Challenge ohne Coins und Me-Challenge. Die Me-Challenge heißt im Schaufenster **Us-Challenge**.
- Posts eines öffentlichen Schaufensters erscheinen im Kiez-Feed und im Feed „Überall“, mit Name und Logo des Schaufensters statt des Decknamens. Ein Tipp darauf öffnet das Schaufenster.
- Menschen können einem Schaufenster folgen. Dann erreichen sie seine Posts auch außerhalb des eigenen Kiezes.
- Werbung ist im Schaufenster und in seinen Posts erlaubt, im übrigen Feed weiter verboten. Daria passt danach Nutzungsbedingungen, Community-Regeln und Datenschutzerklärung an.
- Wave wird noch nicht gebaut.

### Höchstens 50 Einträge, die 10 neuesten sind sichtbar

- Posts und Termine zählen gemeinsam.
- Das Schaufenster zeigt die 10 neuesten Posts und Termine zusammen.
- Gespeichert bleiben höchstens 50. Kommt der 51. Eintrag dazu, löscht die Datenbank den ältesten endgültig, auch aus dem Kiez-Feed.
- Die Grenzen sitzen in der Datenbank (Trigger beim Einfügen, Abfrage und RLS), nicht nur in der App.
- Erst ohne Geld: kein Abo, keine Bezahlung. Eine Ausnahme von der Grenze setzt Daria vorerst von Hand in der Datenbank (`plan_until`). Das Abo kommt später; auf der Finanzierungsseite heißt es schon **Dachs (Partnerladen): 19 € netto im Monat** (`website/finanzierung.html`). Bezahlen geht heute auch rechtlich nicht: Die Nutzungsbedingungen sagen „KiezCoins … nimmt kein Geld an und zahlt keins aus“ (`src/data/legal.ts`).

### Weiterposten an Instagram, Facebook und Co.

- Posts aus dem Schaufenster lassen sich auf Instagram, Facebook und die anderen Plattformen weiterposten. Das ist Daria wichtig.
- Weiterposten gibt es schon für Personen (`Übergabe/2026-11-05_offen_weiterposten.md`): BlueSky, Mastodon, Instagram und Facebook-Seiten, X ausgenommen.
- Heute hängt ein verbundenes Konto an einer Person (`crosspost_accounts.user_id`). Das Schaufenster bekommt eigene verbundene Konten, zum Beispiel das Instagram-Business-Konto und die Facebook-Seite des Ladens: Spalte `crosspost_accounts.showcase_id`, die Edge Function `weiterposten` wählt beim Posten im Schaufenster dessen Konten.
- Termine lassen sich ebenfalls weiterposten, als Bild mit Datum und Ort.

### Termine lassen sich speichern

- Das Team erstellt Termine mit Titel, Bild, Beginn, Ende, Ort und Text.
- „Speichern“ legt den Termin in Routine ab, als Termin wie Erinnerungen mit „um“ (Entscheidung vom 10.11.2026, `Übergabe/2026-11-07_offen_erinnerungen.md`). Der Kater erinnert vorher.
- Zusätzlich „In meinen Kalender“: eine Kalenderdatei (.ics) pro Termin.
- Zusagen mit Teilnehmerzahl, wiederkehrende Termine und Tickets kommen später.
- Ändert oder streicht das Team einen Termin, sehen alle mit gespeichertem Termin die Änderung in Routine.
- Das Team sieht, wie viele Menschen einen Termin gespeichert haben, ohne Namen.

### Wege ins Schaufenster

- Über Posts im Feed, über die Gruppe und über eine Liste der Schaufenster im Kiez. Eine Karte kommt später.

## Teil 1, gebaut am 10.11.2026

- Migration `supabase/migrations/20261110000400_schaufenster.sql`: Tabellen aus der Skizze unten (ohne `crosspost_accounts.showcase_id`), Grenze von 50 Einträgen per Trigger, RLS. Posts in Schaufenstern „nur für Eingeladene“ sind per restriktiver Regel nur für Team und Eingeladene lesbar.
- Gruppenseite: Abschnitt „Schaufenster“. Die Gründer:in legt es mit einem Namen an, alle Mitglieder öffnen es (`src/components/ShowcaseLink.tsx`).
- `schaufenster/[id]`: Titelbild, Logo, Kurztext, Adresse, Öffnungszeiten, Webseite, Impressum, die 10 neuesten Posts und Termine. Team: „Post erstellen“, „Termin erstellen“; Gründer:in: „Schaufenster bearbeiten“. Andere: „Folgen“, bei „nur für Eingeladene“ „Zugang anfragen“ und „Ich habe einen Code“.
- `schaufenster/[id]/bearbeiten`: Angaben, Logo und Titelbild, Sichtbarkeit, Link und Code zum Einladen, Anfragen annehmen oder ablehnen, wer posten darf, Schaufenster löschen.
- `schaufenster/[id]/termin`: Titel, Bild, Heute/Morgen/Datum, Beginn, Ende, Ort, Text.
- `schaufenster/beitreten?code=…`: Code für „nur für Eingeladene“.
- „Post erstellen“ öffnet das Erstellen-Blatt im Reiter Kiez mit dem Kopf „Post für <Name>“; der nächste Post landet im Schaufenster (`attach_showcase_post`).
- Termine: „Speichern“ legt sie in Routine unter „Gespeicherte Termine“ ab, Absagen erscheinen dort durchgestrichen. „In meinen Kalender“: im Browser eine .ics-Datei, in der Android-App der Kalender des Handys. Das Team sieht die Zahl der Speichernden und kann absagen.

### Teil 2, offen

- Posts im Feed mit Name und Logo des Schaufensters statt des Decknamens; Tipp öffnet das Schaufenster.
- Gefolgte Schaufenster: Posts auch außerhalb des eigenen Kiezes im Feed.
- Öffentliche Seite `kiezcoins.de/s/<name>` ohne Anmeldung.
- Weiterposten mit eigenen Konten des Schaufensters (`crosspost_accounts.showcase_id`), Termine als Bild.
- Liste der Schaufenster im Kiez; Me-Challenge heißt im Erstellen-Blatt „Us-Challenge“ (in der Schaufenster-Liste schon).
- Der Kater erinnert vor gespeicherten Terminen.
- Termin ändern (heute nur absagen).

## Skizze für die Datenbank (Claude)

| Tabelle | Inhalt |
| --- | --- |
| `showcases` | Gruppe (`group_id`, einmalig), Name, Kurzname für die Adresse, Logo, Titelbild, Text, Kiez, gerundeter Ort, Adresse, Webseite, Öffnungszeiten, Impressum, Sichtbarkeit (`public`, `invite`), `invite_code`, Ausnahme von der Grenze bis (`plan_until`) |
| `group_members.can_post_showcase` | Freischaltung durch die Gründer:in |
| `showcase_guests` | Eingeladene und Anfragen (`requested`, `accepted`) bei Sichtbarkeit `invite` |
| `showcase_follows` | Wer welchem Schaufenster folgt |
| `challenges.showcase_id` | Posts gehören zu einem Schaufenster, wie heute `group_id` zu einer Gruppe |
| `showcase_events` | Termine: Titel, Bild, Beginn, Ende, Ort, Text, gestrichen am |
| `event_saves` | Wer welchen Termin gespeichert hat; verknüpft mit `reminders` in Routine |
| `crosspost_accounts.showcase_id` | Verbundene Konten des Schaufensters für das Weiterposten |

Die Tabelle `profiles` hat seit der ersten Migration eine ungenutzte Spalte `is_group` (`supabase/migrations/20261019000100_tables.sql`). Sie bleibt unberührt.

## Vorhandene To-dos und Ideen zu Unternehmer-Accounts

Gesammelt am 10.11.2026 aus `Übergabe/`, `website/`, `src/`, `supabase/` und dem Claude-Projektordner (`MEMORY.md`). Documentation (`kiez-coins/briefing/08_Partnerstrategie.md`) war heute nicht erreichbar, Darias Mac war offline. Dort stehen vermutlich weitere Punkte.

### Geschäftsmodell und Abos

- **Dachs (Partnerladen):** 19 € netto im Monat, jährlich per SEPA-Lastschrift. **Storch (Community-Sponsorin):** 5 € im Monat per Karte. **Schwalbe:** Weiterposten, 10,99 € im Jahr. Quelle: `website/finanzierung.html` (08.11.2026).
- Einnahmen decken zuerst die Fixkosten; vom Rest gehen 30 % an die Entwicklerin, 70 % an die Community (Startseite, 08.11.2026).
- Gruppen: geschlossene Gruppen ohne Bounties sehr billig; Gruppen mit Mitgliedern ab 18 kosten etwas, nach 30 Tagen Probezeit (Daria, 09.10.2026, `MEMORY.md`).
- Bilderkennung als Bonus für Zahlende: Bäume, Vögel, Termine aus einem Screenshot (Daria, 10.11.2026, `TODO.md`). Terminerkennung passt direkt zu den Schaufenster-Terminen.
- Wasserzeichen beim Weiterposten; wer es entfernen will, kauft die App einmalig (Daria, 09.11.2026, `TODO.md`).
- Anschrift (c/o) im Impressum erst, wenn die App öffentlich ist und ein Finanzierungskonzept steht (`TODO.md`).

### Wave: Vereine rufen den Kiez zusammen

- Der abgeschaltete Typ `wave` heißt in der App „Gruppen und Vereine rufen damit bald den ganzen Kiez zu gemeinsamen Aktionen auf“ (`src/data/features.ts`).
- Wave-Challenge-Modell aus dem Briefing: Sponsoren finanzieren lokale Aufrufe über eigene Events („Send a Good Wave back“), Teilnehmende erhalten Wave-Abzeichen (`MEMORY.md`).
- Offene Frage seit 31.10.2026: Geht Wave in der offenen We-Challenge ohne Höchstgrenze auf (`TODO.md`)?

### Partner und Vertrieb

- Liste potentieller Kooperationspartner: Gut erzogene Asis, Auenwald Tee, Dezentrale, Chaos Computer Club, mit offenen Fragen (`Übergabe/2026-11-05_offen_kooperationspartner.md`).
- Liste potenziell interessierter Leipziger Organisationen (Daria, 27.10.2026, `TODO.md`).
- Co-Founder-Anzeige: Vertrieb zu kleinen Unternehmen, NGOs und Vereinen (`website/co-founder.html`).
- Werbung mit QR-Codes und Einladungscodes, Gazelle-Werbung je nach Modus mit Codes, die eine Vorauswahl treffen, Infrastruktur für Gewinnspiele (Daria, 27.10.2026, `TODO.md`).
- Werbetext: „Du musst auf etablierten sozialen Netzwerken posten, … Wir schirmen Dich ab.“ (Daria, 09.11.2026, `TODO.md`). Der Text zielt auf Menschen, die beruflich posten.

### Weiterposten

- Automatisch auf Instagram und Facebook posten geht nur mit Business- oder Creator-Konto; Facebook-Seiten sind seit 09.11.2026 angebunden (`Übergabe/2026-11-05_offen_weiterposten.md`). Ein Schaufenster postet damit gleichzeitig in seine anderen Kanäle.
- Ansicht aller weitergeposteten Posts mit Angabe, wo sie erschienen sind (Daria, 09.11.2026, `TODO.md`).

### Rechtstexte stehen dem Schaufenster heute im Weg

- Nutzungsbedingungen, Abschnitt 3: „Verboten sind … Werbung, Spam …“. To-do vom 27.10.2026: Werbung als Verbot streichen oder in die Community-Regeln aufnehmen.
- Nutzungsbedingungen, Abschnitt 4: KiezCoins „nimmt kein Geld an und zahlt keins aus“. Ein Abo braucht eine neue Fassung.
- Datenschutzerklärung, Einleitung: „KiezCoins nutzt keine Werbung, kein Tracking und keine Analyse-Werkzeuge.“
- Geschäftsmäßige Angebote brauchen ein eigenes Impressum (§ 5 Digitale-Dienste-Gesetz). Das Schaufenster braucht dafür ein Feld.

## Offene Punkte

- Weiterposten beim Löschen des 51. Eintrags: Vorschlag Claude, die Weiterposts auf Instagram, Facebook usw. bleiben stehen. Daria bestätigt oder widerspricht.
- Später, nach dem Bau ohne Geld: Ist das Abo der Dachs? Was enthält es, zum Beispiel mehr als 50 Einträge, X beim Weiterposten, Bilderkennung, Weiterposten ohne Wasserzeichen, Statistik?
- Rechtstexte zur Werbung im Schaufenster (Daria).
