-- Entwurf speichern und veröffentlichen (Daria, 30.10.2026): Seit den Edensteinen im Kiez (20261028000200)
-- schickt die App beim Speichern eines vorhandenen Entwurfs die Spalte edensteine mit. Für sie fehlte das
-- Recht zum Ändern. Postgres lehnt dann das ganze Update ab („permission denied“, Code 42501). So schlug
-- jedes zweite Speichern eines Entwurfs fehl und auch das Veröffentlichen, da es den Entwurf vorher speichert.
--
-- Die Policy „Eigenen Entwurf bearbeiten“ erlaubt Änderungen weiter nur an eigenen Entwürfen.
-- Die Regel challenges_group_reward prüft die Werte (1 bis 10, nie zusammen mit Euro).
-- Voraussetzung: 20261028000200 (kiez_edensteine). Läuft auch mehrfach ohne Fehler.

grant update (edensteine) on public.challenges to authenticated;
