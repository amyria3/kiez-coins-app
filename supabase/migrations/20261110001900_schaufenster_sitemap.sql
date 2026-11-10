-- Sitemap für Suchmaschinen (Daria, 2026-11-10: „SEO für Kleingewerbe“).
-- public_showcase_slugs() liefert die Kurznamen aller öffentlichen Schaufenster, die gerade online sind, mit dem Datum
-- der letzten Änderung (neuester Post oder Termin, sonst Anlage). api/sitemap.mjs baut daraus kiezcoins.de/sitemap.xml.
-- Nur Daten, die auf /s/<kurzname> ohnehin öffentlich stehen. Läuft nach 20261110001600.

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
   where s.visibility = 'public' and public.showcase_online(s.id)
   order by s.slug
   limit 50000;
$$;
revoke all on function public.public_showcase_slugs() from public;
grant execute on function public.public_showcase_slugs() to anon, authenticated;
