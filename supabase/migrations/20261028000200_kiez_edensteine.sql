-- Edensteine auch für We-Challenges im Kiez (Daria, 27.10.2026).
-- Edensteine sind die ideelle Währung, ein Ersatz für Euro. Eine Kiez-We-Challenge hat darum
-- entweder eine Bounty in Euro oder 1 bis 10 Edensteine, nie beides. Ohne Euro gibt es keinen Zahlungsschritt:
-- confirm_challenge setzt den Status schon heute auf 'confirmed', sobald bounty_amount leer ist.

-- 1. Regel für Belohnungen: neuer Fall „Kiez, We-Challenge, Edensteine statt Euro“
alter table public.challenges drop constraint if exists challenges_group_reward;
alter table public.challenges add constraint challenges_group_reward check (
  (group_id is null and edensteine is null)
  or (group_id is null and type = 'individual' and edensteine between 1 and 10 and bounty_amount is null)
  or (group_id is not null and edensteine between 1 and 10 and bounty_amount is null and type = 'individual')
  or (group_id is not null and edensteine is null and type in ('before_after', 'photo'))
);

-- 2. Bearbeiten: Edensteine lassen sich bei Kiez-Challenges ändern, bei Gruppenaufgaben bleiben sie.
--    Der neue Parameter steht am Ende mit Vorgabe null; die alte Fassung fällt weg, damit der Aufruf eindeutig bleibt.
drop function if exists public.edit_open_challenge(uuid, text, text, text, integer, timestamptz);
create or replace function public.edit_open_challenge(
  p_challenge_id uuid,
  p_title text,
  p_body text,
  p_location text,
  p_bounty_amount integer,
  p_deadline timestamptz,
  p_edensteine integer default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
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

  if p_bounty_amount is not null and p_bounty_amount > coalesce(v_old_bounty, 0)
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set title = btrim(p_title),
         body = coalesce(btrim(p_body), ''),
         location = btrim(p_location),
         bounty_amount = p_bounty_amount,
         edensteine = case when group_id is null then p_edensteine else edensteine end,
         deadline = p_deadline
   where id = p_challenge_id and author_id = auth.uid() and status = 'open' and assignee_id is null;
end;
$function$;

drop function if exists public.edit_deleted_challenge(uuid, text, text, text, integer, timestamptz, text);
create or replace function public.edit_deleted_challenge(
  p_challenge_id uuid,
  p_title text,
  p_body text,
  p_location text,
  p_bounty_amount integer,
  p_deadline timestamptz,
  p_image_path text default null,
  p_edensteine integer default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_old_bounty integer;
begin
  select bounty_amount into v_old_bounty
    from public.challenges
   where id = p_challenge_id and author_id = auth.uid() and status = 'deleted' and assignee_id is null;
  if not found then perform public.challenge_not_changed('bearbeitet werden'); end if;

  if p_bounty_amount is not null and p_bounty_amount > coalesce(v_old_bounty, 0)
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set title = btrim(p_title),
         body = coalesce(btrim(p_body), ''),
         location = btrim(p_location),
         bounty_amount = p_bounty_amount,
         edensteine = case when group_id is null then p_edensteine else edensteine end,
         deadline = p_deadline,
         image_path = coalesce(nullif(btrim(p_image_path), ''), image_path)
   where id = p_challenge_id and author_id = auth.uid() and status = 'deleted' and assignee_id is null;
end;
$function$;

revoke execute on function public.edit_open_challenge(uuid, text, text, text, integer, timestamptz, integer) from public, anon;
grant execute on function public.edit_open_challenge(uuid, text, text, text, integer, timestamptz, integer) to authenticated;
revoke execute on function public.edit_deleted_challenge(uuid, text, text, text, integer, timestamptz, text, integer) from public, anon;
grant execute on function public.edit_deleted_challenge(uuid, text, text, text, integer, timestamptz, text, integer) to authenticated;
