# To-dos

Stand: 28.10.2026. Diese Liste ist die einzige To-do-Liste für KiezKoins. Beide Accounts tragen hier ein und haken hier ab. Abgehakt ist, was auf `main` liegt.

Screenshots zu einzelnen Punkten liegen im Claude-Projektordner unter `kiez-coins/screenshots/`. Sie stehen absichtlich nicht im Repo, weil das Repo öffentlich ist und einige Bilder Adressen und Namen zeigen.

## Außerhalb des Codes

- [x] Mailversand über Brevo und kiezcoins.de (läuft seit 21.10.2026, Code-Mail um 09:55 angekommen, IP-Sperre in Brevo aus)
- [x] Auftragsverarbeitungsvertrag Brevo (über die Brevo-AGB akzeptiert)
- [ ] Auftragsverarbeitungsvertrag Supabase unterschreiben (prüfen, ob es schon passiert ist)
- [ ] Kodex und Rechtstexte überarbeiten (Daria)
- [ ] Anschrift (c/o) im Impressum, sobald die App öffentlich ist und ein Finanzierungskonzept steht

## 28.10.2026 – Prio: animierte Coins (Daria)

- [ ] Animierte Coins bauen. Daria hat sie am 27.10.2026 als sehr wichtig markiert. Ideen und offene Fragen stehen in `Übergabe/2026-10-24_offen_coin-animation-me-challenge.md`. Die Animation „Diamantenregen“ weiter unten gehört dazu.

## 28.10.2026 – Prio für Daria: Migration für Edensteine im Kiez (PR #97)

