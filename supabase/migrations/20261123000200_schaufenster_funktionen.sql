-- Schaufenster: Schalter „Kalender-Abo“ und „Bei Google finden lassen“ (Daria, 2026-11-23: Seite „Schaufenster“ mit
-- Inhalten, Funktionen und Einstellungen). Baut auf 20261118000600 auf.
--
-- * showcases.calendar_feed: Kalender-Abo der Termine anbieten (kiezcoins.de/s/<kurzname>/termine.ics und der Knopf
--   „Kalender abonnieren“). Aus: kein Knopf, der Abo-Link antwortet mit 404, bestehende Abos bekommen keine neuen
--   Termine mehr.
-- * showcases.search_listing: Suchmaschinen dürfen die öffentliche Seite aufnehmen (robots „index“, Sitemap). Aus: „noindex“
--   und nicht in der Sitemap.
-- * Beide sind standardmäßig an (AGENTS.md: keine Funktion ist standardmäßig aus) und wirken nur bei „Alle“ und online.
-- * public_showcase liefert beide Werte, public_showcase_slugs lässt Schaufenster ohne search_listing weg. Sonst
--   unverändert wie 20261118000600 und 20261110001900.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.showcases add column if not exists calendar_feed boolean not null default true;
alter table public.showcases add column if not exists search_listing boolean not null default true;

-- Lesen und schreiben wie die übrigen Angaben (Policy „Schaufenster ändern“ bleibt zuständig)
grant select (calendar_feed, search_listing), update (calendar_feed, search_listing) on public.showcases to authenticated;

-- Öffentliche Seite: zusätzlich calendar_feed und search_listing
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
    'lat', s.lat,
    'lng', s.lng,
    'email', s.email,
    'website', s.website,
    'links', to_jsonb(s.links),
    'booking_url', s.booking_url,
    'calendar_feed', s.calendar_feed,
    'search_listing', s.search_listing,
    'services', s.services,
    'services_collapsed', s.services_collapsed,
    'bg_color', s.bg_color,
    'opening_hours', s.opening_hours,
    'imprint', s.imprint,
    'terms', s.terms,
    'seo_title', s.seo_title,
    'seo_description', s.seo_description,
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
          limit case when public.gruppen_feature('schaufenster_mehr', s.group_id) then 200 else 30 end
        ) x
    ), '[]'::jsonb)
  )
  from public.showcases s
  where s.slug = lower(p_slug) and s.visibility = 'public' and public.showcase_online(s.id);
$$;
grant execute on function public.public_showcase(text) to anon, authenticated;

-- Sitemap: nur Schaufenster, die bei Suchmaschinen erscheinen sollen
create or replace function public.public_showcase_slugs()
returns table (slug text, lastmod timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.slug,
         greatest(
           s.created_at,
           (select max(e.created_at) from public.showcase_events e where e.showcase_id = s.id),
           (select max(c.created_at) from public.challenges c
             where c.showcase_id = s.id and c.visibility = 'public' and c.group_id is null
               and c.status not in ('draft', 'deleted') and c.deleted_at is null)
         )
    from public.showcases s
   where s.visibility = 'public' and public.showcase_online(s.id) and s.search_listing
   order by s.slug
   limit 50000;
$$;
revoke all on function public.public_showcase_slugs() from public;
grant execute on function public.public_showcase_slugs() to anon, authenticated;
