# Protokoll fürs Mitlesen privater Chats

Migration `supabase/migrations/20261027000100_chat_access_log.sql` ausgeführt (Daria im SQL-Editor, 27.10.2026). Geprüft: Tabelle, beide Funktionen, Cron-Job ruft `messages_alte_loeschen()` auf, pgaudit 17.1 aktiv für `postgres` und `service_role`, die App darf `chat_einsehen` nicht aufrufen. Der erste automatische Eintrag kommt beim nächsten Lauf um 3:17 UTC.

## Stand (27.10.2026)

Daria will private Chats im Moment mitlesen können, braucht aber mindestens eine Möglichkeit nachzuvollziehen, ob sie oder Claude einen Chat geöffnet hat. Ende-zu-Ende-Verschlüsselung ist deshalb vorerst zurückgestellt (Aufwand etwa 1 bis 2 Wochen, Push dann ohne Inhalt).

Die Migration bringt:

1. `chat_access_log`: dauerhaftes Protokoll mit Zeit, Art (`person` oder `automatisch`), wer, Paar, Grund, `targeted` (gezielt?), `content_read` (Inhalte gelesen?), Anzahl Nachrichten. Ein Check-Constraint erzwingt: `person` heißt gezielt und Inhalte gelesen, `automatisch` heißt keine Person, nicht gezielt, keine Inhalte.
2. `chat_einsehen(person_a, person_b, wer, grund)`: der einzige vorgesehene Weg zum Lesen. Schreibt zuerst ins Protokoll, gibt dann den Chat zurück. Nur für die Rolle `postgres` (SQL-Editor, MCP), nicht aus der App.
3. `messages_alte_loeschen()`: das tägliche Löschen nach einem Monat (pg_cron, 3:17 UTC) läuft jetzt über diese Funktion. Sie prüft nur das Datum und vermerkt jeden Lauf als `automatisch` mit der Zahl gelöschter Nachrichten (Daria, 27.10.2026: automatische Vorgänge müssen als solche erkennbar sein).
4. pgaudit als Sicherheitsnetz: Jedes direkte Lesen von `public.messages` durch `postgres` oder `service_role` steht im Postgres-Log (Dashboard > Logs > Postgres, nach `AUDIT` suchen). App-Nutzer:innen werden nicht protokolliert.

Regel für Claude steht in `AGENTS.md` (Abschnitt Rules).

## Grenzen

- Daria und Claude arbeiten beide als Rolle `postgres`. Wer gelesen hat, steht nur im Protokoll, weil es beim Aufruf angegeben wird. Es ist eine Selbstverpflichtung, kein technischer Zwang.
- Im Free-Plan hält Supabase das Postgres-Log nur einen Tag. pgaudit zeigt Umgehungen also nur kurz. Dauerhaft ist nur `chat_access_log`.
- Die Supabase-Tabellenansicht im Dashboard läuft möglicherweise über eine andere Rolle und wird dann von pgaudit nicht erfasst. Nach dem Ausführen einmal prüfen: Chat in der Tabellenansicht öffnen, danach im Log nach `AUDIT` suchen.

## Nächste Schritte

- Nach dem ersten Cron-Lauf prüfen: `select * from public.chat_access_log;` zeigt einen Eintrag `automatisch` mit Darias Wortlaut. Im Postgres-Log nachsehen, wie der Lauf dort erscheint.
- Datenschutzerklärung und Kodex: Hinweis, dass die Betreiberin private Nachrichten in begründeten Fällen (z. B. Meldungen) einsehen kann und jedes Einsehen protokolliert wird.
- Datenbank-Doku in Documentation ergänzen, dann diese Notiz löschen.
- Später optional: Protokoll im Moderations-Screen anzeigen (Moderator:innen dürfen es schon lesen).

## Offene Fragen an Daria

- Soll das Protokoll für Nutzer:innen sichtbar sein, z. B. „Dein Chat mit X wurde am … von der Moderation eingesehen“?
