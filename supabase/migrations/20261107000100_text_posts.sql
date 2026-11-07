-- Posts nur mit Text (Daria, 07.11.2026): Ein Post („Bild“, type = 'photo') darf statt eines Fotos Blätter mit Text
-- haben. Jedes Blatt ist ein Eintrag in `pages`, im Format 4:5, höchstens 10 Blätter (so viele Slides nimmt Instagram).
-- Die App teilt den Text beim Tippen auf die Blätter auf und speichert ihn so, wie er auf den Blättern steht.
--
-- 1. Spalte `pages` mit Prüfung: nur bei type = 'photo', 1 bis 10 Blätter, zusammen höchstens 8000 Zeichen,
--    veröffentlicht nicht leer. Spalte `sheet_font`: Schrift der Blätter (Auswahl von Daria, 07.11.2026).
-- 2. Recht zum Ändern von `pages` und `sheet_font` im eigenen Entwurf (Policy „Eigenen Entwurf bearbeiten“ wie bei den anderen Spalten).
-- 3. „Gruppenaufgabe erstellen“: Ein Post in der Gruppe braucht ein Foto oder Blätter.
-- 4. publish_challenge: Stand 20261106000100, ein Foto braucht es nicht, wenn es Blätter gibt.
-- 5. set_challenge_pages: Blätter und Schrift eines eigenen offenen Text-Posts ändern (wie set_challenge_image fürs Foto).
-- Voraussetzung: 20261030000300 (gruppen_entwuerfe), 20261106000100 (titel_optional_bild).
-- Läuft auch mehrfach ohne Fehler.

-- 1.
alter table public.challenges add column if not exists pages text[];
alter table public.challenges drop constraint if exists challenges_pages_check;
alter table public.challenges add constraint challenges_pages_check check (
  pages is null
  or (
    type = 'photo'
    and cardinality(pages) between 1 and 10
    and char_length(array_to_string(pages, '')) <= 8000
    and (status = 'draft' or char_length(btrim(array_to_string(pages, ''))) >= 1)
  )
);

alter table public.challenges add column if not exists sheet_font text;
alter table public.challenges drop constraint if exists challenges_sheet_font_check;
alter table public.challenges add constraint challenges_sheet_font_check check (
  sheet_font is null
  or sheet_font in ('inter', 'redaction', 'rubik', 'barriecito', 'nothing', 'playwrite', 'patrick', 'mono')
);

-- 2.
grant update (pages, sheet_font) on public.challenges to authenticated;

-- 3. Stand 20261030000300 plus Blätter
alter policy "Gruppenaufgabe erstellen" on public.challenges
  with check (
    author_id = (select auth.uid())
    and group_id is not null
    and (select public.is_group_member(group_id))
    and (status = 'draft' or (status = 'open' and deadline > now()))
    and bounty_amount is null
    and (
      (type = 'individual' and edensteine between 1 and 10)
      or (type = 'photo' and edensteine is null and (status = 'draft' or image_path is not null or pages is not null))
    )
    and assignee_id is null
    and accepted_at is null
    and reported_at is null
    and confirmed_at is null
    and closed_at is null
    and report_photo_path is null
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );

-- 4.
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
  if v.pages is not null and char_length(btrim(array_to_string(v.pages, ''))) = 0 then
    raise exception 'Bitte schreib etwas auf das Blatt.' using errcode = 'P0001', hint = 'text_required';
  end if;
  if v.image_path is null and v.pages is null and not (v.group_id is not null and v.type = 'individual') then
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

-- 5.
create or replace function public.set_challenge_pages(p_challenge_id uuid, p_pages text[], p_font text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pages is null or char_length(btrim(array_to_string(p_pages, ''))) = 0 then
    raise exception 'Bitte schreib etwas auf das Blatt.' using errcode = 'P0001', hint = 'text_required';
  end if;
  update public.challenges
     set pages = p_pages,
         sheet_font = coalesce(p_font, sheet_font)
   where id = p_challenge_id and author_id = auth.uid() and status in ('open', 'deleted')
     and type = 'photo' and pages is not null;
  if not found then perform public.challenge_not_changed('bearbeitet werden'); end if;
end;
$$;

revoke execute on function public.set_challenge_pages(uuid, text[], text) from public, anon;
grant execute on function public.set_challenge_pages(uuid, text[], text) to authenticated;
