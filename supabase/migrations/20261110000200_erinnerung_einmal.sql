-- Einmalige Erinnerungen (Daria, 2026-11-10): für einen bestimmten Tag, z. B. „heute bis 18:00“, „morgen um 9:00“
-- oder „morgen von 9:00 bis 11:00“. Setzt 20261110000100_erinnerungen voraus.
-- „um“ und „von“ stehen in at_time, „bis“ in until_time.
alter table public.reminders add column if not exists on_date date;
alter table public.reminders add column if not exists until_time time;

-- Genau eine Art: x-mal pro Woche, feste Wochentage oder ein bestimmter Tag
alter table public.reminders drop constraint if exists reminders_check;
alter table public.reminders drop constraint if exists reminders_art;
alter table public.reminders add constraint reminders_art
  check (num_nonnulls(per_week, nullif(coalesce(cardinality(weekdays), 0), 0), on_date) = 1);
