-- Schaufenster: eigene E-Mail-Adresse als Kontakt (Daria, 2026-11-17: „Dann bitte Mail einbinden“).
-- Baut auf 20261110000600 und 20261111000200 auf.
--
-- * showcases.email: höchstens 254 Zeichen, Form name@domain.tld, leer = keine.
-- * Sichtbar wie die Adresse: in der App liefert sie nur showcase_private an Menschen, die das Schaufenster sehen
--   dürfen. Kein Lese-Recht auf die Spalte, damit Angemeldete sie bei „nur für Eingeladene“ nicht abfragen können.
-- * Die öffentliche Seite (public_showcase, nur Sichtbarkeit „Alle“) zeigt sie als Mail-Link und auf der Visitenkarte.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.showcases add column if not exists email text;
alter table public.showcases drop constraint if exists showcases_email_check;
alter table public.showcases add constraint showcases_email_check
  check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
grant update (email) on public.showcases to authenticated;

create or replace function public.showcase_private(p_showcase uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'address', case when public.can_see_showcase(s.id) then s.address end,
    'lat', case when public.can_see_showcase(s.id) then s.lat end,
    'lng', case when public.can_see_showcase(s.id) then s.lng end,
    'email', case when public.can_see_showcase(s.id) then s.email end,
    'invite_code', case when public.can_post_showcase(s.id) then s.invite_code end
  )
  from public.showcases s where s.id = p_showcase;
$$;
revoke all on function public.showcase_private(uuid) from public;
grant execute on function public.showcase_private(uuid) to authenticated;

-- Öffentliche Seite: zusätzlich die E-Mail-Adresse (sonst wie 20261111000200)
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
    'email', s.email,
    'website', s.website,
    'links', to_jsonb(s.links),
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
