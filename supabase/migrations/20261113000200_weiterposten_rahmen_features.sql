-- Weiterposten mit Rahmen (Daria, 2026-11-13): zwei Funktionen in der Feature-Freischaltung (20261110001100).
--   weiterposten_rahmen     Weiterposten mit weißem Rahmen und Namen. Standard an; wer es hat, schaltet den Rahmen
--                           unter Funktionen › Weiterposten für sich ab.
--   weiterposten_ohne_logo  KiezCoins-Logo aus dem Rahmen entfernen. Standard aus, nur mit Freischaltung
--                           (Daria, 2026-11-13: „Removing logo from the frame should be a feature to turn on“).
-- Die Edge Function weiterposten fragt beide über public.feature_an() ab.
insert into public.features (key, name, description, default_on, note) values
  ('weiterposten_rahmen', 'Weiterposten mit Rahmen', 'Weitergepostete Fotos im weißen Rahmen mit Namen, wie beim Teilen', true, 'Für alle (Daria, 2026-11-13)'),
  ('weiterposten_ohne_logo', 'Logo im Rahmen entfernen', 'Weiterposts ohne KiezCoins-Logo unten im Rahmen', false, 'Nur mit Freischaltung (Daria, 2026-11-13)')
on conflict (key) do update set name = excluded.name, description = excluded.description, default_on = excluded.default_on, note = excluded.note;
