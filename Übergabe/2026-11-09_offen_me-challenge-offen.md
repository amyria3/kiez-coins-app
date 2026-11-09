Pflichtaufgabe: Daria führt `supabase/migrations/20261109000200_me_challenge_offen.sql` im Supabase SQL Editor aus.

# Me-Challenge gleich offen statt Entwurf

**Stand 2026-11-09, offen bis zur Migration.** Ziel in Documentation: `kiez-coins/DATENBANK.md` (Migrationen, Funktionen) und die Beschreibung der Me-Challenge im Konzept.

Daria hat am 2026-11-09 entschieden:

- „Vorher posten“ (vorher „Vorher speichern“) legt keinen Entwurf mehr an, sondern eine offene Me-Challenge.
- Sie steht sofort im Feed des gewählten Modus (Privat, Gruppe, Kiez), mit Vorher-Foto und #vorher. Andere können liken und kommentieren.
- Fertig ist sie mit „Abschließen und posten“. Ohne Nachher schließt der Server sie ab: mit Timer 48 h nach dem Timerstart, ohne Timer 7 Tage nach dem Vorher, auch ohne Nachher-Foto.

## Datenbank

- Offen und nicht fertig: `status = 'open'` und `finished_at is null`. `deadline` ist der Zeitpunkt, zu dem der Server abschließt.
- Neue Funktion `open_before_after(p_challenge_id)`: macht den Entwurf aus `start_before_after` offen. Die App ruft sie gleich nach dem Anlegen und dem Setzen der Sichtbarkeit.
- `start_before_after_timer`, `stop_before_after_timer`, `update_before_after`, `finish_before_after` gehen auch bei offenen Me-Challenges. Timer starten setzt `deadline` auf Start plus 48 h, stoppen wieder auf Vorher plus 7 Tage.
- `publish_due_before_after` (pg_cron alle 5 Minuten) schließt auch offene Me-Challenges ab, sobald `deadline` vorbei ist.
- Ältere Me-Challenges ohne `finished_at` gelten als fertig. Alte Entwürfe laufen weiter wie bisher.
- Ohne Migration schlägt `open_before_after` fehl. Die App macht dann wie bisher einen Entwurf daraus.

## App

- `meInProgress()` in `src/data/format.ts`: Entwurf oder offen ohne `finished_at`.
- `before-after/[id]`: bleibt erreichbar, solange die Me-Challenge läuft. „Speichern“ statt „Als Entwurf speichern“, „Me-Challenge löschen“ (wie jeder Beitrag, wiederherstellbar), Hinweis auf die Frist von 7 Tagen.
- „Meine Posts“: Status „Läuft“ mit Frist oder „Timer läuft“, Knopf „Nachher aufnehmen“. Detailansicht der eigenen laufenden Me-Challenge: Knopf „Nachher aufnehmen“.
- Laufender Timer oben im Feed gilt auch für offene Me-Challenges.

## Nächster Schritt

Nach der Migration eine Me-Challenge anlegen und prüfen: Sie steht sofort im Feed, „Nachher aufnehmen“ führt zum Nachher, „Abschließen und posten“ macht sie fertig. Dann Inhalt in Documentation übernehmen und diese Datei löschen.
