# Me-Challenge: Timer stoppen, Schließen blockiert nichts

Datum: 2026-10-27 · Status: Notiz für die Doku · Gehört nach: Documentation, Datenbank-Doku (Funktionen) und App-Stand, Abschnitt „Me-Challenge“.

Migration `supabase/migrations/20261027000100_before_after_stop_timer.sql` ist in Supabase eingespielt (27.10.2026).

## Anlass

Daria, 26.10.2026: Nach dem Vorher-Foto blieb der Timer-Screen offen, sie konnte die App nicht nutzen. Eine Me-Challenge soll den Screen nicht blockieren. Wird sie vorzeitig geschlossen, soll sie als Entwurf gelten, nicht als gestartet.

## Was sich ändert

- Neue Datenbankfunktion `stop_before_after_timer(p_challenge_id)`: setzt `timer_started_at` zurück auf null. Nur die eigene Me-Challenge im Status `draft`. Danach keine Leiste im Feed und kein automatisches Posten nach 48 h.
- Timer-Screen (`src/app/vorher-nachher/[id].tsx`), Timer läuft: neuer Knopf „Timer stoppen, Entwurf behalten“ mit Rückfrage. Der Hinweis unten sagt, dass das X in den Feed führt und der Timer oben im Feed wartet.
- „Timer starten“ nimmt in der ersten Sekunde nach dem Öffnen keinen Tipp an, damit ein zweiter Tipp auf „Vorher speichern“ den Timer nicht aus Versehen startet.
- Store: `beforeAfter.stopTimer(id)`, Demo-Modus setzt den Timer lokal zurück.

## Offen

Bei einem Nachbau im Web (Demo-Daten, Dev und Export unter `/app`) führte das X immer in den Feed. Warum es bei Daria hing, ist nicht geklärt. Falls es wieder auftritt: Gerät (iPhone-Web oder Android-App) und Weg dorthin notieren.
