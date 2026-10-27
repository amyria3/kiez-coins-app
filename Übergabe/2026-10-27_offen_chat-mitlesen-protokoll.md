# Protokoll fürs Mitlesen privater Chats

Pflichtaufgabe: Migration `supabase/migrations/20261027000100_chat_access_log.sql` ausführen (SQL-Editor oder Supabase-MCP `apply_migration`), sobald Daria den PR freigegeben hat.

## Stand (27.10.2026)

Daria will private Chats im Moment mitlesen können, braucht aber mindestens eine Möglichkeit nachzuvollziehen, ob sie oder Claude einen Chat geöffnet hat. Ende-zu-Ende-Verschlüsselung ist deshalb vorerst zurückgestellt (Aufwand etwa 1 bis 2 Wochen, Push dann ohne Inhalt).

Die Migration bringt:

1. `chat_access_log`: dauerhaftes Protokoll mit Zeit, wer (`Daria` oder `Claude`), Paar, Grund, Anzahl Nachrichten.
2. `chat_einsehen(person_a, person_b, wer, grund)`: der einzige vorgesehene Weg zum Lesen. Schreibt zuerst ins Protokoll, gibt dann den Chat zurück. Nur für die Rolle `postgres` (SQL-Editor, MCP), nicht aus der App.
3. pgaudit als Sicherheitsnetz: Jedes direkte Lesen von `public.messages` durch `postgres` oder `service_role` steht im Postgres-Log (Dashboard > Logs > Postgres, nach `AUDIT` suchen). App-Nutzer:innen werden nicht protokolliert.

Regel für Claude steht in `AGENTS.md` (Abschnitt Rules).

## Grenzen

- Daria und Claude arbeiten beide als Rolle `postgres`. Wer gelesen hat, steht nur im Protokoll, weil es beim Aufruf angegeben wird. Es ist eine Selbstverpflichtung, kein technischer Zwang.
- Im Free-Plan hält Supabase das Postgres-Log nur einen Tag. pgaudit zeigt Umgehungen also nur kurz. Dauerhaft ist nur `chat_access_log`.
- Die Supabase-Tabellenansicht im Dashboard läuft möglicherweise über eine andere Rolle und wird dann von pgaudit nicht erfasst. Nach dem Ausführen einmal prüfen: Chat in der Tabellenansicht öffnen, danach im Log nach `AUDIT` suchen.

## Nächste Schritte

- Migration ausführen, danach Test: `select * from public.chat_einsehen('<id a>', '<id b>', 'Claude', 'Test');` und `select * from public.chat_access_log;`
- Datenschutzerklärung und Kodex: Hinweis, dass die Betreiberin private Nachrichten in begründeten Fällen (z. B. Meldungen) einsehen kann und jedes Einsehen protokolliert wird.
- Datenbank-Doku in Documentation ergänzen, dann diese Notiz löschen.
- Später optional: Protokoll im Moderations-Screen anzeigen (Moderator:innen dürfen es schon lesen).

## Offene Fragen an Daria

- Soll das Protokoll für Nutzer:innen sichtbar sein, z. B. „Dein Chat mit X wurde am … von der Moderation eingesehen“?
