# Migrationen für Supabase vom 20.10.2026

**Status:** Daria hat die Migrationen 1 bis 5 am 20. und 21.10.2026 im SQL-Editor ausgeführt. Offen sind Migration 6 (Gruppen), sobald der Code auf `main` liegt, und der Eintrag in Documentation.

- **Datum:** 20.10.2026
- **Gehört nach:** Datenbank-Doku in Documentation (Liste der Migrationen, Tabellen `comments` und `challenges`).
- **Wer:** Daria. Claude hat aus der Code-Sitzung keinen Zugang zu Supabase.

## So führst Du die Migrationen aus

1. Öffne das Supabase-Projekt `aqxzxpxrshizlaqyjplw` und dort den SQL-Editor.
2. Kopiere den Inhalt der ersten Datei unten in eine neue Abfrage und klicke auf „Run“.
3. Wiederhole das mit den übrigen Dateien. Die Reihenfolge stimmt mit den Dateinamen überein.
4. Prüfe unter „Table Editor“, dass die neuen Spalten da sind.
5. Trag in Documentation ein, dass die Migrationen laufen, und lösch diese Datei.

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

## 3. `supabase/migrations/20261020000500_challenge_views.sql`

**Wozu:** Aufrufe in „Deine Challenges“.

**Ändert:**
- Neue Tabelle `challenge_views` (`challenge_id`, `user_id`, `created_at`), pro Person und Challenge höchstens ein Eintrag.
- RLS: Zählen darf jede angemeldete Person, außer bei eigenen Challenges. Lesen darf nur, wer die Challenge erstellt hat.
- Kein Update und kein Löschen für Nutzerinnen.

**Danach prüfen:** Mit einem zweiten Konto eine Challenge öffnen. In „Deine Challenges“ des ersten Kontos steht bei „Aufrufe“ 1.

**Bis sie läuft:** Die Karte zeigt bei „Aufrufe“ einen Strich. Es gibt keinen Fehler.

## 4. `supabase/migrations/20261020000600_delete_open_challenge.sql`

**Wozu:** Offene Challenges löschen. Seit `20261020000200` durften nur Entwürfe gelöscht werden. Deshalb hat „Löschen“ bisher nicht geklappt.

**Ändert:** Die Regel heißt jetzt „Eigene Challenge löschen“ und erlaubt Entwürfe und offene Challenges, solange niemand angenommen hat.

**Danach prüfen:** In „Deine Challenges“ eine offene Challenge löschen. Sie verschwindet aus dem Feed.

**Offen:** Das Foto bleibt im Storage liegen. Aufräumen kommt später (Storage-Regel oder Funktion).

## 5. `supabase/migrations/20261020000700_challenge_extra_images.sql`

**Wozu:** Bis zu 2 weitere Fotos pro Challenge.

**Ändert:** `challenges.extra_image_paths text[]` (Standard leer, höchstens 2 Einträge) und Update-Recht darauf für Entwürfe.

**Danach prüfen:** Challenge mit 3 Fotos erstellen. Im Detail lässt sich das Foto seitlich wischen, Punkte zeigen die Anzahl.

**Bis sie läuft:** Die App speichert nur das Hauptfoto. Es gibt keinen Fehler.

## 6. `supabase/migrations/20261021000100_groups.sql`

**Wozu:** Gruppen mit Edensteinen. Die Datei liegt auf `main`, sobald Daria den Branch `claude/gruppen` freigibt. Umsetzung: `Übergabe/2026-10-21_gruppen.md`.

**Ändert:**
- Neue Tabellen `groups` und `group_members` mit RLS: Lesen nur als Mitglied, Schreiben nur über Funktionen.
- `challenges.group_id` und `challenges.edensteine` (1 bis 10, nur bei Gruppenaufgaben, dann ohne Bounty). Gruppenaufgaben brauchen keinen Ort.
- Regeln: Gruppenaufgaben und ihre Kommentare sehen nur Mitglieder. Kiez-Challenges entstehen weiter nur ohne Gruppe.
- Funktionen `create_group`, `join_group`, `leave_group`, `remove_group_member`, `transfer_group_founder`.
- `accept_challenge` neu: Gruppenaufgaben nehmen Mitglieder ohne Kiez an.

**Danach prüfen:** In der App unter „Gruppen“ eine Gruppe gründen. Mit einem zweiten Konto über den Code beitreten. Die Gruppenseite zeigt dann 2 Mitglieder.

**Bis sie läuft:** Der Reiter „Gruppen“ zeigt nur „Gruppe gründen“ und „Mit Code beitreten“. Beides meldet einen Fehler.
