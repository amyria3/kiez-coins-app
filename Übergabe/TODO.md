# To-dos

Stand: 2026-10-31. Diese Liste ist die einzige To-do-Liste für KiezCoins. Beide Accounts tragen hier ein und haken hier ab. Abgehakt ist, was auf `main` liegt.

Screenshots zu einzelnen Punkten liegen im Claude-Projektordner unter `kiez-coins/screenshots/`. Sie stehen absichtlich nicht im Repo, weil das Repo öffentlich ist und einige Bilder Adressen und Namen zeigen.

## Dringend (Daria, 30.10.2026)

- [ ] `node scripts/i18n.mjs --prune` reparieren: Es löscht genutzte Übersetzungen, weil `collectKeys()` in `scripts/text-keys.mjs` `src/data/kater-sprueche.json` und einzelne Wörter wie „Mitglied“, „er“, „sie“ nicht erfasst. Bis dahin nicht ausführen. Details: `2026-10-25_offen_konsistenz.md`.
- [ ] ESLint einrichten: `AGENTS.md` verlangt `npx expo lint`, das Repo hat keine ESLint-Konfiguration.

## Zeitnah (Daria, 30.10.2026)

- [ ] Übersetzungen automatisch mit DeepL (geplant für 01.11.2026): `2026-10-31_offen_deepl-uebersetzungen.md`. Vorher legt Daria den Schlüssel `DEEPL_API_KEY` in GitHub an.

- [x] Beim Posten Zugriff auf die Entwürfe: Das Erstellen-Blatt zeigt oben „Deine Entwürfe“ mit Kacheln, passend zum Modus (Privat, Gruppe, Kiez/Überall). Ein Tipp öffnet den Entwurf (`src/components/compose/DraftStrip.tsx`, 30.10.2026).

## Außerhalb des Codes

- [x] Mailversand über Brevo und kiezcoins.de (läuft seit 21.10.2026, Code-Mail um 09:55 angekommen, IP-Sperre in Brevo aus)
- [x] Auftragsverarbeitungsvertrag Brevo (über die Brevo-AGB akzeptiert)
- [ ] Auftragsverarbeitungsvertrag Supabase unterschreiben (prüfen, ob es schon passiert ist)
- [ ] Kodex und Rechtstexte überarbeiten (Daria)
- [ ] Anschrift (c/o) im Impressum, sobald die App öffentlich ist und ein Finanzierungskonzept steht

## 2026-10-31: aus eingearbeiteten Notizen

Offene Punkte aus Notizen, deren Rest am 2026-10-31 in Documentation steht.

