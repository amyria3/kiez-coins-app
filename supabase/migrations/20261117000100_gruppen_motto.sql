-- Motto der Gruppe (Daria, 2026-11-17: „Kurze Beschreibung oder Motto“): eine Zeile unter dem Namen im Gruppen-Kopf.
-- Höchstens 80 Zeichen, leer = keins. Nur die Initiator:in ändert es, über set_group_motto (wie set_group_leaderboard).
-- Läuft auch mehrfach ohne Fehler.

alter table public.groups add column if not exists motto text;

alter table public.groups drop constraint if exists groups_motto_check;
alter table public.groups add constraint groups_motto_check check (motto is null or char_length(motto) <= 80);

create or replace function public.set_group_motto(p_group_id uuid, p_motto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.group_members m
     where m.group_id = p_group_id and m.user_id = auth.uid() and m.role = 'founder'
  ) then
    perform public.group_error('Nur die Initiator:in kann das Motto ändern.', 'not_founder');
  end if;
  update public.groups set motto = nullif(btrim(p_motto), '') where id = p_group_id;
end;
$$;

revoke execute on function public.set_group_motto(uuid, text) from public, anon;
grant execute on function public.set_group_motto(uuid, text) to authenticated;
