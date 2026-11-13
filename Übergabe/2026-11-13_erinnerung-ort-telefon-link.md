# Erinnerungen mit Ort, Telefon und Link (13.11.2026)

Fertig, für die Datenbank-Doku in Documentation.

- Migration `supabase/migrations/20261113000600_erinnerung_ort_telefon_link.sql`: Spalten `place` (bis 200 Zeichen), `phone` (bis 40) und `link` (bis 500) in `public.reminders`, alle freiwillig. Die Rechte (Policy „Eigene Erinnerungen“) gelten unverändert.
- App: Felder „Ort“, „Telefon“, „Link“ beim Anlegen und Bearbeiten (`src/components/ReminderExtras.tsx`). Auf der Karte öffnet der Ort die Karten-App, das Telefon ruft an, der Link öffnet die Seite (`src/lib/places.ts`).
- Ohne Migration speichert die App wie bisher, nur ohne die drei Felder (`withExtras` in `src/data/reminders.ts`).
- Schaufenster: Ein Tipp auf die Adresse fragt „In Karten öffnen“ oder „Ort teilen“.
