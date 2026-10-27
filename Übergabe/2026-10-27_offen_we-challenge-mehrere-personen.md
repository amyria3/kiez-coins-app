# We-Challenge: Mehrere Personen machen mit

Zweck: Plan für We-Challenges mit mehreren Teilnehmenden, noch ohne Code. Stand: 27.10.2026. Status: offen, wartet auf Darias Antworten unter „Offene Punkte“. Gehört nach: Documentation, App-Stand und Entscheidungen, Abschnitt „We-Challenge“.

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
  add column max_participants integer not null default 1 check (max_participants between 1 and 13),
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
- Gruppenaufgaben: Beitreten nur als Mitglied. Die Höchstzahl liegt bei höchstens 13, der Größe einer Gruppe.

## Die App zeigt, wer mitmacht

- Erstellen und Bearbeiten (`ComposeSheet`, `challenge/create/step-1`, `challenge/[id]/edit`): Feld „Wie viele machen mit?“ (Stepper, Vorgabe 1) und Umschalter „Offen“ / „Auf Anfrage“, beides erst ab 2 Personen. Die Höchstzahl sinkt beim Bearbeiten nie unter die Zahl der Teilnehmenden.
- Feed (`ChallengePost.tsx`): Avatare der Teilnehmenden übereinander und „3 von 5“.
- Detailansicht (`challenge/[id]/index.tsx`): Liste der Teilnehmenden. Knopf „Mitmachen“ bzw. „Anfrage senden“, „Anfrage gesendet“, „Aussteigen“. Bei voller Challenge „Alle Plätze vergeben“.
- Erstellerin: Bereich „Anfragen“ mit Annehmen und Ablehnen, bei jeder Person „Ausschließen“ mit Rückfrage.
- Texte in allen Sprachen der App, mit Gender-Formen (`src/i18n`).
- Umfang: eine Migration, vier bis fünf Funktionen, drei Bildschirme und ein Feed-Baustein.

## Arbeitsteilung zwischen Claude und Daria

- Daria beantwortet die offenen Punkte und führt die Migration im Supabase-SQL-Editor aus. Claudes Zugang zu Supabase darf nur lesen.
- Claude schreibt Migration, Funktionen und App-Code in einem PR, prüft die Datenbank nach Darias Ausführung und merged danach.

## Offene Punkte

1. **Erstes Annehmen:** Gilt „Auf Anfrage“ schon für die erste Person? Vorschlag: ja. Sonst bestimmt die erste Person ungeprüft mit.
2. **Höchstzahl:** Bis wie viele Personen? Vorschlag: 13 wie bei Gruppen.
3. **Erledigt melden:** Meldet eine Person für alle (ein gemeinsames Nachher-Foto), oder meldet jede Person einzeln? Vorschlag: eine Person meldet für alle, alle Teilnehmenden sehen die Meldung. Das passt zum Bildpaar aus Vorher und Nachher.
4. **Bestätigen:** Bestätigt die Erstellerin einmal für alle? Vorschlag: ja. Ablehnen setzt alle zurück auf `accepted`.
5. **Edensteine:** Bekommt jede Person die volle Zahl, oder teilen sich alle die Edensteine? Vorschlag: jede Person die volle Zahl. Edensteine sind ideell, Teilen ergibt bei 3 Edensteinen und 2 Personen Bruchteile.
6. **Euro-Bounty:** Daria will das Thema Geld vorerst aus den Texten nehmen. Vorschlag: Challenges mit mehreren Personen tragen nur Edensteine. Mehrere Zahlungen an verschiedene Personen entfallen damit.
7. **Beitreten nach dem Erledigt-Melden:** Vorschlag: nicht mehr möglich. Ab `reported` ist die Liste fest.
8. **Ausschließen:** Bis wann darf die Erstellerin ausschließen, und sieht die ausgeschlossene Person einen Grund? Vorschlag: bis zum Erledigt-Melden, ohne Pflicht-Grund, mit kurzer Mitteilung „Du bist nicht mehr dabei“.
9. **Operationsname:** Tauft jede Person für sich, wie heute, oder gibt die erste Person den Namen für alle vor? Vorschlag: jede Person für sich.
10. **Wave:** Der abgeschaltete Typ `wave` („Gruppen und Vereine rufen den ganzen Kiez zu gemeinsamen Aktionen auf“, `src/data/features.ts`) überschneidet sich mit diesem Plan. Geht Wave in der offenen We-Challenge ohne Höchstgrenze auf?
