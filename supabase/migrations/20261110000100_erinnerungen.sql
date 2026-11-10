-- Erinnerungen (Routine) mit Kater-Nachrichten (Daria, 2026-11-10). Antworten auf die Fragen:
-- Übergabe/2026-11-07_offen_erinnerungen.md. Eine Erinnerung gehört genau einer Person und ist nur für sie sichtbar.
-- Ziel entweder x-mal pro Woche (`per_week`) oder feste Wochentage mit Uhrzeit (`weekdays`, `at_time`).
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Ergänzung zu „Ich will …“, z. B. „joggen gehen“
  want text not null check (char_length(want) between 1 and 60),
  -- Optional, wird beim Posten zum Text vor der Me-Challenge
  description text check (description is null or char_length(description) <= 500),
  per_week smallint check (per_week between 1 and 7),
  -- 1 = Montag … 7 = Sonntag
  weekdays smallint[] check (weekdays is null or weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  at_time time,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check ((per_week is not null) <> (weekdays is not null and cardinality(weekdays) > 0))
);
create index if not exists reminders_user_idx on public.reminders (user_id);

create table if not exists public.reminder_done (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  done_at timestamptz not null default now(),
  -- Post, der beim Erledigen entstanden ist (optional)
  challenge_id uuid references public.challenges (id) on delete set null
);
create index if not exists reminder_done_reminder_idx on public.reminder_done (reminder_id, done_at);

alter table public.reminders enable row level security;
alter table public.reminder_done enable row level security;

drop policy if exists "Eigene Erinnerungen" on public.reminders;
create policy "Eigene Erinnerungen" on public.reminders for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Eigene Erledigungen" on public.reminder_done;
create policy "Eigene Erledigungen" on public.reminder_done for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.user_id = (select auth.uid()))
  );

-- Markierung im Post, z. B. „Joggen gehen 1/4“ (Pille, Daria, 2026-11-10). Wird beim Posten aus der Erinnerung gesetzt.
alter table public.challenges add column if not exists routine_label text
  check (routine_label is null or char_length(routine_label) <= 80);

-- Verknüpft eine Erledigung mit dem Post, der dabei entstanden ist, und setzt die Markierung.
-- Direkte Updates auf challenges sind gesperrt (20261019000200_rls), daher als Funktion.
create or replace function public.link_routine_post(p_done_id uuid, p_challenge_id uuid, p_label text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.challenges where id = p_challenge_id and author_id = auth.uid()) then
    raise exception 'Nur eigene Posts';
  end if;
  update public.reminder_done set challenge_id = p_challenge_id where id = p_done_id and user_id = auth.uid();
  if not found then
    raise exception 'Erledigung nicht gefunden';
  end if;
  update public.challenges set routine_label = left(p_label, 80) where id = p_challenge_id;
end;
$$;
revoke all on function public.link_routine_post(uuid, uuid, text) from public;
grant execute on function public.link_routine_post(uuid, uuid, text) to authenticated;
