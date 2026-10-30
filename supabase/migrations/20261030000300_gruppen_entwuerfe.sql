-- Entwürfe auch in Gruppen (Daria, 30.10.2026): We-Challenge und Bild in einer Gruppe lassen sich als Entwurf
-- speichern und später veröffentlichen, wie im Kiez. Vorher-Nachher hat schon einen eigenen Entwurf.
--
-- Dazu:
-- 1. Recht zum Ändern von edensteine (auch in 20261030000200, hier noch einmal, damit die Reihenfolge egal ist).
-- 2. „Gruppenaufgabe erstellen“ erlaubt auch status 'draft'. Ein Bild-Entwurf darf noch ohne Foto sein.
-- 3. publish_challenge kennt Gruppen und private Bilder: In der Gruppe zählt die Mitgliedschaft statt des Kiezes,
--    und es braucht keinen Ort. Private Bilder brauchen auch keinen Ort; bisher scheiterte ihr Entwurf daran.
--    Ein Foto braucht es überall außer bei der Gruppenaufgabe (dort ist es optional, wie beim direkten Posten).
--
-- Bearbeiten bleibt bei der Policy „Eigenen Entwurf bearbeiten“; group_id lässt sich nicht ändern.
-- Voraussetzung: 20261027000200 (group_photo_posts), 20261028000100 (visibility), 20261028000200 (kiez_edensteine).
-- Läuft auch mehrfach ohne Fehler.

-- 1.
grant update (edensteine) on public.challenges to authenticated;

-- 2. Stand 20261027000200 plus Entwurf
alter policy "Gruppenaufgabe erstellen" on public.challenges
  with check (
    author_id = (select auth.uid())
    and group_id is not null
    and (select public.is_group_member(group_id))
    and (status = 'draft' or (status = 'open' and deadline > now()))
    and bounty_amount is null
    and (
      (type = 'individual' and edensteine between 1 and 10)
      or (type = 'photo' and edensteine is null and (status = 'draft' or image_path is not null))
    )
    and assignee_id is null
    and accepted_at is null
    and reported_at is null
    and confirmed_at is null
    and closed_at is null
    and report_photo_path is null
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );

-- 3. Stand 20261020000200 plus Gruppe und Privat
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
  if char_length(btrim(v.title)) = 0 then
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