- [ ] Edensteine aus dem Kiez zählen: In Gruppen rechnet die App sie aus den bestätigten Gruppenaufgaben (`src/data/groups.ts`, `leaderboard`). Für den Kiez fehlt ein Stand, zum Beispiel im Profil neben „verdient“ (`src/components/FashionProfile.tsx`, `src/app/me.tsx`). Frage an Daria: Wo sollen sie stehen? (aus `2026-10-27_kiez-edensteine.md`)
- [ ] Me-Challenge: Warum der Timer-Screen bei Daria nach dem Vorher-Foto hing, ist nicht geklärt. Im Web (Demo-Daten) führte das X immer in den Feed. Tritt es wieder auf: Gerät (iPhone-Web oder Android-App) und Weg dorthin notieren. (aus `2026-10-27_me-challenge-timer-stoppen.md`)
- [ ] Sichtbarkeit eines Beitrags nachträglich ändern (z. B. Privat → Kiez) gibt es noch nicht. (aus `2026-10-27_modi-privat-gruppe-kiez.md`)
- [ ] Das Onboarding fragt nach dem Kiez, auch wenn jemand nur Privat nutzt. (aus `2026-10-27_modi-privat-gruppe-kiez.md`)
- [ ] Frage an Daria: Die Wahl der Modi (verborgen, Standard) liegt auf dem Gerät. Soll sie geräteübergreifend gelten? Dann gehört sie ins Profil (Migration). (aus `2026-10-27_modi-privat-gruppe-kiez.md`)
- [ ] Frage an Daria: Der abgeschaltete Typ `wave` („Gruppen und Vereine rufen den ganzen Kiez zu gemeinsamen Aktionen auf“, `src/data/features.ts`) überschneidet sich mit der We-Challenge für mehrere Personen. Geht Wave in der offenen We-Challenge ohne Höchstgrenze auf? (aus `2026-10-27_we-challenge-mehrere-personen.md`)
- [ ] Übersetzungen von Claude prüfen lassen, ungeprüft: Status-Badges nach Geschlecht (gehört zu `2026-10-24_offen_gender-uebersetzungen-pruefen.json`), Hinweistexte unter dem Umschalter (`MESSAGE` in `src/components/AudienceHint.tsx`), leere Reiter (en, fr, uk, ru, he, ar, je mit Fassungen nach Geschlecht). (aus `2026-10-27_status-badges-deckname.md`, `2026-10-29_hinweis-sichtbarkeit-ueberall.md`, `2026-10-29_leere-reiter.md`)
- [ ] Leere Zustände angleichen: „Was Du so machst“, das Profil im Fashionable Look und das Erstellen-Blatt ohne Gruppe zeigen weiter die Sprechblase (`GroupsEmpty`) statt Cat The Käptn mit Titel und Knopf. (aus `2026-10-29_leere-reiter.md`)
- [ ] Frage an Daria: Update- und Installationshinweis (`UpdateHint.tsx`, `InstallHint.tsx`) zeigen einen kleinen farbigen Kater ohne Blase in einer Hinweiskarte. Sollen sie die Form „Kater im Kreis auf der Blase“ bekommen? (aus `2026-10-30_kater-sprechblase.md`)
- [ ] Figma-Frames tragen noch die alten Routennamen (`challenge/report`, `challenge/payment`, `settings/payout`, `onboarding/kodex` …). Gehört zu `2026-10-24_offen_figma-abgleich.md`. (aus `2026-10-30_routen-englisch.md`)
- [ ] Tour, Beispiel „Bild“: Der lila Ring umrahmt den ganzen Beitrag statt nur das Herz (`src/components/tour/TourDemo.tsx`). (aus `2026-10-31_tour-zum-ausprobieren.md`)

## 29.10.2026 – Pflicht für Daria: Text auf dem Foto

