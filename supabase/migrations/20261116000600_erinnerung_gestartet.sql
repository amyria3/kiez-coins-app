-- Erinnerung starten (Daria, 2026-11-16): „Starten (mit Post)“ postet das Vorher einer Me-Challenge, ohne die
-- Erinnerung abzuhaken. Die Erinnerung merkt sich diese Me-Challenge. „Fertig – mit Post“ erscheint nur dann,
-- hakt ab und führt zum Nachher. Setzt 20261110000100_erinnerungen voraus. Läuft auch mehrfach ohne Fehler.

alter table public.reminders
  add column if not exists started_challenge_id uuid references public.challenges (id) on delete set null;

-- Nur eigene Posts (die Policy „Eigene Erinnerungen“ prüft nur die Erinnerung selbst)
create or replace function public.reminders_started_own()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.started_challenge_id is not null and not exists (
    select 1 from public.challenges c where c.id = new.started_challenge_id and c.author_id = new.user_id
  ) then
    raise exception 'Nur eigene Posts.' using errcode = 'P0001', hint = 'not_own_post';
  end if;
  return new;
end;
$$;
revoke execute on function public.reminders_started_own() from public, anon, authenticated;

drop trigger if exists reminders_started_own on public.reminders;
create trigger reminders_started_own
  before insert or update of started_challenge_id on public.reminders
  for each row execute function public.reminders_started_own();
