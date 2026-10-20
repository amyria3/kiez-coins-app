# Offene Migrationen für Supabase

- **Datum:** 20.10.2026
- **Gehört nach:** Datenbank-Doku in Documentation (Liste der Migrationen, Tabellen `comments` und `challenges`).
- **Wer:** Daria. Claude hat aus der Code-Sitzung keinen Zugang zu Supabase.

## So führst Du die Migrationen aus

1. Öffne das Supabase-Projekt `aqxzxpxrshizlaqyjplw` und dort den SQL-Editor.
2. Kopiere den Inhalt der ersten Datei unten in eine neue Abfrage und klicke auf „Run“.
3. Wiederhole das mit der zweiten Datei. Die Reihenfolge stimmt mit den Dateinamen überein.
4. Prüfe unter „Table Editor“, dass die neuen Spalten da sind.
5. Trag in Documentation ein, dass beide Migrationen laufen, und lösch diese Datei.

Jede Datei läuft genau einmal. Ein zweiter Lauf bricht mit „already exists“ ab und ändert nichts.

## 1. `supabase/migrations/20261020000300_comment_replies.sql`

**Wozu:** Antworten auf Kommentare.

**Ändert:**
- `comments.reply_to_id uuid`, verweist auf einen Kommentar derselben Challenge.
- Eindeutigkeit `(id, challenge_id)` und ein zusammengesetzter Fremdschlüssel. So kann eine Antwort nur an einem Kommentar derselben Challenge hängen.
- Wird der Ausgangskommentar gelöscht, bleibt die Antwort stehen, und `reply_to_id` wird leer.
- Index auf `reply_to_id`.

**Danach prüfen:** In einer Challenge auf „Antworten“ tippen und absenden. Die Antwort steht eingerückt unter dem Kommentar.

## 2. `supabase/migrations/20261020000400_challenge_coords.sql`

**Wozu:** Entfernung im Feed („1,3 km“) und Sortierung von „In der Nähe“.

**Ändert:**
- `challenges.lat` und `challenges.lng` (double precision, mit Wertebereich-Prüfung).
- Update-Recht auf beide Spalten für angemeldete Nutzerinnen, damit Entwürfe den Punkt mit speichern.

**Danach prüfen:** Neue Challenge mit freigegebenem Standort erstellen. Im Table Editor stehen bei ihr Werte mit 3 Nachkommastellen in `lat` und `lng`. Im Feed steht am Beitrag die Entfernung.

**Bis sie läuft:** Die App speichert Challenges ohne Punkt. Es gibt keinen Fehler.
