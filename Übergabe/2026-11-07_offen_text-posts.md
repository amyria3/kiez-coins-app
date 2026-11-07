# Posts nur mit Text

Pflichtaufgabe: Migration [20261107000100_text_posts.sql](https://github.com/amyria3/kiez-coins-app/blob/main/supabase/migrations/20261107000100_text_posts.sql) im Supabase-SQL-Editor ausführen, bevor der PR gemergt wird. Sonst schlägt das Posten von Text fehl (Bilder und Challenges gehen weiter).

- Datum: 2026-11-07
- Status: offen (Teil 1 gebaut, Teil 2 fehlt)
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Beiträge“, und die Datenbank-Doku (Spalten `challenges.pages`, `challenges.sheet_font`, Funktion `set_challenge_pages`)

## Entscheidungen (Daria, 07.11.2026)

- Neuer Reiter „Text“ beim Erstellen, im Kiez, privat und in Gruppen. Daria tippt auf ein Blatt in unserem Weiß `#FFF8ED`. Ist das Blatt voll, geht es auf dem nächsten weiter.
- Format 4:5 wie Instagram-Slides, höchstens 10 Blätter. Titel freiwillig, er steht oben auf dem ersten Blatt.
- Links und @Namen sind auf den Blättern hervorgehoben und tippbar.
- Schriften zur Auswahl: Inter (Standard), Redaction 35, Rubik, Barriecito, Nothing You Could Do, Playwrite NZ, Patrick Hand, Noto Sans Mono.
- Export: mit Darias Profilbild (nicht einem Foto zum Post) und dem KiezCoins-Logo.

## So ist es gebaut

- Ein Text-Post ist ein Post vom Typ `photo` ohne Foto, mit `pages` (ein Eintrag je Blatt) und `sheet_font`. So laufen Ort, Vorschau, Entwürfe, Gruppen, Privat, Löschen und Wiederherstellen wie beim Bild.
- `src/components/TextSheets.tsx`: `SheetEditor` (Blätter zum Schreiben), `Sheet`, `SheetPager` (Feed), `TextHero` (Vorschau und Detail). Der Editor misst den Text mit unsichtbaren Kopien und schiebt den Rest ab dem letzten ganzen Wort aufs nächste Blatt. Wird Platz frei, rücken Wörter nach.
- Schrift und Ränder wachsen mit der Breite des Blatts. Gespeichert werden die Blätter so, wie sie beim Schreiben umbrechen.
- `src/data/sheetFonts.ts`: Schriften, geladen erst, wenn Blätter zu sehen sind.
- Weiterposten ist für Text-Posts aus, bis der Export steht.

## Offen

1. Teil 2: Export der Blätter als Bilder (Profilbild, Logo), Slides für Instagram (Karussell), Thread auf BlueSky. Edge Function `weiterposten` kennt `pages` noch nicht; die öffentliche Seite `kiezcoins.de/c/<id>` zeigt bei Text-Posts noch keinen Text.
2. Poppins für Hindi (TODO.md).
3. Im Feed-Kopf zählt ein Text-Post bei „Bild“ mit (`src/app/feed.tsx`, `photos`).
4. Am Telefon testen: Tippen über mehrere Blätter (iOS-Web und Android), Zurück am Blattanfang, Einfügen von langem Text.
5. Übersetzungen der neuen Texte (Reiter „Text“, Hinweise, „Nur Text“).
