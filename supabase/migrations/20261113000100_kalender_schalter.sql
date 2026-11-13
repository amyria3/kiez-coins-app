-- Kalender mit eigenen Schaltern (Daria, 2026-11-13), wie Weiterposten: Der Schalter schaltet die Funktion an und aus,
-- die Einrichtung (Abo-Link, verbundene Kalender) bleibt. Zurücksetzen (neuer Link, Trennen) ist ein eigener Knopf.
-- Setzt 20261110000300_kalender voraus. Die Edge Function `kalender` liest beide Spalten.

-- „Termine aus KiezCoins exportieren“ aus: Der Abo-Link liefert einen leeren Kalender.
alter table public.routine_feeds add column if not exists paused boolean not null default false;

create or replace function public.routine_feed_paused()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select paused from public.routine_feeds where user_id = auth.uid()), false);
$$;
revoke all on function public.routine_feed_paused() from public;
grant execute on function public.routine_feed_paused() to authenticated;

create or replace function public.routine_feed_set_paused(p_paused boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  insert into public.routine_feeds (user_id, paused) values (auth.uid(), p_paused)
    on conflict (user_id) do update set paused = excluded.paused;
end;
$$;
revoke all on function public.routine_feed_set_paused(boolean) from public;
grant execute on function public.routine_feed_set_paused(boolean) to authenticated;

-- „Termine aus … anzeigen“: ein Schalter je verbundenem Kalender.
alter table public.routine_calendars add column if not exists shown boolean not null default true;
