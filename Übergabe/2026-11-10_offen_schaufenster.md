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

Das Schaufenster ist damit die erste kommerzielle Fläche in KiezCoins. Es greift den Feature-Wunsch vom 09.11.2026 auf: „Feed, besonders für Kleinunternehmen und Vereine“ (`Übergabe/TODO.md`).

## Vorschlag für den Aufbau (Claude)

### Ein Schaufenster gehört einem Team

- Ein Schaufenster ist ein eigenes Profil mit Name, Logo, Titelbild, Kurztext, Kiez, Adresse, Webseite und Öffnungszeiten.
- Eine oder mehrere Personen mit eigenem KiezCoins-Konto pflegen es (Rollen: Inhaber:in, Redaktion). So posten mehrere Leute aus einem Verein, ohne ein Passwort zu teilen. Das Muster kennt die App schon von den Gruppen (`groups`, `group_members`, Gründer:in).
- Die Tabelle `profiles` hat seit der ersten Migration eine ungenutzte Spalte `is_group` („Gruppenprofile“, `supabase/migrations/20261019000100_tables.sql`). Die Finanzierungsseite zählt sie schon heraus. Ein Schaufenster als eigene Tabelle ist sauberer; `is_group` bleibt dann unberührt oder fällt weg.

### Sichtbarkeit: öffentlich oder nur mit Einladung

- **Öffentlich:** Alle in der App finden das Schaufenster, zum Beispiel über den Kiez-Feed, Posts und eine Suche. Dazu eine öffentliche Webseite `kiezcoins.de/s/<name>` ohne Anmeldung, nach dem Muster der geteilten Posts (`kiezcoins.de/c/<id>`, `api/c.mjs`). Die Seite holt Menschen ohne KiezCoins in die App.
- **Nur mit Einladung:** Das Schaufenster bekommt einen Einladungscode und einen Link, wie die Gruppen (`invite_code`, `/groups/join`). Nur wer eingeladen ist, sieht Posts und Termine. Beispiele: Mitgliederbereich eines Vereins, Stammkundschaft eines Ladens.
- Die Inhaber:in schaltet die Sichtbarkeit jederzeit um.

### Höchstens 10 Posts ohne Abo

- Sichtbar sind die 10 neuesten Posts. Ältere Posts bleiben gespeichert und erscheinen für das Team im Archiv, für andere nicht.
- Mit Abo sind alle Posts sichtbar. Endet das Abo, gilt wieder die Grenze. Nichts geht verloren.
- Die Grenze sitzt in der Datenbank (Abfrage und RLS), nicht nur in der App. Sonst lesen andere Apps oder die Web-App die älteren Posts trotzdem.
- Das Abo heißt auf der Finanzierungsseite schon **Dachs (Partnerladen): 19 € netto im Monat, jährlich per SEPA-Lastschrift** (`website/finanzierung.html`).
- Bezahlen geht heute nicht: Die Nutzungsbedingungen sagen „KiezCoins … nimmt kein Geld an und zahlt keins aus“ (`src/data/legal.ts`). Vorschlag nach dem Muster vom Weiterposten (05.11.2026): erst kein Geld nehmen. Das Abo setzt Daria vorerst von Hand in der Datenbank, und ein Knopf „Ich würde das Abo nutzen“ zählt das Interesse.

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
| `showcases` | Name, Kurzname für die Adresse, Logo, Titelbild, Text, Kiez, gerundeter Ort, Sichtbarkeit (`public`, `invite`), `invite_code`, Abo bis (`plan_until`) |
| `showcase_members` | Team: Person, Rolle (`owner`, `editor`) |
| `showcase_guests` | Eingeladene Personen bei Sichtbarkeit `invite` |
| `challenges.showcase_id` | Posts gehören zu einem Schaufenster, wie heute `group_id` zu einer Gruppe |
| `showcase_events` | Termine: Titel, Bild, Beginn, Ende, Ort, Text, Wiederholung, gestrichen am |
| `event_saves` | Wer welchen Termin gespeichert hat; verknüpft mit `reminders` in Routine |

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

Fragen an Daria, die Reihenfolge folgt der Wichtigkeit für den Bau:

1. Wer darf ein Schaufenster anlegen: nur Unternehmen, Vereine und Organisator:innen, oder jede Person? Prüft jemand die Angaben, bevor es sichtbar wird?
2. Gehört ein Schaufenster einem Team mit eigenen Konten (Vorschlag), oder ist es ein eigenes Konto mit eigener Anmeldung?
3. „Alle dürfen sehen“: alle in der App, oder auch ohne Konto im Web unter `kiezcoins.de/s/<name>` (Vorschlag)?
4. „Nur eingeladene Personen“: Einladung per Code und Link wie bei Gruppen? Dürfen Eingeladene kommentieren und liken, oder nur ansehen?
5. Was passiert mit dem elften Post: ausblenden und im Archiv behalten (Vorschlag) oder löschen? Zählen Termine mit?
6. Ist das Abo der Dachs (19 € netto im Monat)? Was enthält es außer unbegrenzten Posts, zum Beispiel Bilderkennung, Weiterposten ohne Wasserzeichen, Statistik?
7. Welche Posts darf ein Schaufenster erstellen: Bild, Textpost, Me-Challenge, We-Challenge? Darf es Coins anbieten?
8. Erscheinen Posts und Termine eines öffentlichen Schaufensters auch im Kiez- und Überall-Feed, oder nur im Schaufenster? Gibt es „Folgen“?
9. Termine: Reicht „Speichern“ in Routine plus Kalenderdatei? Braucht es Zusagen mit Teilnehmerzahl, wiederkehrende Termine oder Tickets?
10. Geht Wave im Schaufenster auf, also ein Termin als Aufruf an den Kiez, gesponsert vom Schaufenster?
11. Werbung: Ist sie im Schaufenster erlaubt und im übrigen Feed weiter verboten? Danach passt Daria Nutzungsbedingungen, Community-Regeln und Datenschutzerklärung an.
12. Wo führt die App ins Schaufenster: über Posts und Profile, über eine Liste im Kiez, über eine Karte?
