# Bildkommentare

Datum: 2026-11-10 · Status: umgesetzt, Notiz für die Doku · Ziel in Documentation: Entscheidungen (Abschnitt „Kommentare“) und Datenbank-Doku (Tabelle `comments`, Speicher `photos`, Tabelle `features`)

Pflichtaufgabe: Migration `supabase/migrations/20261110001300_bildkommentare.sql` im SQL-Editor ausführen. Ohne sie zeigt die App den Bild-Knopf, das Abschicken mit Bild schlägt aber fehl.

## Entscheidung

Daria, 2026-11-10: Kommentare können ein Bild haben. Text, Bild oder beides, höchstens ein Bild. Funktion mit eigenem Schlüssel `bildkommentare`, für alle an.

## Was die Migration ändert

- `comments.image_path` (Pfad im Speicher `photos`, Ordner der Person). `body` darf leer sein, wenn ein Bild dabei ist.
- Restriktive Regel beim Schreiben: Bild nur aus dem eigenen Ordner und nur, wenn `feature_an('bildkommentare', <Gruppe der Challenge>)` an ist.
- Neue Regel „Moderation löscht Kommentare“ und „Moderation löscht Kommentarbilder“ (nur Dateien, die an einem Kommentar hängen).
- Zeile `bildkommentare` in `public.features`.

## App

- Kamera-Knopf im Kommentarfeld, Vorschau mit ✕ über dem Feld. Bild wird wie alle Fotos auf 2048 px verkleinert.
- Unter dem Kommentar ein Vorschaubild, ein Tipp zeigt es groß.
- Drei Punkte am Kommentar: „Löschen“ für eigene Kommentare und für Moderatorinnen, „Melden“ wie bisher für fremde. Beim Löschen geht erst das Bild, dann der Kommentar.
