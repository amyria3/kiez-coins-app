-- Schaufenster: Services als formatierbarer Text (Daria, 2026-11-10). Baut auf 400 bis 600 auf.
--
-- * showcases.services: bis zu 4000 Zeichen. Formatierung: **fett**, *kursiv*, Aufzählung mit „- “ am Zeilenanfang,
--   Leerzeile für einen neuen Absatz. App (src/components/RichText.tsx) und öffentliche Seite (api/s.mjs) zeigen sie an.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.showcases add column if not exists services text;
alter table public.showcases drop constraint if exists showcases_services_check;
alter table public.showcases add constraint showcases_services_check check (services is null or char_length(services) <= 4000);
grant select (services), update (services) on public.showcases to authenticated;

-- Öffentliche Seite: zusätzlich die Services
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
