-- „Sehr privat“ (Daria, 15.11.2026): ein Schalter je Post, für Privat, Gruppen, Kiez und Überall. Neue Posts starten aus.
--
-- An: Niemand sieht den Teilen-Knopf, die öffentliche Seite kiezcoins.de/c/<id> ist gesperrt, Weiterposten geht
-- nicht, und die Fotos liegen im privaten Speicher `photos-private`. Beim Einschalten bekommen die eigenen Fotos neue
-- Dateinamen. So funktionieren schon verschickte Links sofort nicht mehr, auch die Links mit 24 Stunden Gültigkeit.
-- Aus: Teilen geht wieder, in Privat und Gruppen nur für die Ersteller:in (das prüft die App).
--
-- Voraussetzung: 20261116000100_private_fotos, 20261103000200_teilen. Läuft auch mehrfach ohne Fehler.

alter table public.challenges add column if not exists very_private boolean not null default false;
-- Für Entwürfe (Policy „Eigenen Entwurf bearbeiten“). Veröffentlichte Posts ändern die Funktion unten.
grant update (very_private) on public.challenges to authenticated;

-- 1. Sehr private Posts bekommen keine öffentliche Seite (gilt auch für share_challenge, shared_post und Weiterposten)
create or replace function public.can_have_share_page(c public.challenges)
returns boolean
language sql
stable
set search_path = ''
as $$
  select c.visibility = 'public' and c.group_id is null and not coalesce(c.local_only, false)
     and not coalesce(c.very_private, false)
     and c.status not in ('draft', 'deleted')
     and not exists (select 1 from public.profiles p where p.id = c.author_id and p.banned_at is not null);
$$;
revoke execute on function public.can_have_share_page(public.challenges) from public, anon, authenticated;

-- 2. Schalter für eigene Posts, in jedem Zustand
create or replace function public.set_challenge_very_private(p_challenge_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges set very_private = coalesce(p_on, false)
   where id = p_challenge_id and author_id = auth.uid();
  if not found then perform public.challenge_not_changed('geändert werden'); end if;
end;
$$;
revoke execute on function public.set_challenge_very_private(uuid, boolean) from public, anon;
grant execute on function public.set_challenge_very_private(uuid, boolean) to authenticated;

-- 3. Fotos gehören in den privaten Speicher, wenn der Post privat, in einer Gruppe oder sehr privat ist
create or replace function public.challenge_photos_private(c public.challenges)
returns boolean
language sql
stable
set search_path = ''
as $$
  select c.visibility = 'private' or c.group_id is not null or coalesce(c.very_private, false);
$$;
revoke execute on function public.challenge_photos_private(public.challenges) from public, anon, authenticated;

create or replace function public.sync_challenge_photo_names(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges;
  v_private boolean;
  v_me uuid := auth.uid();
begin
  select * into c from public.challenges where id = p_challenge_id and author_id = v_me;
  if c.id is null then
    raise exception 'Nur die Ersteller:in kann die Fotos dieses Posts verschieben.' using errcode = 'P0001';
  end if;
  v_private := public.challenge_photos_private(c);
  update public.challenges
     set image_path = public.photo_name_for(c.image_path, v_private, v_me),
         image_before_path = public.photo_name_for(c.image_before_path, v_private, v_me),
         image_after_path = public.photo_name_for(c.image_after_path, v_private, v_me),
         extra_image_paths = coalesce((
           select array_agg(public.photo_name_for(x, v_private, v_me) order by i)
             from unnest(c.extra_image_paths) with ordinality as e(x, i)
         ), '{}')
   where id = c.id;
end;
$$;

-- 4. Eigene Fotos eines Posts auf neue Dateien umstellen (die App hat sie vorher dorthin kopiert).
--    Neue Namen nur im eigenen Ordner und im Speicher, der zum Post passt (`p_` genau dann, wenn privat).
create or replace function public.rename_challenge_photos(p_challenge_id uuid, p_old text[], p_new text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges;
  v_me uuid := auth.uid();
  v_private boolean;
  i int;
begin
  select * into c from public.challenges where id = p_challenge_id and author_id = v_me;
  if c.id is null then
    raise exception 'Nur die Ersteller:in kann die Fotos dieses Posts verschieben.' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_old), 0) <> coalesce(cardinality(p_new), 0) or coalesce(cardinality(p_old), 0) > 10 then
    raise exception 'Fotos passen nicht zusammen.' using errcode = 'P0001';
  end if;
  v_private := public.challenge_photos_private(c);
  for i in 1 .. coalesce(cardinality(p_old), 0) loop
    if split_part(p_old[i], '/', 1) <> v_me::text
       or p_new[i] !~ '^[0-9a-f-]{36}/[^/]+$'
       or split_part(p_new[i], '/', 1) <> v_me::text
       or (split_part(p_new[i], '/', 2) like 'p\_%') <> v_private then
      raise exception 'Foto gehört nicht in diesen Speicher.' using errcode = 'P0001';
    end if;
  end loop;
  update public.challenges
     set image_path = coalesce(p_new[array_position(p_old, c.image_path)], c.image_path),
         image_before_path = coalesce(p_new[array_position(p_old, c.image_before_path)], c.image_before_path),
         image_after_path = coalesce(p_new[array_position(p_old, c.image_after_path)], c.image_after_path),
         extra_image_paths = coalesce((
           select array_agg(coalesce(p_new[array_position(p_old, x)], x) order by k)
             from unnest(c.extra_image_paths) with ordinality as e(x, k)
         ), '{}')
   where id = c.id;
end;
$$;
revoke execute on function public.rename_challenge_photos(uuid, text[], text[]) from public, anon;
grant execute on function public.rename_challenge_photos(uuid, text[], text[]) to authenticated;
