-- Einmal aussetzen (Daria, 2026-11-27, „Skip one“): Eine wiederkehrende Aufgabe setzt einen Tag aus, ohne aufgegeben
-- zu sein. Bei „x-mal pro Woche“ sinkt das Wochenziel dieser Woche um eins, bei festen Tagen zählt der Tag nicht als
-- verpasst. Die App erlaubt einmal pro Woche und Aufgabe. Ohne diese Migration zeigt die App keinen Knopf „Aussetzen“.
create table if not exists public.reminder_skipped (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Ortsdatum des ausgesetzten Tags
  day date not null,
  created_at timestamptz not null default now(),
  unique (reminder_id, day)
);
create index if not exists reminder_skipped_reminder_idx on public.reminder_skipped (reminder_id, day);

alter table public.reminder_skipped enable row level security;

drop policy if exists "Eigene Aussetzer" on public.reminder_skipped;
create policy "Eigene Aussetzer" on public.reminder_skipped for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.user_id = (select auth.uid()))
  );
