-- Eigene Challenge bearbeiten, solange niemand sie angenommen hat (Status open).
-- Ändern lassen sich Titel, Text, Ort, Bounty und Frist. Statuswechsel bleiben bei den Statusfunktionen.
-- Schließen („hat sich erledigt“) läuft über die bestehende Policy „Offene eigene Challenge löschen“.

create function public.edit_open_challenge(
  p_challenge_id uuid,
  p_title text,
  p_body text,
  p_location text,
  p_bounty_amount integer,
  p_deadline timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_bounty integer;
begin
  select bounty_amount into v_old_bounty
    from public.challenges
   where id = p_challenge_id and author_id = auth.uid() and status = 'open' and assignee_id is null;
  if not found then perform public.challenge_not_changed('bearbeitet werden'); end if;

  if p_deadline <= now() then
    raise exception 'Die Frist muss in der Zukunft liegen.' using errcode = 'P0001', hint = 'invalid_deadline';
  end if;

  -- Eine neue oder höhere Bounty nur, wenn die Person Bounties anbieten darf.
  if p_bounty_amount is not null and p_bounty_amount > coalesce(v_old_bounty, 0)
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set title = btrim(p_title),
         body = coalesce(btrim(p_body), ''),
         location = btrim(p_location),
         bounty_amount = p_bounty_amount,
         deadline = p_deadline
   where id = p_challenge_id and author_id = auth.uid() and status = 'open' and assignee_id is null;
end;
$$;

revoke execute on function public.edit_open_challenge(uuid, text, text, text, integer, timestamptz) from public, anon;
grant execute on function public.edit_open_challenge(uuid, text, text, text, integer, timestamptz) to authenticated;
