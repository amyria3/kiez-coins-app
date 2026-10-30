# Texte-Editor findet alle Texte

Datum: 2026-10-29 · Status: umgesetzt, PR #122 gemergt, Migration eingespielt (Daria, 30.10.2026); noch in die Doku übernehmen · Ziel in Documentation: Datenbank-Doku (`app_texts`, Policy „Texte anlegen“), `app/Stand_App.md` (Texte-Editor)

## Fehler (Daria, 29.10.2026)

Die Suche im Texte-Editor fand „Was du hier“ nicht („0 von 906“). Die Suche selbst funktioniert und achtet nicht auf Groß- und Kleinschreibung. Der Editor zeigte aber nur Zeilen aus `app_texts`: 906 von rund 1360 Texten. Neue Texte kamen bisher nur in die Tabelle, wenn jemand `node scripts/app-texts.mjs` ausgeführt und das SQL eingespielt hat.

## Umsetzung

- `src/app/texte.tsx`: Der Editor ergänzt alle Texte aus dem Code (`src/data/textSeiten.json`), die noch keine Zeile haben.
- `src/data/remote.ts`, `saveAppText`: Gibt es die Zeile noch nicht, legt die App sie beim Speichern an.
- Migration `20261029000500_app_texts_anlegen.sql`: Moderatorinnen dürfen Zeilen anlegen (Spalten `original`, `text` und die Sprachspalten). Lokal mit Postgres 16 getestet: Moderatorin legt an, andere werden abgelehnt, Skript läuft zweimal ohne Fehler.

## Offene Punkte

- Neue Texte haben bis zum nächsten Lauf von `scripts/app-texts.mjs` keinen Ort (Spalte `ort`).
