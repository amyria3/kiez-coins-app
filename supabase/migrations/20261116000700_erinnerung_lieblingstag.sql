-- Lieblingstag für Aufgaben „x-mal pro Woche“ (Daria, 2026-11-16: „Lieblingstag optional“).
-- 1 = Montag … 7 = Sonntag. Bis zu diesem Tag steht die Aufgabe hinten, ab diesem Tag vorn.
-- Wird es vorher knapp (weniger als zwei Tage Puffer), rückt sie trotzdem nach vorn. Leer: kein Lieblingstag.

alter table public.reminders
  add column if not exists preferred_day smallint;

alter table public.reminders drop constraint if exists reminders_preferred_day_check;
alter table public.reminders
  add constraint reminders_preferred_day_check check (
    preferred_day is null or (preferred_day between 1 and 7 and per_week is not null)
  );

comment on column public.reminders.preferred_day is
  'Lieblingstag bei x-mal pro Woche: 1 = Montag … 7 = Sonntag, leer = keiner (2026-11-16)';
