-- Rangliste pro Gruppe an- und ausschalten (Konzept: Documentation, kiez-coins, Gruppen).
--
-- * groups.show_leaderboard: true zeigt die Rangliste nach Edensteinen, false nur die Mitgliederliste.
-- * Nur die Gründerin schaltet um, über set_group_leaderboard. Neue Gruppen starten mit Rangliste.

alter table public.groups add column show_leaderboard boolean not null default true;

create function public.set_group_leaderboard(p_group_id uuid, p_show boolean)
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
    perform public.group_error('Nur die Gründerin kann die Rangliste ein- und ausschalten.', 'not_founder');
  end if;
  update public.groups set show_leaderboard = p_show where id = p_group_id;
end;
$$;

revoke execute on function public.set_group_leaderboard(uuid, boolean) from public, anon;
grant execute on function public.set_group_leaderboard(uuid, boolean) to authenticated;
