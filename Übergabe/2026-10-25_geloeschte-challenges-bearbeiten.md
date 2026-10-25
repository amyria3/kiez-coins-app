# Gelöschte Challenges direkt bearbeiten

Migration `supabase/migrations/20261025000100_edit_deleted_challenge.sql`: Daria hat sie am 25.10.2026 im SQL-Editor ausgeführt.

Datum: 2026-10-25
Status: erledigt, gehört in die Doku
Ergebnis gehört nach Documentation: `kiez-coins/DATENBANK.md`, `kiez-coins/app/Arbeitsstand_Code.md`

## Entscheidung und Umsetzung (Daria, 25.10.2026)

- Neue Funktion `edit_deleted_challenge(id, title, body, location, bounty_amount, deadline, image_path)`: ändert eine eigene gelöschte Challenge in einem Schritt. Sie bleibt gelöscht und erscheint nie im Feed. Die Frist darf abgelaufen sein; beim Veröffentlichen prüft `restore_challenge` sie. Bounty-Prüfung wie `edit_open_challenge`. Ein neues Foto lädt die App vorher hoch und übergibt den Pfad.
- App: „Nicht veröffentlichen, Entwurf“ (`src/app/challenge/[id]/edit.tsx`) schickt nur noch die Aktion `editDeleted` (`src/data/store.tsx`, `remote.editDeletedChallenge`). Der Umweg über `restore_challenge`, `edit_open_challenge` und `delete_challenge` ist entfernt.
