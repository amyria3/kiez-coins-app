-- Herzen für Termine im Schaufenster, auch ohne Konto (Daria, 2026-11-10), und die öffentliche Seite
-- kiezcoins.de/s/<kurzname> (api/s.mjs). Baut auf 20261110000400_schaufenster auf.
--
-- * showcase_events.likes: einfacher Zähler (Daria: „Einfacher Zähler“). Wer geliked hat, merkt sich nur das Gerät;
--   die Datenbank speichert keine Kennung. Der Zähler lässt sich daher leicht hochtreiben.
-- * like_event(id, on): Herz setzen oder zurücknehmen, für anon und angemeldete. Ohne Konto nur bei Terminen
--   öffentlicher Schaufenster, angemeldet bei allen Terminen, die die Person sieht. Abgesagte Termine nicht.
-- * public_showcase(slug): Kopf und die 10 neuesten Posts und Termine eines öffentlichen Schaufensters, ohne Anmeldung.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.showcase_events add column if not exists likes integer not null default 0 check (likes >= 0);

-- Das Team ändert Termine per update; den Zähler ändert nur like_event.
revoke update on public.showcase_events from authenticated;
grant update (title, body, image_path, starts_at, ends_at, location, cancelled_at) on public.showcase_events to authenticated;

create or replace function public.like_event(p_event_id uuid, p_on boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_likes integer;
begin
  update public.showcase_events e
     set likes = greatest(0, e.likes + case when p_on then 1 else -1 end)
   where e.id = p_event_id
     and e.cancelled_at is null
     and (
       exists (select 1 from public.showcases s where s.id = e.showcase_id and s.visibility = 'public')
       or (auth.uid() is not null and public.can_see_showcase(e.showcase_id))
     )
  returning e.likes into v_likes;
  if v_likes is null then
    raise exception 'Diesen Termin gibt es nicht, oder er ist abgesagt.' using errcode = 'P0001';
  end if;
  return v_likes;
end;
$$;
revoke all on function public.like_event(uuid, boolean) from public;
grant execute on function public.like_event(uuid, boolean) to anon, authenticated;

create or replace function public.public_showcase(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'slug', s.slug,
    'logo_path', s.logo_path,
    'cover_path', s.cover_path,
    'about', s.about,
    'kiez', s.kiez,
    'address', s.address,
    'website', s.website,
    'opening_hours', s.opening_hours,
    'imprint', s.imprint,
    'entries', coalesce((
      select jsonb_agg(x.entry order by x.created_at desc)
        from (
          select * from (
            select c.created_at, jsonb_build_object(
                'kind', 'post', 'id', c.id, 'title', c.title, 'body', c.body, 'type', c.type,
                'image_path', coalesce(c.image_after_path, c.image_path, c.image_before_path), 'created_at', c.created_at
              ) as entry
              from public.challenges c
             where c.showcase_id = s.id and c.visibility = 'public' and c.group_id is null
               and c.status not in ('draft', 'deleted') and c.deleted_at is null
               and not exists (select 1 from public.profiles p where p.id = c.author_id and p.banned_at is not null)
            union all
            select e.created_at, jsonb_build_object(
                'kind', 'event', 'id', e.id, 'title', e.title, 'body', e.body, 'image_path', e.image_path,
                'starts_at', e.starts_at, 'ends_at', e.ends_at, 'location', e.location,
                'cancelled', e.cancelled_at is not null, 'likes', e.likes, 'created_at', e.created_at
              )
              from public.showcase_events e
             where e.showcase_id = s.id
          ) all_entries
          order by created_at desc
          limit 10
        ) x
    ), '[]'::jsonb)
  )
  from public.showcases s
  where s.slug = lower(p_slug) and s.visibility = 'public';
$$;
revoke all on function public.public_showcase(text) from public;
grant execute on function public.public_showcase(text) to anon, authenticated;
