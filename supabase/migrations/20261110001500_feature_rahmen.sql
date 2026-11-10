-- Bildpost teilen: Wasserzeichen aus dem Rahmen entfernen und Rahmen entfernen als eigene Funktionen mit Freischaltung
-- (Daria, 2026-11-10). Im Moment für alle an. Ohne diese Zeilen gelten beide ebenfalls als an (unbekannter Schlüssel → an);
-- die Zeilen machen sie schaltbar, z. B. später nur für Menschen, die die App gekauft haben.
insert into public.features (key, name, description, default_on, note) values
  ('ohne_wasserzeichen', 'Wasserzeichen aus dem Rahmen entfernen', 'Beim Teilen eines Bildposts Kater und KiezCoins unten im Rahmen weglassen', true, 'Für alle (Daria, 2026-11-10)'),
  ('ohne_rahmen', 'Rahmen entfernen', 'Beim Teilen eines Bildposts die Fotos ohne weißen Rahmen verschicken', true, 'Für alle (Daria, 2026-11-10)')
on conflict (key) do nothing;
