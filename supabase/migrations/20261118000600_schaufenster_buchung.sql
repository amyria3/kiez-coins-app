-- Schaufenster: Termin buchen über Cal.com (Daria, 2026-11-18: kostenlose Integrationen für kleine Betriebe).
-- Baut auf 20261118000300 auf.
--
-- * showcases.booking_url: Link zur Buchungsseite des Betriebs, zum Beispiel https://cal.com/kiezblick. Der Betrieb
--   legt sein Konto bei Cal.com selbst an (kostenlos); KiezCoins speichert nur den Link, keine Zugangsdaten.
--   Wie die übrigen Links öffentlich lesbar und nur mit https://.
-- * public_showcase liefert zusätzlich booking_url. Die öffentliche Seite zeigt damit „Termin buchen“.
--   Sonst unverändert wie 20261118000300.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.showcases add column if not exists booking_url text;

alter table public.showcases drop constraint if exists showcases_booking_url_check;
alter table public.showcases add constraint showcases_booking_url_check
  check (booking_url is null or (booking_url ~ '^https://[^[:space:]]+\.[^[:space:]]+$' and char_length(booking_url) <= 300));

-- Lesen wie links, schreiben wie die übrigen Angaben (Policy „Schaufenster ändern“ bleibt zuständig)
grant select (booking_url), update (booking_url) on public.showcases to authenticated;

-- Öffentliche Seite: zusätzlich booking_url
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
