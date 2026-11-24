-- Schaufenster: Telefonnummer in der Karte „Kontakt“ (Daria, 2026-11-24: „Telefonfeld … Ja“).
-- Baut auf 20261117000200 (E-Mail) auf und behandelt die Nummer genauso:
--
-- * showcases.phone: höchstens 30 Zeichen aus Ziffern, Leerzeichen, + ( ) / -, leer = keine.
-- * Kein Lese-Recht auf die Spalte. In der App liefert sie showcase_private an Menschen, die das Schaufenster sehen
--   dürfen; die öffentliche Seite (public_showcase, nur Sichtbarkeit „Alle“) zeigt sie als Link zum Anrufen.
-- * public_showcase und showcase_private sind der Stand aus der Datenbank vom 2026-11-24 plus `phone`.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.showcases add column if not exists phone text;
alter table public.showcases drop constraint if exists showcases_phone_check;
alter table public.showcases add constraint showcases_phone_check
  check (phone is null or phone ~ '^\+?[0-9 ()/-]{5,30}$');
grant update (phone) on public.showcases to authenticated;

create or replace function public.showcase_private(p_showcase uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'address', case when public.can_see_showcase(s.id) then s.address end,
    'lat', case when public.can_see_showcase(s.id) then s.lat end,
    'lng', case when public.can_see_showcase(s.id) then s.lng end,
    'email', case when public.can_see_showcase(s.id) then s.email end,
    'phone', case when public.can_see_showcase(s.id) then s.phone end,
    'invite_code', case when public.can_post_showcase(s.id) then s.invite_code end
  )
  from public.showcases s where s.id = p_showcase;
$function$;
revoke all on function public.showcase_private(uuid) from public;
grant execute on function public.showcase_private(uuid) to authenticated;

create or replace function public.public_showcase(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'phone', s.phone,
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
$function$;
revoke all on function public.public_showcase(text) from public;
grant execute on function public.public_showcase(text) to anon, authenticated;