- [x] (28.10.2026) Im Supabase-SQL-Editor den Inhalt von `supabase/migrations/20261028000200_kiez_edensteine.sql` (Branch `claude/project-thread-jtu0yb`, PR #97) ausführen. Claudes Zugang darf in Supabase nur lesen, deshalb geht es nur von Hand.
- [x] (28.10.2026, mit PR #104) Claude Bescheid geben, dann prüft Claude die Datenbank und merged PR #97. Vorher nicht mergen, sonst schlägt das Bearbeiten von Challenges fehl.

## 28.10.2026 – Pflicht für Daria: Anmeldung ohne E-Mail und Testkonto (PR #90)

- [x] (28.10.2026) Supabase › Authentication › Sign In / Providers: „Allow anonymous sign-ins“ einschalten
- [x] (28.10.2026) Brevo-API-Schlüssel als Secret `BREVO_API_KEY` für die Edge Function `konto-ohne-mail` hinterlegen (Supabase › Edge Functions › Secrets)
- [x] (28.10.2026) Migrationen als Skripte 6 und 7 eingespielt (in der Repo jetzt 20261028000400 und 20261028000500), Edge Function `konto-ohne-mail` mit `--no-verify-jwt` deployt, PR #90 gemergt

## 20.10.2026 – Challenges und Design (Daria)

- [x] Deleted C. -> "Bearbeiten" statt direkt "Wider veröffentlichen", und erst im Bearbeitungsscreen "Veröffentlichen"  oder "Nicht veröffentlichen, Entwurf"
- [x] Deleted and Closed erreichbar über Switsch, "Neue Challenge" in dieser Ansicht nicht anzeigen.
- [ ] Karte Unter "Deine Challenges" optimalerweise etwas kleiner als der Bildschirm, damit man die nächste schon sieht
- [ ] Welche Icons kann und sollte ich durch Zeichnungen ersetzen - mindestens das Zahnrad, Diamanten
- [ ] Katze - unterschiedliche Gesichtsausdrücke nutzen
- [ ] Animation (Farbe in der Sonnenbrille)
- [ ] Icons minimal größer
- [ ] Glass-Effekt mit besserem 3D

## 20.10.2026 (2) – Challenges, Animationen, Nutzer*innen (Daria)

- [x] Statt Frist "Noch"
- [ ] Badge "Offen" Farblich betonen
- [ ] Animation "Katze auf Schiff"
- [ ] Animation "Diamantenregen"
- [ ] Noch keine Aufgaben über "Meine Gruppe". "Meine Gruppe etwas größer, bis sich der Bildschirm füllt.
- [x] "Deine Reise" umbenennen und den Namen "Pleasure" in Kommentare des Katers ummünzen
- [ ] Das Foto in der Anfänglichen Ansicht einer Challenge doch größer Zeigen, als jetzt, die Details dazu im Verhältnis kleiner
- [x] Challenges Flaggen! 
- [x] Nutzer*innen Blockieren
- [x] Einfache Ansicht zu anderen Nutzerinnen
   - [x] Die Möglichkeit, "Lob zu zollen"
   - [x] Das Foto
   - [x] Die Möglichkeit, eine ernsthafte Beschwerde einzulegen
   - [x] Die Möglichkeit zu blockieren
- [x] Policy bzgl Sexismus, Belästigung, Gewalt, Rassismus, Antisemitismus etc.
- [ ] Organic Look for Switch
- [ ] Use my Location" als Switsch

## 21.10.2026 – Notes (Daria)

- [ ] das sieht wie Radio aus, muss nicht sein (Screenshot `2026-10-21_standort-hinweis-kreis.jpeg`: Kreis vor dem Standort-Hinweis „Wir speichern … Standort …“)
- [x] bei Fehler ist der Kontrast zwischen Input und Text fast null
- [x] automatisches Overlay während der PW Eingabe überdeckt auf meinem Telefon die Tastatur 
- [ ] deine Reise deine Challenges deine Gruppen - in der Größe der ersten Karte 

## 21.10.2026 (2) – Kopie erstellen und Vorschau (Daria)

- [x] "Kopie erstellen" hier als ersten Button (nach dem schließen), die beiden anderen bleiben. (Screenshot `2026-10-21_geschlossene-challenge-karte.jpeg`: Karte einer geschlossenen Challenge unter „Deine Challenges“ mit „Ansehen“ und „Löschen“)
- [x] Wenn ich eine Ch erstelle, möchte ich Borschau sehen. Vorschau wäre wie später das Original, doch Rand ausgeblurrt - unten langer Standardbutton "Veröffentlichen" , doch links davon ein kleinerer für zurück ("bearbeiten") (Skizze `2026-10-21_vorschau-skizze.jpeg`: Challenge-Ansicht, grün markiert der scharfe Bereich, außen der ausgeblurrte Rand)

## 21.10.2026 (3) – Verlauf und „Deine Reise“ (Daria)

- [x] Im Verlauf: trennen nach öffentlichen und den Gruppen , unter Deine Reise sollte ich zu der von mir erstellten Gruppe gelangen 
- [x] Deine Reise umbenennen zu YourPleasure

## 21.10.2026 (4) – Bugs (Daria)

- [x] Bug: persönliche Ansprache lässt sich nicht ändern (Dein Konto › Persönliche Angaben › Ansprache). Ursache: In `EditableRow` (`src/components/Rows.tsx`) schloss `onBlur` das Eingabefeld, bevor das Häkchen den Tipp bekam. Behoben: `onBlur` speichert jetzt selbst, genau einmal. Das gilt auch für den Decknamen.

## 21.10.2026 (5) – Feedback (Daria)

- [ ] Das Badge „Open“ (Offen) sieht wie ein Button aus. Hängt mit „Badge ‚Offen‘ farblich betonen“ vom 20.10.2026 zusammen.
- [ ] Das Zahnrad-Menü in der Gruppenaufgabe soll sich bei Klick außerhalb schließen. (Screenshot `2026-10-21_zahnrad-menue-gruppenaufgabe.png`: Gruppenaufgabe mit offenem Menü „Edit, Close, Delete, Manage all“)
- [x] Bug: Der Name „Sof“ erschien als „Sofa“. Ursache: Die Übersetzung im Browser (Safari) übersetzte Namen mit. Behoben: Namen, Decknamen und Gruppennamen tragen `noTranslate` (`src/components/T.tsx`), im Web `translate="no"` und die Klasse `notranslate`.

## 22.10.2026 – Feedback (Daria)

- [ ] „The Header should Not randomly disappear on scroll on huge screens like huge iPhones“. Vermutete Ursache und Vorschlag im Repo unter `Übergabe/2026-10-25_offen_kopf-grosse-bildschirme.md`.

## 27.10.2026 – Start, Werbung und Layout (Daria)

- [ ] Diverse Codes: QR-Codes und Einladungscodes
- [ ] Liste potenziell interessierter Leipziger Organisationen
- [ ] Gazelle-Werbung je nach Modus, mit Codes, die eine Vorauswahl treffen
- [x] Anmeldeprozess vereinfachen, erster Schritt: Anmeldung ohne E-Mail und Testkonto (PR #90, 28.10.2026; offene Punkte in `2026-10-27_offen_anmeldung-ohne-mail-testkonto.md`)
- [ ] E-Mail-Code: jeder Code der letzten 5 Minuten gilt, Sperre 30 Sekunden mit Countdown (Plan: `2026-10-24_offen_email-code-5-minuten.md`; Migration `login_codes`, Edge Functions `send-code` und `verify-code`, Brevo-Template, Secrets)
- [ ] Übersetzungen der Anmeldetexte nachtragen (`node scripts/i18n.mjs --missing`)
- [ ] Deckname-Vorschläge per KI erzeugen (z. B. Edge Function mit Sprachmodell, passend zu Ansprache und Kiez), nur freie Namen anzeigen. Bis dahin: feste Liste in `src/app/onboarding/deckname.tsx`, vergebene Namen werden ausgefiltert (Daria, 28.10.2026)
- [ ] Infrastruktur für Gewinnspiele vorplanen
- [ ] Zeitplan: erster Testlauf, erste 100 Mitglieder
- [ ] Sprayform
- [ ] Layout so gemütlich wie Duolingo
- [ ] Wiederkehrende Challenges, z. B. „1 mal im Monat etwas für den Kiez“ oder „start a habit and post 2–3 times a week“

## 27.10.2026 (2) – Für später: Sprachfunktionen (Daria)

- [ ] Nachrichten von Audio zu Text und von Text zu Audio umwandeln
- [ ] Audio-Assistent: Person anschreiben, indem man ihren Namen sagt

## 27.10.2026 (3) – Rechtstexte nach den neuen Community-Regeln (Daria)

Kontext: `Übergabe/2026-10-27_offen_community-regeln.md`.

- [ ] Nutzungsbedingungen (Abschnitt 2, „ab 18 Jahren“) und Datenschutz (Abschnitt „Alter“) an den Abschnitt „Kinder“ anpassen: Kinder nutzen die App über Eltern oder Lehrkräfte
- [ ] Nutzungsbedingungen, Abschnitt 3: „Werbung“ als Verbot streichen oder in die Community-Regeln aufnehmen
- [ ] Schreibweise „KiezCoins“ oder „Kiez Coins“ in den Regeln vereinheitlichen
- [ ] Migration `20261027000300_app_texts_community_regeln.sql` im Supabase-SQL-Editor ausführen (Texte-Editor)

## 27.10.2026 (4) – We-Challenge mit mehreren Personen (Daria)

Plan und Entscheidungen: `Übergabe/2026-10-27_we-challenge-mehrere-personen.md`.

- [x] Offene Punkte im Plan beantworten (Daria, 27.10.2026)
- [x] Migration, Funktionen und App-Code bauen (Claude, 28.10.2026)
- [x] Nach PR #97: Inhalt von `supabase/migrations/20261028000300_we_challenge_teilnehmende.sql` im Supabase-SQL-Editor ausführen (Daria, 28.10.2026; Claude hat die Datenbank geprüft, PR #104 gemergt)
