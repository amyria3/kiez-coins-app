-- Ausgang einer Erinnerung (Daria, 2026-11-13): Auf den Aufgaben-Karten stehen „Erledigt“ und „Aufgeben“, im
-- Drei-Punkte-Menü „Das hier abbrechen“. Alle drei zählen. Erledigt steht in reminder_done, die beiden anderen hier.
-- Leer bei Erinnerungen, die vor dieser Migration beendet wurden. Setzt 20261110000100_erinnerungen voraus.
alter table public.reminders add column if not exists ended_as text
  check (ended_as is null or ended_as in ('given_up', 'cancelled'));
