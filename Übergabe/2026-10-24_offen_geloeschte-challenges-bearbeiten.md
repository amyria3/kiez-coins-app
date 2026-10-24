# Gelöschte Challenges direkt bearbeiten

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/DATENBANK.md`, `kiez-coins/app/Arbeitsstand_Code.md`

## Stand

`edit_open_challenge` ändert nur offene Challenges. „Nicht veröffentlichen, Entwurf“ holt eine gelöschte Challenge deshalb kurz zurück (`restore_challenge`), speichert und löscht sie wieder (`delete_challenge`). Das funktioniert, ist aber ein Umweg.

## Vorschlag

Eine Datenbankfunktion, die gelöschte Challenges direkt ändert, zum Beispiel `edit_deleted_challenge(id, …)` mit derselben Prüfung der Ersteller:in wie `edit_open_challenge`. Danach den Umweg in der App ersetzen.

## Offene Frage an Daria

Soll der Umweg ersetzt werden? Erst nach ihrer Zustimmung umsetzen. Neue Migration = Pflichtaufgabe für Daria (SQL-Editor).
