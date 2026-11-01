-- Gelöschte Beiträge wiederherstellen (Daria, 2026-11-01).
-- Bild-Posts und Vorher-Nachher haben eine Frist ohne Bedeutung. Beim Wiederherstellen prüft die Datenbank
-- sie deshalb nicht mehr; Challenges brauchen weiter eine Frist in der Zukunft.
-- Likes und Kommentare bleiben beim Löschen erhalten (Status 'deleted'), sie kommen also mit zurück.

create or replace function public.restore_challenge(p_challenge_id uuid, p_deadline timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.challenges;
  v_post boolean;
begin
  select * into v from public.challenges
   where id = p_challenge_id and author_id = auth.uid() and status = 'deleted';
  if not found then perform public.challenge_not_changed('wieder veröffentlicht werden'); end if;
  v_post := v.type in ('photo', 'before_after');

  if v.group_id is null and not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;
  if not v_post and coalesce(p_deadline, v.deadline) <= now() then
    raise exception 'Die Frist muss in der Zukunft liegen.' using errcode = 'P0001', hint = 'invalid_deadline';
  end if;
  if v.bounty_amount is not null
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set status = 'open', deleted_at = null,
         deadline = case when v_post then v.deadline else coalesce(p_deadline, v.deadline) end
   where id = p_challenge_id;
end;
$$;

revoke execute on function public.restore_challenge(uuid, timestamptz) from public, anon;
grant execute on function public.restore_challenge(uuid, timestamptz) to authenticated;
