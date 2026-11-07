-- Titel bei „Nur ein Bild“ optional (Daria, 06.11.2026): Ein Bild-Post darf ohne Titel veröffentlicht werden.
-- Die App blendet einen leeren Titel aus. Challenges, Gruppenaufgaben und Vorher-Nachher brauchen weiter einen Titel.
--
-- 1. challenges_title_check: leerer Titel auch bei type = 'photo' erlaubt (bisher nur im Entwurf).
-- 2. publish_challenge: Stand 20261030000300, nur die Titelprüfung gilt nicht mehr für Bilder.
-- Läuft auch mehrfach ohne Fehler.

-- 1.
alter table public.challenges drop constraint if exists challenges_title_check;
alter table public.challenges add constraint challenges_title_check check (
  char_length(btrim(title)) <= 60 and (status = 'draft' or type = 'photo' or char_length(btrim(title)) >= 1)
);

-- 2.
create or replace function public.publish_challenge(p_challenge_id uuid, p_deadline timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.challenges;
begin
  select * into v from public.challenges
   where id = p_challenge_id and author_id = auth.uid() and status = 'draft';
  if not found then perform public.challenge_not_changed('veröffentlicht werden'); end if;

  if v.group_id is not null then
    if not public.is_group_member(v.group_id) then
      raise exception 'Du bist nicht mehr in dieser Gruppe.' using errcode = 'P0001', hint = 'not_group_member';
    end if;
  elsif not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;
  if v.type <> 'photo' and char_length(btrim(v.title)) = 0 then
    raise exception 'Bitte gib einen Titel ein.' using errcode = 'P0001', hint = 'title_required';
  end if;
  if v.group_id is null and v.visibility = 'public' and char_length(btrim(v.location)) = 0 then
    raise exception 'Bitte gib einen Ort ein.' using errcode = 'P0001', hint = 'location_required';
  end if;
  if v.image_path is null and not (v.group_id is not null and v.type = 'individual') then
    raise exception 'Bitte füge ein Foto hinzu.' using errcode = 'P0001', hint = 'photo_required';
  end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'Die Frist muss in der Zukunft liegen.' using errcode = 'P0001', hint = 'invalid_deadline';
  end if;
  if v.bounty_amount is not null
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set status = 'open', deadline = p_deadline, created_at = now()
   where id = p_challenge_id;
end;
$$;

revoke execute on function public.publish_challenge(uuid, timestamptz) from public, anon;
grant execute on function public.publish_challenge(uuid, timestamptz) to authenticated;
