# We-Challenge: Mehrere Personen machen mit

Pflichtaufgabe: Daria führt nach der Migration aus PR #97 die Migration `supabase/migrations/20261028000300_we_challenge_teilnehmende.sql` im Supabase-SQL-Editor aus. Erst danach merged Claude den PR.

Zweck: Plan und Bau für We-Challenges mit mehreren Teilnehmenden. Stand: 28.10.2026. Status: offen, gebaut, wartet auf die Migration. Gehört nach: Documentation, App-Stand und Entscheidungen, Abschnitt „We-Challenge“, und Datenbank-Doku (Tabelle `challenge_participants`, neue Funktionen).

## Daria will mehrere Personen in einer We-Challenge

Daria, 27.10.2026: Nach dem ersten Annehmen bleibt eine We-Challenge offen für weitere Personen.

- Die Erstellerin legt eine Höchstzahl an Teilnehmenden fest.
- Weitere Personen treten bei, bis die Höchstzahl erreicht ist.
- **Offen:** Jede Person, die die Challenge sieht, tritt direkt bei.
- **Auf Anfrage:** Die Erstellerin nimmt jede Anfrage an oder lehnt sie ab. Sie schließt Teilnehmende auch wieder aus.

## Heute trägt eine We-Challenge genau eine Person

- `challenges.assignee_id` hält die eine annehmende Person (`20261019000100_tables.sql`).
- `accept_challenge` setzt `open → accepted` und `assignee_id`. Danach nimmt niemand mehr an (`20261021000100_groups.sql`, letzte Fassung in `20261023000300_before_after.sql`).
- `report_challenge` (nur `assignee_id`), `confirm_challenge` und `reject_challenge` (nur Erstellerin) gehen von genau einer Person aus (`20261019000300_status_functions.sql`).
- Belohnung: Bounty in Euro oder 1 bis 10 Edensteine. Die Rangliste der Gruppe zählt die Edensteine bestätigter Aufgaben für `assigneeId` (`src/data/groups.ts`). Edensteine im Kiez kommen mit PR #97.
- Operationsname (`operation_names`) und Zahlungsfreigabe (`payout_shares`) gelten je Challenge für eine Person.
- `has_open_work` sperrt Pausieren und Löschen des Kontos bei offener Arbeit, ebenfalls nur über `assignee_id`.

## Eine neue Tabelle hält alle Teilnehmenden

Vorschlag für die Migration `JJJJMMTT_we_challenge_teilnehmende.sql`:

```sql
alter table public.challenges
  add column max_participants integer not null default 1 check (max_participants >= 1),
  add column join_mode text not null default 'open' check (join_mode in ('open', 'approval'));

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('requested', 'joined', 'declined', 'removed', 'left')),
  requested_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (challenge_id, user_id)
);
```

- `max_participants = 1` ist der heutige Ablauf. Bestehende Challenges ändern sich nicht.
- `assignee_id` bleibt als erste Person erhalten. So laufen Feed, Detailansicht und Rangliste ohne Umbau weiter, bis die App die Liste liest.
- Die Migration trägt jede bestehende `assignee_id` als `joined` in die neue Tabelle ein.
- Schreiben nur über Funktionen (security definer), Lesen für alle, die die Challenge sehen.

## Neue und geänderte Funktionen steuern den Ablauf

- `join_challenge(id)`: Bei „Offen“ tritt die Person direkt bei (`joined`), bei „Auf Anfrage“ entsteht `requested`. Erlaubt in `open` und `accepted`, vor der Frist, unter der Höchstzahl, nicht für die Erstellerin. Die erste Person setzt wie heute `accepted` und `assignee_id`. Eine Sperre (`for update`) verhindert, dass zwei Personen gleichzeitig über die Höchstzahl kommen, wie bei `join_group`.
- `accept_challenge` ruft künftig `join_challenge` auf.
- `answer_join_request(id, user_id, ok)`: nur Erstellerin, `requested → joined` oder `declined`.
- `remove_participant(id, user_id)`: nur Erstellerin, `joined → removed`, nur vor dem Erledigt-Melden.
- `leave_challenge(id)`: Teilnehmende steigen aus (`left`). Steigt die letzte Person aus, geht die Challenge zurück auf `open`.
- `report_challenge`, `has_open_work` und die Leserechte für Operationsnamen prüfen die Teilnehmenden-Liste statt `assignee_id`.
- Gruppenaufgaben: Beitreten nur als Mitglied.

## Die App zeigt, wer mitmacht

