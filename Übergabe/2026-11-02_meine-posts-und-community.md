# Meine Posts kürzer, Zahlen in zwei Zeilen; Community-Zeile in „Was Du so machst“

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitte „Meine Posts“ und „Was Du so machst“

## Daria hat entschieden

- Die Karten in „Meine Posts“ sind kürzer, die vier Zahlen stehen in zwei Zeilen.
- Vor dem Titel „Was Du so machst“ steht nur die Krone; für das Schiffchen reicht der Platz nicht.
- Unter den Zielen steht eine Zeile: Krone, Herz, Schiffchen auf Wellen, Daumen hoch, dann „Diese Community braucht Dich“.

## Umsetzung

- `src/app/manage.tsx`: Kartenhöhe höchstens 410 pt (sonst 85 % der Seite). Ansichten und Likes in der ersten, Kommentare und Online-Dauer in der zweiten Zeile.
- `src/app/me.tsx`: `CrownIcon` vor dem Titel; Community-Zeile nach `Quests`, nur im Kiez-Look. Der Satz bricht unter die Icons, wenn er nicht daneben passt.
- Übersetzungen des neuen Satzes in `src/i18n/*.json`, Zuordnung `reise` in `src/data/textSeiten.json`. Muttersprachliche Prüfung steht aus wie bei den übrigen Übersetzungen.
