-- Kalender anbinden (Daria, 2026-11-10): Termine aus Routine als Kalender-Abo exportieren und Termine aus
-- eigenen Kalendern (iCal-Link) in Routine zeigen. Erstmal nur für Daria sichtbar (App: useRoutineEnabled).
-- Die Edge Function `kalender` liest beides. Setzt 20261110000100_erinnerungen voraus.

-- Geheimer Link für das Kalender-Abo: https://…/functions/v1/kalender?abo=<token>
-- Keine Policies: nur die Funktion routine_feed_token und die Edge Function (Service-Schlüssel) kommen heran.
create table if not exists public.routine_feeds (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.routine_feeds enable row level security;

-- Gibt den Token der angemeldeten Person zurück und legt ihn beim ersten Mal an. `p_renew`: neuer Token,
-- der alte Link funktioniert danach nicht mehr.
create or replace function public.routine_feed_token(p_renew boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if p_renew then
    insert into public.routine_feeds (user_id) values (auth.uid())
      on conflict (user_id) do update set token = gen_random_uuid(), created_at = now()
      returning token into v_token;
  else
    insert into public.routine_feeds (user_id) values (auth.uid()) on conflict (user_id) do nothing;
    select token into v_token from public.routine_feeds where user_id = auth.uid();
  end if;
  return v_token;
end;
$$;
revoke all on function public.routine_feed_token(boolean) from public;
grant execute on function public.routine_feed_token(boolean) to authenticated;

-- Eigene Kalender, die Routine zeigt: geheime iCal-Adresse aus Google, iCloud oder Outlook.
create table if not exists public.routine_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  url text not null check (url ~* '^(https|webcal)://' and char_length(url) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists routine_calendars_user_idx on public.routine_calendars (user_id);
alter table public.routine_calendars enable row level security;

drop policy if exists "Eigene Kalender" on public.routine_calendars;
create policy "Eigene Kalender" on public.routine_calendars for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
