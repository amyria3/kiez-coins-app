-- Schaufenster: Zahlungslinks (Daria, 2026-11-23: „ohne Mehrkosten“). Baut auf 20261123000200 auf.
--
-- * showcases.payment_links: Liste mit bis zu zehn Einträgen {"title", "amount", "url"}. Der Betrieb legt den Link bei
--   Stripe, SumUp oder PayPal selbst an; KiezCoins speichert nur den Link, das Geld geht direkt an den Betrieb.
--   Die App prüft Titel und https:// (src/data/paymentLinks.mjs); die Datenbank begrenzt Form und Anzahl.
-- * public_showcase liefert payment_links. Sonst unverändert wie 20261123000200.
-- * Neue Funktion in der Feature-Freischaltung (20261110001100): schaufenster_bezahlen, für alle an.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.showcases add column if not exists payment_links jsonb not null default '[]'::jsonb;

alter table public.showcases drop constraint if exists showcases_payment_links_check;
alter table public.showcases add constraint showcases_payment_links_check
  check (jsonb_typeof(payment_links) = 'array' and jsonb_array_length(payment_links) <= 10 and octet_length(payment_links::text) <= 8000);

-- Lesen und schreiben wie die übrigen Angaben (Policy „Schaufenster ändern“ bleibt zuständig)
grant select (payment_links), update (payment_links) on public.showcases to authenticated;

insert into public.features (key, name, description, default_on, note) values
  ('schaufenster_bezahlen', 'Zahlungslinks im Schaufenster', 'Zahlungslinks von Stripe, SumUp oder PayPal auf der Seite des Schaufensters', true, 'Für alle (Daria, 2026-11-23)')
on conflict (key) do nothing;

-- Öffentliche Seite: zusätzlich payment_links
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
    'payment_links', s.payment_links,
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
