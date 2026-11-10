-- Bildpost teilen: Wasserzeichen aus dem Rahmen entfernen, und wer das darf, darf auch den ganzen Rahmen weglassen
-- (Daria, 2026-11-10). Eine Funktion für beide Schalter, im Moment für alle an. Ohne diese Zeile gilt sie ebenfalls als
-- an (unbekannter Schlüssel → an); die Zeile macht sie schaltbar, z. B. später nur für Menschen, die die App gekauft haben.
insert into public.features (key, name, description, default_on, note) values
  ('ohne_wasserzeichen', 'Wasserzeichen und Rahmen entfernen', 'Beim Teilen eines Bildposts Kater und KiezCoins unten im Rahmen weglassen oder die Fotos ganz ohne Rahmen verschicken', true, 'Für alle (Daria, 2026-11-10)')
on conflict (key) do nothing;
