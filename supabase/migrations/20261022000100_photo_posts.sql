-- Beiträge, die nur ein schönes Bild zeigen (Daria, 22.10.2026): type 'photo'.
-- Sie haben keine Coins und lassen sich nicht annehmen.

do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.challenges'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%type%individual%'
  loop
    execute format('alter table public.challenges drop constraint %I', c);
  end loop;
end $$;

alter table public.challenges
  add constraint challenges_type_check check (type in ('individual', 'wave', 'photo'));

-- Ein Bild hat keine Coins
alter table public.challenges drop constraint if exists challenges_photo_no_bounty;
alter table public.challenges
  add constraint challenges_photo_no_bounty check (type <> 'photo' or bounty_amount is null);

-- Entwürfe dürfen den Typ wechseln
grant update (type) on public.challenges to authenticated;

-- Annehmen nur bei echten Challenges (wie 20261021000100_groups.sql, plus type <> 'photo')
create or replace function public.accept_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
begin
  select c.group_id into v_group from public.challenges c where c.id = p_challenge_id;
  if v_group is not null then
    if not public.is_group_member(v_group) then
      perform public.challenge_not_changed('angenommen werden');
    end if;
  elsif not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;
  update public.challenges
     set status = 'accepted', assignee_id = auth.uid(), accepted_at = now(), rejection_reason = null
   where id = p_challenge_id and status = 'open' and author_id <> auth.uid() and deadline > now() and type <> 'photo';
  if not found then perform public.challenge_not_changed('angenommen werden'); end if;
end;
$$;
