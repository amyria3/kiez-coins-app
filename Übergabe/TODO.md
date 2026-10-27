# To-dos

Stand: 27.10.2026. Diese Liste ist die einzige To-do-Liste für KiezKoins. Beide Accounts tragen hier ein und haken hier ab. Abgehakt ist, was auf `main` liegt.

Screenshots zu einzelnen Punkten liegen im Claude-Projektordner unter `kiez-coins/screenshots/`. Sie stehen absichtlich nicht im Repo, weil das Repo öffentlich ist und einige Bilder Adressen und Namen zeigen.

## Außerhalb des Codes

- [x] Mailversand über Brevo und kiezcoins.de (läuft seit 21.10.2026, Code-Mail um 09:55 angekommen, IP-Sperre in Brevo aus)
- [x] Auftragsverarbeitungsvertrag Brevo (über die Brevo-AGB akzeptiert)
- [ ] Auftragsverarbeitungsvertrag Supabase unterschreiben (prüfen, ob es schon passiert ist)
- [ ] Kodex und Rechtstexte überarbeiten (Daria)
- [ ] Anschrift (c/o) im Impressum, sobald die App öffentlich ist und ein Finanzierungskonzept steht

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

- [ ] Bug: persönliche Ansprache lässt sich nicht ändern (Dein Konto › Persönliche Angaben › Ansprache). Vermutete Ursache, noch nicht behoben: In `EditableRow` (`src/components/Rows.tsx`) schließt `onBlur` das Eingabefeld, bevor das Häkchen den Tipp bekommt. Damit speichert das Häkchen nie. Derselbe Fehler betrifft vermutlich den Deckname. Datenbank und Schema sind in Ordnung.

## 21.10.2026 (5) – Feedback (Daria)

- [ ] Das Badge „Open“ (Offen) sieht wie ein Button aus. Hängt mit „Badge ‚Offen‘ farblich betonen“ vom 20.10.2026 zusammen.
- [ ] Das Zahnrad-Menü in der Gruppenaufgabe soll sich bei Klick außerhalb schließen. (Screenshot `2026-10-21_zahnrad-menue-gruppenaufgabe.png`: Gruppenaufgabe mit offenem Menü „Edit, Close, Delete, Manage all“)
- [ ] Bug: Der Name „Sof“ erschien als „Sofa“. Vermutete Ursache: die Übersetzung im Browser (Safari, Übersetzen-Symbol in der Adressleiste im Screenshot zum Zahnrad-Menü) übersetzt Namen mit. Die App selbst enthält „Sofa“ nirgends, und die Web-App setzt bisher nirgends `translate="no"`. Fix: Namen, Decknamen und Gruppennamen mit `translate="no"` bzw. der Klasse `notranslate` auszeichnen.

## 22.10.2026 – Feedback (Daria)

- [ ] „The Header should Not randomly disappear on scroll on huge screens like huge iPhones“. Vermutete Ursache und Vorschlag im Repo unter `Übergabe/2026-10-25_offen_kopf-grosse-bildschirme.md`.

## 27.10.2026 – Start, Werbung und Layout (Daria)

- [ ] Diverse Codes: QR-Codes und Einladungscodes
- [ ] Liste potenziell interessierter Leipziger Organisationen
- [ ] Gazelle-Werbung je nach Modus, mit Codes, die eine Vorauswahl treffen
- [ ] Anmeldeprozess vereinfachen
- [ ] Infrastruktur für Gewinnspiele vorplanen
- [ ] Zeitplan: erster Testlauf, erste 100 Mitglieder
- [ ] Sprayform
- [ ] Layout so gemütlich wie Duolingo
- [ ] Wiederkehrende Challenges, z. B. „1 mal im Monat etwas für den Kiez“ oder „start a habit and post 2–3 times a week“

## 27.10.2026 (2) – Für später: Sprachfunktionen (Daria)

- [ ] Nachrichten von Audio zu Text und von Text zu Audio umwandeln
- [ ] Audio-Assistent: Person anschreiben, indem man ihren Namen sagt
