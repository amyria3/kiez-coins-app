# To-do: Look im Profil auf Supabase speichern

- Datum: 2026-10-23
- Gehört nach Documentation: To-do-Liste der App (`kiez-coins/TODO.md` oder die dort übliche Liste)

## Aufgabe

- Daria will den gewählten Look (Kiez oder Instagram) im Profil auf Supabase speichern. So gilt die Wahl auf allen Geräten und auch in der Home-Bildschirm-App, deren Speicher von Safari getrennt ist.
- Spalte `look text not null default 'kiez'` in `profiles`, mit Prüfung auf `('kiez','instagram')`. Dazu eine Migration und eine Notiz für die Datenbank-Doku.
- Nach der Anmeldung: Unterscheidet sich der Look im Profil vom Look im Browser, speichert die App ihn lokal und lädt einmal neu.
- Der Link `?look=…` schreibt die Wahl ins Profil, sobald jemand angemeldet ist.
- Für iOS und Android braucht die App einen Speicher, den sie beim Start synchron liest (z. B. `expo-sqlite/kv-store`).