- [x] (29.10.2026, von Claude geprüft, PR #114 gemergt) Im Supabase-SQL-Editor den Inhalt von `supabase/migrations/20261029000200_bild_text.sql` ausführen (Branch `claude/bild-text`). Erst danach den PR mergen, sonst schlägt Posten mit Text auf dem Foto fehl. Bilder ohne Text gehen auch ohne Migration.
- [x] Claude Bescheid geben, dann prüft Claude die Datenbank.

## 29.10.2026 – Was Du so machst: positive Bestärkung (PR #113)

- [x] Ziele statt Meilensteine (Daria, 29.10.2026): erster Post, erste Me-/We-Challenge, je eine Me-/We-Challenge pro Monat, erste Einladung; Balken in Lila, Geschenk öffnet sich mit pinken Herzen (`src/components/Quests.tsx`)
- [x] Ziele „Deine erste Gruppe“ und „Du hast 2 Menschen zu Deiner Gruppe eingeladen“ (Daria, 29.10.2026), nur wenn Gruppen nicht ausgeschaltet sind. Eingeladen zählt weitere Mitglieder in selbst gegründeten Gruppen, da die Datenbank nicht speichert, wer eingeladen hat.
- [ ] „Danke von anderen“ erkennt Dank an Wörtern wie „Danke“, „super“, „toll“ oder Herzen im Kommentar. Später ggf. eigener Danke-Knopf.
- [ ] Fashionable Look (`FashionProfile.tsx`) zeigt noch Erstellt/Angenommen statt der Geschafft-Wand

## 29.10.2026 – Pflicht für Daria: Rückmeldung zur Tour

- [x] (29.10.2026, von Claude geprüft, PR #115 gemergt) Im Supabase-SQL-Editor den Inhalt von `supabase/migrations/20261029000300_tour_feedback.sql` ausführen (Branch `claude/tour-scroll`, PR #115). Erst danach mergen, sonst schlägt „Absenden“ auf der letzten Tour-Seite fehl.
- [x] (29.10.2026, von Claude geprüft, PR #116 gemergt) Im Supabase-SQL-Editor den Inhalt von `supabase/migrations/20261029000400_tour_feedback_ohne_konto.sql` ausführen (PR #116). Erst danach mergen, sonst schlägt „Absenden“ ohne Konto fehl.
- [ ] Texte von Claude in der Tour prüfen: Titel „Einfach ein schönes Bild“, Text zur Sichtbarkeit, Titel und Text „Privat: nur für Dich“ (`src/data/tour.ts`).

## 29.10.2026 – Pflicht für Daria: Modus „Überall“ und 5-km-Umkreis

- [x] (29.10.2026) Im Supabase-SQL-Editor den Inhalt von `supabase/migrations/20261029000100_ueberall_umkreis.sql` ausführen (Branch `claude/modus-ueberall`). Erst danach den PR mergen, sonst schlägt Mitmachen mit Standort fehl.
- [x] (29.10.2026) Claude Bescheid geben, dann prüft Claude die Datenbank und merged den PR (#111).
- Plan und offene Punkte: `Übergabe/2026-10-29_offen_modus-ueberall.md`

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
- [ ] Schreibweise „KiezCoins“ oder „KiezCoins“ in den Regeln vereinheitlichen
- [ ] Migration `20261027000300_app_texts_community_regeln.sql` im Supabase-SQL-Editor ausführen (Texte-Editor)

## 27.10.2026 (4) – We-Challenge mit mehreren Personen (Daria)

Plan und Entscheidungen: `Übergabe/2026-10-27_we-challenge-mehrere-personen.md`.

- [x] Offene Punkte im Plan beantworten (Daria, 27.10.2026)
- [x] Migration, Funktionen und App-Code bauen (Claude, 28.10.2026)
- [x] Nach PR #97: Inhalt von `supabase/migrations/20261028000300_we_challenge_teilnehmende.sql` im Supabase-SQL-Editor ausführen (Daria, 28.10.2026; Claude hat die Datenbank geprüft, PR #104 gemergt)

## 29.10.2026 – Offen nach dem Tag (Daria, Claude)

- [x] PR #120 mergen: Namen ohne Kiez wieder verdecken, nur ohne Hinweistext (Daria, 29.10.2026)
- [ ] Android-Update von Hand: Stand 30.10.2026 fehlen #122, #123, #124, #79, #103 (`Übergabe/2026-10-28_offen_android-updates-expo-minuten.md`)
- [x] `/laden` und `/qr` live (29.10.2026)
- [ ] `/laden` und `/qr` am Telefon testen, danach die QR-Codes drucken (`Übergabe/2026-10-29_offen_website-laden-qr.md`)
- [ ] Nach dem 01.11.2026 prüfen, ob der EAS-Workflow wieder startet
- [ ] Texte von Claude in der Tour prüfen (`Übergabe/2026-10-29_offen_tour.md`)
- [x] Migration `20261029000500_app_texts_anlegen.sql` eingespielt (Daria, 30.10.2026; Texte-Editor, Doku: `kiez-coins/app/Anleitung_App.md`, Abschnitt „Texte ändern“)
- [ ] PR #16 („Download ohne Supabase-Secret“) ohne Merge schließen: überholt, der Download läuft schon über `download_settings` (Daria bestätigt, dass er funktioniert)
- [ ] Notizen vom 29. und 30.10.2026 in Documentation übernehmen: Bild-Text, Tour, Modus „Überall“, Profil, Website, leere Reiter, Hinweis, Texte-Editor, Routen, Nutzungsbedingungen

