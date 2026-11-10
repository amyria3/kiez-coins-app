-- Drei Schalter fürs Schaufenster (Daria, 2026-11-10), über die Feature-Freischaltung (20261110001100):
--   schaufenster        an/aus. Aus: Die Gruppe legt kein Schaufenster an, ein bestehendes geht offline.
--                       Offline sehen es nur noch die Mitglieder der Gruppe; die öffentliche Seite /s/<kurzname>
--                       antwortet mit 404, Posts verschwinden aus dem Feed. Nichts wird gelöscht.
--   schaufenster_posten Im Schaufenster posten und Termine anlegen.
--   schaufenster_mehr   Mehr Posts zeigen: alle gespeicherten Einträge statt der 30 neuesten.
-- Alle drei sind erstmal für alle an.
--
-- Anders als public.feature_an() hängen diese Schalter an der Gruppe, nicht an der Person, die gerade schaut: Ein
-- Schaufenster ist für alle offline oder für niemanden. public.gruppen_feature() prüft der Reihe nach:
--   1. Freischaltung oder Sperre für genau diese Gruppe (feature_grants.group_id).
--   2. Freischaltung oder Sperre für die Gründer:in der Gruppe (feature_grants.user_id).
--   3. Standard der Funktion (features.default_on), unbekannter Schlüssel: an.
-- Moderatorinnen haben hier keine Ausnahme, damit sie sehen, was alle sehen.
--
-- Schaufenster einer Gruppe abschalten:
--   insert into public.feature_grants (feature_key, group_id, enabled, note)
--   values ('schaufenster', '<gruppen-id>', false, 'offline');
-- Wieder an: dieselbe Zeile löschen.
-- Läuft nach 20261110001500.

insert into public.features (key, name, description, default_on, note) values
  ('schaufenster_posten', 'Im Schaufenster posten', 'Posts und Termine im Schaufenster einer Gruppe anlegen', true, 'Für alle (Daria, 2026-11-10)'),
  ('schaufenster_mehr', 'Mehr Posts im Schaufenster', 'Alle gespeicherten Posts und Termine zeigen statt der 30 neuesten', true, 'Für alle (Daria, 2026-11-10)')
on conflict (key) do nothing;
update public.features
   set description = 'Öffentliche Seite einer Gruppe oder eines Vereins. Aus: kein neues Schaufenster, ein bestehendes geht offline'
 where key = 'schaufenster';

create or replace function public.gruppen_feature(p_key text, p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select g.enabled from public.feature_grants g
      where g.feature_key = p_key and g.group_id = p_group_id and g.until > now()),
    (select g.enabled from public.feature_grants g join public.groups gr on gr.founder_id = g.user_id
      where gr.id = p_group_id and g.feature_key = p_key and g.until > now()),
    (select f.default_on from public.features f where f.key = p_key),
    true);
$$;
revoke all on function public.gruppen_feature(text, uuid) from public, anon;
grant execute on function public.gruppen_feature(text, uuid) to authenticated;

create or replace function public.showcase_online(p_showcase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select public.gruppen_feature('schaufenster', s.group_id) from public.showcases s where s.id = p_showcase), false);
$$;
revoke all on function public.showcase_online(uuid) from public;
grant execute on function public.showcase_online(uuid) to anon, authenticated;

-- Für die App: {"online": true, "posten": true, "mehr": true}
create or replace function public.showcase_schalter(p_showcase uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'online', public.gruppen_feature('schaufenster', s.group_id),
    'posten', public.gruppen_feature('schaufenster', s.group_id) and public.gruppen_feature('schaufenster_posten', s.group_id),
    'mehr', public.gruppen_feature('schaufenster_mehr', s.group_id))
  from public.showcases s where s.id = p_showcase;
$$;
revoke all on function public.showcase_schalter(uuid) from public, anon;
grant execute on function public.showcase_schalter(uuid) to authenticated;

-- Sehen: Mitglieder der Gruppe immer, alle anderen nur, solange das Schaufenster online ist.
create or replace function public.can_see_showcase(p_showcase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.showcases s
     where s.id = p_showcase
       and (
         exists (select 1 from public.group_members m where m.group_id = s.group_id and m.user_id = (select auth.uid()))
         or (
           public.gruppen_feature('schaufenster', s.group_id)
           and (
             s.visibility = 'public'
             or exists (
               select 1 from public.showcase_guests gu
                where gu.showcase_id = s.id and gu.user_id = (select auth.uid()) and gu.status = 'accepted'
             )
           )
         )
       )
  );
$$;

-- Posten und Termine anlegen: Team und beide Schalter an.
create or replace function public.may_post_showcase(p_showcase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_post_showcase(p_showcase)
     and coalesce((select (public.showcase_schalter(p_showcase) ->> 'posten')::boolean), false);
$$;
revoke all on function public.may_post_showcase(uuid) from public, anon;
grant execute on function public.may_post_showcase(uuid) to authenticated;

-- Kopfdaten: Mitglieder immer, alle anderen nur online.
drop policy if exists "Schaufenster lesen" on public.showcases;
create policy "Schaufenster lesen" on public.showcases for select to authenticated
  using (
    exists (select 1 from public.group_members m where m.group_id = showcases.group_id and m.user_id = (select auth.uid()))
    or (select public.gruppen_feature('schaufenster', showcases.group_id))
  );

create or replace function public.create_showcase(p_group_id uuid, p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.groups g where g.id = p_group_id and g.founder_id = auth.uid()) then
    raise exception 'Nur die Gründer:in der Gruppe legt ein Schaufenster an.' using errcode = 'P0001';
  end if;
  if not public.gruppen_feature('schaufenster', p_group_id) then
    raise exception 'Für diese Gruppe ist das Schaufenster abgeschaltet.' using errcode = 'P0001';
  end if;
  insert into public.showcases (group_id, name, slug) values (p_group_id, btrim(p_name), lower(p_slug)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.attach_showcase_post(p_challenge_id uuid, p_showcase_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.may_post_showcase(p_showcase_id) then
    raise exception 'Du darfst in diesem Schaufenster nicht posten.' using errcode = 'P0001';
  end if;
  update public.challenges set showcase_id = p_showcase_id
   where id = p_challenge_id and author_id = auth.uid() and group_id is null;
  if not found then
    raise exception 'Nur eigene Posts außerhalb von Gruppen.' using errcode = 'P0001';
  end if;
end;
$$;

drop policy if exists "Termin anlegen" on public.showcase_events;
create policy "Termin anlegen" on public.showcase_events for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.may_post_showcase(showcase_id)));
drop policy if exists "Schaufenster-Posts anlegen" on public.challenges;
create policy "Schaufenster-Posts anlegen" on public.challenges as restrictive for insert to authenticated
  with check (showcase_id is null or (select public.may_post_showcase(showcase_id)));

-- Öffentliche Seite: nur online; 30 neueste Einträge, mit „Mehr Posts zeigen“ alle (Obergrenze 200 schützt die Abfrage).
-- Sonst gleich wie 20261110001000_schaufenster_bezahlt.
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
          limit case when public.gruppen_feature('schaufenster_mehr', s.group_id) then 200 else 30 end
        ) x
    ), '[]'::jsonb)
  )
  from public.showcases s
  where s.slug = lower(p_slug) and s.visibility = 'public' and public.showcase_online(s.id);
$$;
revoke all on function public.public_showcase(text) from public;
grant execute on function public.public_showcase(text) to anon, authenticated;
