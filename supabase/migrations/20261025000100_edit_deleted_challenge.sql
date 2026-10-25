-- Gelöschte Challenge direkt bearbeiten (Daria, 25.10.2026).
-- Ersetzt den Umweg der App: zurückholen, ändern, wieder löschen. Die Challenge bleibt dabei gelöscht
-- und erscheint zu keinem Zeitpunkt im Feed. Die Frist darf abgelaufen sein, da die Challenge
-- unveröffentlicht bleibt; beim Veröffentlichen prüft restore_challenge die Frist.

create or replace function public.edit_deleted_challenge(
  p_challenge_id uuid,
  p_title text,
  p_body text,
  p_location text,
  p_bounty_amount integer,
  p_deadline timestamptz,
  p_image_path text default null
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
   where id = p_challenge_id and author_id = auth.uid() and status = 'deleted' and assignee_id is null;
  if not found then perform public.challenge_not_changed('bearbeitet werden'); end if;

  -- Eine neue oder höhere Bounty nur, wenn die Person Bounties anbieten darf (wie edit_open_challenge).
  if p_bounty_amount is not null and p_bounty_amount > coalesce(v_old_bounty, 0)
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set title = btrim(p_title),
         body = coalesce(btrim(p_body), ''),
         location = btrim(p_location),
         bounty_amount = p_bounty_amount,
         deadline = p_deadline,
         image_path = coalesce(nullif(btrim(p_image_path), ''), image_path)
   where id = p_challenge_id and author_id = auth.uid() and status = 'deleted' and assignee_id is null;
end;
$$;

revoke execute on function public.edit_deleted_challenge(uuid, text, text, text, integer, timestamptz, text) from public, anon;
grant execute on function public.edit_deleted_challenge(uuid, text, text, text, integer, timestamptz, text) to authenticated;
