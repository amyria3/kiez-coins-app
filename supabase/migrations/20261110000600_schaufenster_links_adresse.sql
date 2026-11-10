-- Schaufenster: mehrere Links, Adresse nur für Menschen mit Zugang (Daria, 2026-11-10). Baut auf 400 und 500 auf.
--
-- * showcases.links: bis zu 10 Links (https). Die bisherige Webseite wird der erste Link.
-- * Adresse und Ort (address, lat, lng) sieht nur, wer das Schaufenster sehen darf (can_see_showcase). Bei
--   Sichtbarkeit „Alle“ sind das alle.
-- * Der Einladungscode (invite_code) war bisher für alle Angemeldeten lesbar. So hätte jede Person einem Schaufenster
--   „nur für Eingeladene“ beitreten können. Ihn liest jetzt nur noch das Team.
-- * Beides über Spaltenrechte: Angemeldete lesen nur die übrigen Spalten; Adresse und Code liefert showcase_private.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

create or replace function public.valid_links(p text[])
returns boolean language sql immutable set search_path = '' as $$
  select cardinality(p) <= 10
     and coalesce((select bool_and(l ~* '^https://\S+\.\S+$' and char_length(l) <= 300) from unnest(p) l), true);
$$;

alter table public.showcases add column if not exists links text[] not null default '{}';
alter table public.showcases drop constraint if exists showcases_links_check;
alter table public.showcases add constraint showcases_links_check check (public.valid_links(links));
update public.showcases set links = array[website] where website is not null and links = '{}';

-- Lesen: alle Spalten außer Adresse, Ort und Einladungscode
revoke select on public.showcases from anon, authenticated;
grant select (id, group_id, name, slug, logo_path, cover_path, about, kiez, website, links, opening_hours, imprint,
  visibility, plan_until, created_at) on public.showcases to authenticated;
grant update (links) on public.showcases to authenticated;

create or replace function public.showcase_private(p_showcase uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'address', case when public.can_see_showcase(s.id) then s.address end,
    'lat', case when public.can_see_showcase(s.id) then s.lat end,
    'lng', case when public.can_see_showcase(s.id) then s.lng end,
    'invite_code', case when public.can_post_showcase(s.id) then s.invite_code end
  )
  from public.showcases s where s.id = p_showcase;
$$;
revoke all on function public.showcase_private(uuid) from public;
grant execute on function public.showcase_private(uuid) to authenticated;

-- Öffentliche Seite: zusätzlich die Links
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
