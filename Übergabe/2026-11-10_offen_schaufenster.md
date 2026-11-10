# Schaufenster für Unternehmen, Vereine und Organisator:innen

- Stand: 10.11.2026
- Status: offen, Planung. Noch nicht bauen, erst die offenen Fragen unten klären.
- Ziel in Documentation: neue Datei `kiez-coins/konzept/Schaufenster.md`, Entscheidungen in `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Schaufenster“
- Arbeitsteilung: Daria beantwortet die offenen Fragen und entscheidet über Abo und Rechtstexte. Claude baut danach Migration, App-Code und öffentliche Seite und schreibt die Doku.

## Das Schaufenster zeigt ein Unternehmen, einen Verein oder eine Organisator:in

Daria hat das Schaufenster am 10.11.2026 so beschrieben:

1. Alle dürfen es sehen, oder nur eingeladene Personen.
2. Es zeigt höchstens die 10 letzten Posts, außer man hat ein bezahltes Abo.
3. Das Schaufenster erstellt Termine. Andere speichern Termine bei sich.

Entscheidungen (Daria, 10.11.2026, nach dem ersten Plan):

- Jede Gruppe darf ein öffentliches Schaufenster anlegen.
- Die Posts des Schaufensters erscheinen im Kiez-Feed.
- Posts aus dem Schaufenster lassen sich ebenfalls auf Instagram, Facebook und den anderen Plattformen weiterposten. Das ist wichtig.
- Im Schaufenster posten und Termine anlegen dürfen die Gründer:in der Gruppe und die Mitglieder, die sie dafür freischaltet.
- Ein Schaufenster nur für Eingeladene gibt es zusätzlich zum öffentlichen. Daria will damit halböffentliche Clubs und Ähnliches ermöglichen (Lesart von Claude für „Demo öffentliche Clubs“).
- Das Schaufenster wird erst ohne Geld gebaut. Kein Abo, keine Bezahlung.

Das Schaufenster ist damit die erste kommerzielle Fläche in KiezCoins. Es greift den Feature-Wunsch vom 09.11.2026 auf: „Feed, besonders für Kleinunternehmen und Vereine“ (`Übergabe/TODO.md`).

## Vorschlag für den Aufbau (Claude)

### Ein Schaufenster gehört einer Gruppe

- Jede Gruppe darf ein Schaufenster anlegen (Daria, 10.11.2026), höchstens eins pro Gruppe.
- Das Schaufenster ist die öffentliche Seite der Gruppe: Name, Logo, Titelbild, Kurztext, Kiez, Adresse, Webseite, Öffnungszeiten und Impressum.
- Die Gruppe bleibt der geschlossene Raum für die Mitglieder, das Schaufenster zeigt nach außen. Ein Verein nutzt die Gruppe intern und das Schaufenster für alle.
- Das Team sind die Mitglieder der Gruppe (`group_members`, Rollen `founder`, `member`). Posten und Termine anlegen dürfen die Gründer:in und die Mitglieder, die sie freischaltet (Daria, 10.11.2026). Dafür bekommt `group_members` eine Rolle oder einen Schalter, zum Beispiel `can_post_showcase`.
- Die Tabelle `profiles` hat seit der ersten Migration eine ungenutzte Spalte `is_group` („Gruppenprofile“, `supabase/migrations/20261019000100_tables.sql`). Die Finanzierungsseite zählt sie schon heraus. Ein Schaufenster als eigene Tabelle mit Verweis auf die Gruppe ist sauberer; `is_group` bleibt dann unberührt oder fällt weg.

### Sichtbarkeit: öffentlich oder nur mit Einladung

- **Öffentlich:** Alle in der App finden das Schaufenster, zum Beispiel über den Kiez-Feed, Posts und eine Suche. Dazu eine öffentliche Webseite `kiezcoins.de/s/<name>` ohne Anmeldung, nach dem Muster der geteilten Posts (`kiezcoins.de/c/<id>`, `api/c.mjs`). Die Seite holt Menschen ohne KiezCoins in die App.
- **Nur mit Einladung:** Das Schaufenster bekommt einen Einladungscode und einen Link, wie die Gruppen (`invite_code`, `/groups/join`). Nur wer eingeladen ist, sieht Posts und Termine. Beispiele: Mitgliederbereich eines Vereins, Stammkundschaft eines Ladens.
- Die Gründer:in der Gruppe schaltet die Sichtbarkeit jederzeit um.
- Beide Varianten bleiben (Daria, 10.11.2026). Das Schaufenster nur für Eingeladene ist für halböffentliche Clubs gedacht: größer und offener als die Gruppe, aber nicht für den ganzen Kiez. Seine Posts erscheinen nicht im Kiez-Feed, nur bei den Eingeladenen.

### Posts erscheinen im Kiez-Feed

- Jeder Post eines öffentlichen Schaufensters erscheint im Kiez-Feed (Daria, 10.11.2026), bis 5 km wie alle Kiez-Posts, und im Feed „Überall“.
- Im Feed trägt der Post Name und Logo des Schaufensters statt des Decknamens. Ein Tipp darauf öffnet das Schaufenster.
- Der Post zählt zur Grenze von 10 Posts im Schaufenster. Ob ältere Posts auch aus dem Feed verschwinden, klärt Frage 3 unten.

### Höchstens 10 Posts ohne Abo

- Sichtbar sind die 10 neuesten Posts. Ältere Posts bleiben gespeichert und erscheinen für das Team im Archiv, für andere nicht.
- Mit Abo sind alle Posts sichtbar. Endet das Abo, gilt wieder die Grenze. Nichts geht verloren.
- Die Grenze sitzt in der Datenbank (Abfrage und RLS), nicht nur in der App. Sonst lesen andere Apps oder die Web-App die älteren Posts trotzdem.
- Das Abo heißt auf der Finanzierungsseite schon **Dachs (Partnerladen): 19 € netto im Monat, jährlich per SEPA-Lastschrift** (`website/finanzierung.html`).
- Erst ohne Geld (Daria, 10.11.2026). Die Grenze von 10 Posts wird gebaut, das Abo nicht. Freischalten für alle Posts setzt Daria von Hand in der Datenbank (`plan_until`).
- Bezahlen geht heute auch rechtlich nicht: Die Nutzungsbedingungen sagen „KiezCoins … nimmt kein Geld an und zahlt keins aus“ (`src/data/legal.ts`). Vorschlag nach dem Muster vom Weiterposten (05.11.2026): erst kein Geld nehmen. Das Abo setzt Daria vorerst von Hand in der Datenbank, und ein Knopf „Ich würde das Abo nutzen“ zählt das Interesse.

### Posts aus dem Schaufenster gehen weiter an Instagram, Facebook und Co.

- Weiterposten gibt es schon für Personen (`Übergabe/2026-11-05_offen_weiterposten.md`): BlueSky, Mastodon, Instagram und Facebook-Seiten, freigegeben seit 09.11.2026, X ausgenommen.
- Heute hängt ein verbundenes Konto an einer Person (`crosspost_accounts.user_id`). Das Schaufenster braucht eigene verbundene Konten, zum Beispiel das Instagram-Business-Konto und die Facebook-Seite des Ladens. Dafür bekommt `crosspost_accounts` eine Spalte `showcase_id`; die Edge Function `weiterposten` wählt beim Posten im Schaufenster dessen Konten.
- Instagram und Facebook verlangen sowieso Business- oder Creator-Konten und Seiten. Unternehmen und Vereine haben diese meist schon.
- Löschen und Wiederherstellen laufen wie bei Personen über `CrosspostDialog`.
- Termine lassen sich ebenfalls weiterposten, als Bild mit Datum und Ort.

### Termine lassen sich speichern

- Das Team erstellt Termine mit Titel, Bild, Beginn, Ende, Ort und Text, optional wiederkehrend.
- Termine stehen im Schaufenster und, je nach Sichtbarkeit, im Kiez-Feed.
- „Speichern“ legt den Termin in Routine ab. Das passt zu Darias Entscheidung vom 10.11.2026: Importierte Termine erscheinen in Routine als Termine wie Erinnerungen mit „um“, Markierung „Termin“, ohne Zähler (`Übergabe/2026-11-07_offen_erinnerungen.md`). Der Kater erinnert vorher.
- Zusätzlich „In meinen Kalender“: eine Kalenderdatei (.ics) pro Termin. Später ein persönlicher Kalender-Link (webcal) für alle gespeicherten Termine, wie für Routine vorgeschlagen.
- Ändert oder streicht das Team einen Termin, sehen alle mit gespeichertem Termin die Änderung, in Routine sofort und im Kalender über den Link.
- Das Team sieht, wie viele Menschen einen Termin gespeichert haben, ohne Namen.

### Skizze für die Datenbank

| Tabelle | Inhalt |
| --- | --- |
| `showcases` | Gruppe (`group_id`, einmalig), Name, Kurzname für die Adresse, Logo, Titelbild, Text, Kiez, gerundeter Ort, Sichtbarkeit (`public`, `invite`), `invite_code`, Abo bis (`plan_until`) |
| `showcase_guests` | Eingeladene Personen bei Sichtbarkeit `invite` |
| `challenges.showcase_id` | Posts gehören zu einem Schaufenster, wie heute `group_id` zu einer Gruppe |
| `showcase_events` | Termine: Titel, Bild, Beginn, Ende, Ort, Text, Wiederholung, gestrichen am |
| `event_saves` | Wer welchen Termin gespeichert hat; verknüpft mit `reminders` in Routine |
| `crosspost_accounts.showcase_id` | Verbundene Konten des Schaufensters für das Weiterposten |

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

Fragen an Daria, die Reihenfolge folgt der Wichtigkeit für den Bau. Beantwortet am 10.11.2026: wer ein Schaufenster anlegt (jede Gruppe), ob Posts im Kiez-Feed erscheinen (ja), Weiterposten (ja, wichtig), wer im Schaufenster postet (Gründer:in und freigeschaltete Mitglieder), Schaufenster nur für Eingeladene (ja, für halböffentliche Clubs), Geld (erst ohne; das Abo kommt später, Frage 4 hat Zeit).

1. Wie kommen Menschen in ein Schaufenster nur für Eingeladene: per Code und Link wie bei Gruppen, per Anfrage mit Freigabe durch das Team, oder beides? Dürfen Eingeladene kommentieren und liken?
2. „Alle dürfen sehen“: auch ohne Konto im Web unter `kiezcoins.de/s/<name>` (Vorschlag)?
3. Was passiert mit dem elften Post: im Schaufenster ausblenden und im Archiv behalten (Vorschlag) oder löschen? Bleibt er im Kiez-Feed sichtbar? Zählen Termine mit?
4. Später, nach dem Bau ohne Geld: Ist das Abo der Dachs (19 € netto im Monat)? Was enthält es außer unbegrenzten Posts, zum Beispiel X beim Weiterposten, Bilderkennung, Weiterposten ohne Wasserzeichen, Statistik?
5. Prüft jemand ein Schaufenster, bevor es öffentlich wird, zum Beispiel das Impressum?
6. Welche Posts darf ein Schaufenster erstellen: Bild, Textpost, Me-Challenge, We-Challenge? Darf es Coins anbieten?
7. Termine: Reicht „Speichern“ in Routine plus Kalenderdatei? Braucht es Zusagen mit Teilnehmerzahl, wiederkehrende Termine oder Tickets?
8. Gibt es „Folgen“, damit Posts eines Schaufensters auch außerhalb des eigenen Kiezes ankommen?
9. Geht Wave im Schaufenster auf, also ein Termin als Aufruf an den Kiez, gesponsert vom Schaufenster?
10. Werbung: Ist sie im Schaufenster und in dessen Posts im Kiez-Feed erlaubt, im übrigen Feed weiter verboten? Danach passt Daria Nutzungsbedingungen, Community-Regeln und Datenschutzerklärung an.
11. Wo führt die App ins Schaufenster: über Posts, über die Gruppe, über eine Liste im Kiez, über eine Karte?
