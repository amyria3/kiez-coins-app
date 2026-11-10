-- Kalender als eigene Funktion mit Freischaltung (Daria, 2026-11-10). Für alle an, wie Routine.
-- Ohne diese Zeile gilt der Kalender ebenfalls als an (unbekannter Schlüssel → an); die Zeile macht ihn schaltbar.
insert into public.features (key, name, description, default_on, note) values
  ('kalender', 'Kalender', 'Termine aus Routine im eigenen Kalender abonnieren und Termine aus eigenen Kalendern in Routine zeigen', true, 'Für alle (Daria, 2026-11-10)')
on conflict (key) do nothing;
