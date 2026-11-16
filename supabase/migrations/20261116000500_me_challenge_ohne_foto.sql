-- Me-Challenge ohne Foto (Daria, 2026-11-16): „Für davor: Foto oder Titel. Für danach: Foto oder Titel, mind. eins
-- ist erforderlich.“ Das Vorher braucht also ein Foto oder eine Überschrift. Fehlt das Foto, zeigt die Karte im Feed
-- an seiner Stelle eine Fläche mit dem Text. Das Nachher prüft die App (Überschrift ist nach dem Vorher immer da).
-- Setzt 20261023000300_before_after voraus. Läuft auch mehrfach ohne Fehler.

create or replace function public.start_before_after(
  p_group_id uuid,
  p_title text,
  p_before_text text,
  p_image_before_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_path text := nullif(btrim(coalesce(p_image_before_path, '')), '');
  v_title text := left(btrim(coalesce(p_title, '')), 60);
begin
  if v_path is null and v_title = '' then
    raise exception 'Bitte füge ein Vorher-Foto oder eine Überschrift hinzu.' using errcode = 'P0001', hint = 'photo_or_title_required';
  end if;
  if v_path is not null and not public.before_after_own_path(v_path) then
    raise exception 'Das Foto liegt nicht in Deinem Ordner.' using errcode = 'P0001', hint = 'invalid_image';
  end if;
  if p_group_id is not null then
    if not public.is_group_member(p_group_id) then
      raise exception 'Du bist nicht in dieser Gruppe.' using errcode = 'P0001', hint = 'not_group_member';
    end if;
  elsif not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;

  insert into public.challenges
    (author_id, type, status, group_id, title, location, before_text, image_before_path, image_path)
  values
    (auth.uid(), 'before_after', 'draft', p_group_id, v_title, '',
     nullif(btrim(coalesce(p_before_text, '')), ''), v_path, v_path)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.start_before_after(uuid, text, text, text) from public, anon;
grant execute on function public.start_before_after(uuid, text, text, text) to authenticated;
