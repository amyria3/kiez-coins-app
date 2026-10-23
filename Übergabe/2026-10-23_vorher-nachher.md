# Vorher-Nachher-Beiträge (2026-10-23)

Pflichtaufgabe: Migration `20261023000300_before_after` im SQL-Editor ausführen, nach `20261022000100_photo_posts`, `20261021000100_groups` und `20261022000500_messages` (pg_cron). Ohne sie lassen sich keine Vorher-Nachher-Beiträge anlegen. Stand: noch nicht ausgeführt.

Gehört nach Documentation: `kiez-coins/DATENBANK.md` (Migration, Spalten, Funktionen, Cron-Job), `kiez-coins/app/Stand_App.md` (Offene Pflichtaufgaben), Konzept nach `kiez-coins/konzept/`.

## Idee von Daria

- Neuer Beitragstyp neben Challenge und Bild. Man hält fest, wie man etwas repariert, umbaut oder verschönert.
- Ablauf: Vorher-Foto, Überschrift und Vorher-Text speichern, Timer starten, Aktion ausführen, Nachher-Foto und Nachher-Text, posten. Der Timer läuft im Hintergrund weiter. Höchstens 48 h; fehlt dann das Nachher-Foto, wird trotzdem gepostet. Löschen wie bei jedem Beitrag.
- Eine gemeinsame Überschrift. Beide Texte beginnen automatisch mit `#vorher` bzw. `#nachher` und landen zusammen in einem Text. Challenge-Angaben (Bounty, Frist, Ort) entfallen.
- Im Feed nimmt Vorher 1/3 und Nachher 2/3 der Höhe ein. Ein Tipp auf eines der beiden: Es nimmt 5/6 der Höhe ein, die Karte wächst um 25 %. Alles animiert.
- Beim Erstellen ersetzt ein Schalter mit drei Optionen den bisherigen Switch: Challenge, Vorher-Nachher, Bild. Geht öffentlich im Kiez und in Gruppen.
- Test-Screens beider Looks: Artifact „Vorher-Nachher“ (Daria hat den Link). Feedback steht aus.

## Datenbank

- `type = 'before_after'`, keine Bounty, keine Edensteine, kein Annehmen.
- Neue Spalten: `before_text`, `after_text` (je höchstens 240 Zeichen), `timer_started_at`, `finished_at`. Fotos in `image_before_path` und `image_after_path`; `image_path` zeigt nach dem Posten auf das Nachher-Foto, sonst auf das Vorher-Foto.
- Funktionen: `start_before_after(group_id, title, before_text, image_before_path)` → id, `start_before_after_timer(id)`, `update_before_after(id, …)` (null lässt einen Wert stehen), `finish_before_after(id)`. Intern: `publish_before_after_row`, `publish_due_before_after`, `before_after_own_path`.
- Beim Posten: `body` = `#vorher …` und `#nachher …` in zwei Zeilen, Überschrift leer → „Vorher-Nachher“, Ort = Kiez des Profils (Gruppen ohne Ort), `deadline` = Zeitpunkt des Postens (ohne Bedeutung), Dauer = `finished_at - timer_started_at`, höchstens 48 h.
- Cron-Job `vorher_nachher_nach_48_stunden_posten` alle 5 Minuten.
- `accept_challenge` lehnt `before_after` ab. `challenges_group_reward` erlaubt Vorher-Nachher in Gruppen ohne Edensteine.
- Gegen alle Migrationen in einem lokalen Postgres 16 geprüft, auch ein zweiter Lauf.
