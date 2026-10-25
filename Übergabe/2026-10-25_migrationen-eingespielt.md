# Migrationen eingespielt

Datum: 2026-10-25
Status: erledigt, gehört in die Doku
Ergebnis gehört nach Documentation: Datenbank-Doku zu `supabase/migrations`

Daria hat am 25.10.2026 im Supabase-SQL-Editor ausgeführt:

- `20261024000100_gender.sql`: Spalte `profiles.gender` (`er`, `sie`, `person`, Standard `person`).
- `20261024000200_friend_invites.sql`: Tabelle `friend_invites`, Spalten `friendships.via_invite` und `friendships.requester_seen`, Funktionen `my_friend_invite`, `accept_friend_invite`, `take_new_invite_friends`.

Damit sind alle Migrationen im Repo eingespielt.