- Erstellen und Bearbeiten (`ComposeSheet`, `challenge/create/step-1`, `challenge/[id]/edit`): Feld „Wie viele machen mit?“ (Stepper, Vorgabe 1) und Umschalter „Offen“ / „Auf Anfrage“, beides erst ab 2 Personen. Die Höchstzahl sinkt beim Bearbeiten nie unter die Zahl der Teilnehmenden.
- Feed (`ChallengePost.tsx`): Avatare der Teilnehmenden übereinander und „3 von 5“.
- Detailansicht (`challenge/[id]/index.tsx`): Liste der Teilnehmenden. Knopf „Mitmachen“ bzw. „Anfrage senden“, „Anfrage gesendet“, „Aussteigen“. Bei voller Challenge „Alle Plätze vergeben“.
- Erstellerin: Bereich „Anfragen“ mit Annehmen und Ablehnen, bei jeder Person „Ausschließen“ mit Rückfrage.
- Texte in allen Sprachen der App, mit Gender-Formen (`src/i18n`).
- Umfang: eine Migration, vier bis fünf Funktionen, drei Bildschirme und ein Feed-Baustein.

## Arbeitsteilung zwischen Claude und Daria

- Daria führt die Migration im Supabase-SQL-Editor aus. Claudes Zugang zu Supabase darf nur lesen.
- Claude schreibt Migration, Funktionen und App-Code in einem PR, prüft die Datenbank nach Darias Ausführung und merged danach.

## Daria hat die Fragen am 27.10.2026 beantwortet

1. **Auf Anfrage gilt schon für die erste Person.** Die erste Person setzt die Challenge erst nach der Zusage der Erstellerin auf `accepted`.
2. **Die Erstellerin wählt die Höchstzahl.** Die App setzt keine feste Obergrenze. Gruppenaufgaben begrenzt die Größe der Gruppe.
3. **Die erste Person meldet erledigt, für alle.** Ein gemeinsames Nachher-Foto, alle Teilnehmenden sehen die Meldung.
4. **Jede Person bekommt die volle Zahl Edensteine.**
5. **Challenges mit mehreren Personen tragen nur Edensteine, keine Euro-Bounty.**

Claude setzt die übrigen Vorschläge um:

- Die Erstellerin bestätigt einmal für alle. Ablehnen setzt alle zurück auf `accepted`.
- Ab `reported` ist die Liste fest: kein Beitreten, kein Ausschließen, kein Aussteigen.
- Ausschließen geht bis zum Erledigt-Melden, ohne Pflicht-Grund.
- Jede Person tauft die Challenge für sich (Operationsname).
- Steigt die erste Person aus, rückt die nächste nach und meldet erledigt.

## Claude hat am 28.10.2026 gebaut

- Migration `20261028000300_we_challenge_teilnehmende.sql`: Spalten `max_participants` und `join_mode`, Tabelle `challenge_participants`, Funktionen `join_challenge`, `answer_join_request`, `remove_participant`, `leave_challenge`, `set_challenge_participation`, interne Hilfe `challenge_sync_first`. `accept_challenge` und `give_back_challenge` rufen die neuen Funktionen auf, ältere App-Fassungen laufen weiter. `has_open_work` und die Regel „Operation taufen“ zählen alle Teilnehmenden. Lokal mit Postgres 16 geprüft: Anfragen, volle Challenge, Nachrücken, Ausschließen, Euro-Sperre, zweiter Lauf.
- Die Datenbank hält die erste Person in `assignee_id`. Steigt sie aus oder wird ausgeschlossen, rückt die Person nach, die am längsten dabei ist. Ohne Teilnehmende ist die Challenge wieder `open`.
- Wechselt die Erstellerin von „Auf Anfrage“ zu „Offen“, bleiben offene Anfragen stehen. Die Person tritt mit einem neuen Tipp auf „Mitmachen“ direkt bei.
- App: `src/data/weChallenge.ts` (Hilfen), `src/components/compose/ParticipantsField.tsx` (Feld im Erstellen und Bearbeiten), `src/components/Participants.tsx` („Wer macht mit“ mit Anfragen und Ausschließen), Detailansicht, Feed („2 von 5 dabei“), Rangliste der Gruppe (alle Teilnehmenden bekommen die Edensteine), Übersetzungen in allen Sprachen.
- Der PR baut auf PR #97 (Edensteine im Kiez) auf und enthält dessen Stand.

## Offene Punkte

- **Wave:** Der abgeschaltete Typ `wave` („Gruppen und Vereine rufen den ganzen Kiez zu gemeinsamen Aktionen auf“, `src/data/features.ts`) überschneidet sich mit diesem Plan. Geht Wave in der offenen We-Challenge ohne Höchstgrenze auf?
