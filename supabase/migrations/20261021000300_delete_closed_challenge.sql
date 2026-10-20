-- Auch geschlossene Challenges lassen sich löschen (status deleted), solange niemand sie angenommen hat.
-- Geschlossen werden ohnehin nur Challenges ohne Annehmende. Ersetzt delete_challenge aus 20261021000200.

create or replace function public.delete_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'deleted', deleted_at = now()
   where id = p_challenge_id and author_id = auth.uid() and status in ('open', 'closed') and assignee_id is null;
  if not found then perform public.challenge_not_changed('gelöscht werden'); end if;
end;
$$;
