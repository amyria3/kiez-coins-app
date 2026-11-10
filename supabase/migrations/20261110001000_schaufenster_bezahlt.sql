-- Schaufenster: alles läuft erstmal als bezahlt (Daria, 2026-11-10: „wir bauen jetzt alles über bezahlt, unbezahlt
-- machen wir uns später Sorgen. Berücksichtige es nur in der Datenbank“).
--
-- plan_until = 'infinity' heißt bezahlt ohne Ende: Die Grenze von 50 Einträgen löscht nichts, und die App zeigt alle
-- Einträge statt der 10 neuesten. Für ein unbezahltes Schaufenster setzt Daria plan_until auf null oder ein Datum.
-- Läuft nach 20261110000400 bis 20261110000900.

alter table public.showcases alter column plan_until set default 'infinity';
update public.showcases set plan_until = 'infinity' where plan_until is null;

-- Öffentliche Seite kiezcoins.de/s/<kurzname>: bezahlt alle Einträge (Obergrenze 200 schützt nur die Abfrage).
-- Sonst gleich wie 20261110000900_schaufenster_farbe.
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
    'links', to_jsonb(s.links),
    'services', s.services,
    'services_collapsed', s.services_collapsed,
    'bg_color', s.bg_color,
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
          limit case when s.plan_until > now() then 200 else 10 end
        ) x
    ), '[]'::jsonb)
  )
  from public.showcases s
  where s.slug = lower(p_slug) and s.visibility = 'public';
$$;
revoke all on function public.public_showcase(text) from public;
grant execute on function public.public_showcase(text) to anon, authenticated;
