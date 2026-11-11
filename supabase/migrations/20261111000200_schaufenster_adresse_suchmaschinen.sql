-- Schaufenster: eigene Adresse und Angaben für Suchmaschinen (Daria, 2026-11-11). Baut auf 400 bis 20261111000100 auf.
--
-- * Die Gründer:in wählt den Kurznamen in kiezcoins.de/s/<kurzname> selbst (Spalte slug, wie bisher a–z, 0–9 und
--   Bindestrich, 3 bis 40 Zeichen). Ein paar Wörter sind reserviert.
-- * Alte Kurznamen merkt sich showcase_old_slugs. /s/<alter-name> leitet auf die neue Adresse weiter
--   (public_showcase_redirect), damit geteilte Links nicht kaputtgehen. Ein alter Name bleibt für andere gesperrt.
--   Pro Schaufenster bleiben die 10 neuesten alten Namen.
-- * showcases.seo_title (bis 70 Zeichen) und seo_description (bis 200 Zeichen): Titel und Beschreibung für
--   Suchmaschinen. Leer erzeugt api/s.mjs beides automatisch wie bisher.
-- * showcase_slug_status() sagt der App beim Tippen, ob ein Name frei ist.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

-- ---------------------------------------------------------------------------
-- Titel und Beschreibung für Suchmaschinen
-- ---------------------------------------------------------------------------

alter table public.showcases add column if not exists seo_title text;
alter table public.showcases add column if not exists seo_description text;
alter table public.showcases drop constraint if exists showcases_seo_title_check;
alter table public.showcases add constraint showcases_seo_title_check check (seo_title is null or char_length(seo_title) <= 70);
alter table public.showcases drop constraint if exists showcases_seo_description_check;
alter table public.showcases add constraint showcases_seo_description_check
  check (seo_description is null or char_length(seo_description) <= 200);
grant select (seo_title, seo_description), update (seo_title, seo_description) on public.showcases to authenticated;

-- ---------------------------------------------------------------------------
-- Alte Kurznamen
-- ---------------------------------------------------------------------------

create table if not exists public.showcase_old_slugs (
  slug text primary key,
  showcase_id uuid not null references public.showcases (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists showcase_old_slugs_showcase_idx on public.showcase_old_slugs (showcase_id, created_at desc);
-- Nur über die Funktionen unten lesbar
alter table public.showcase_old_slugs enable row level security;
revoke all on public.showcase_old_slugs from anon, authenticated;

create or replace function public.showcase_slug_reserved(p_slug text)
returns boolean language sql immutable set search_path = '' as $$
  select lower(p_slug) = any (array[
    'admin', 'api', 'app', 'hilfe', 'help', 'impressum', 'datenschutz', 'agb', 'kiez', 'kiezcoins', 'kiez-coins',
    'login', 'moderation', 'neu', 'new', 'schaufenster', 'support', 'team', 'test', 'www'
  ]);
$$;

-- Prüft jeden neuen oder geänderten Kurznamen und merkt sich den alten
create or replace function public.showcase_slug_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.slug := lower(btrim(new.slug));
  if tg_op = 'UPDATE' and new.slug = old.slug then
    return new;
  end if;
  if public.showcase_slug_reserved(new.slug) then
    raise exception 'Adresse reserviert' using errcode = 'P0001', hint = 'slug_reserved';
  end if;
  if exists (select 1 from public.showcase_old_slugs o where o.slug = new.slug and o.showcase_id <> new.id) then
    raise exception 'Adresse vergeben' using errcode = 'P0001', hint = 'slug_taken';
  end if;
  if tg_op = 'UPDATE' then
    -- Höchstens alle 10 Minuten ein Wechsel, damit niemand Namen sammelt
    if exists (
      select 1 from public.showcase_old_slugs o where o.showcase_id = new.id and o.created_at > now() - interval '10 minutes'
    ) then
      raise exception 'Adresse gerade erst geändert' using errcode = 'P0001', hint = 'slug_too_often';
    end if;
    insert into public.showcase_old_slugs (slug, showcase_id) values (old.slug, new.id)
      on conflict (slug) do update set showcase_id = excluded.showcase_id, created_at = now();
    -- Der eigene alte Name wird wieder zur Adresse
    delete from public.showcase_old_slugs o where o.slug = new.slug;
    delete from public.showcase_old_slugs o
     where o.showcase_id = new.id
       and o.slug not in (
         select k.slug from public.showcase_old_slugs k where k.showcase_id = new.id order by k.created_at desc limit 10
       );
  end if;
  return new;
end;
$$;
revoke all on function public.showcase_slug_change() from public;
drop trigger if exists showcase_slug_change on public.showcases;
create trigger showcase_slug_change before insert or update of slug on public.showcases
  for each row execute function public.showcase_slug_change();

-- Für die App beim Tippen: 'frei', 'eigen', 'vergeben', 'reserviert' oder 'ungueltig'
create or replace function public.showcase_slug_status(p_slug text, p_showcase uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when lower(btrim(p_slug)) !~ '^[a-z0-9][a-z0-9-]{2,39}$' then 'ungueltig'
    when public.showcase_slug_reserved(btrim(p_slug)) then 'reserviert'
    when exists (select 1 from public.showcases s where s.slug = lower(btrim(p_slug)) and s.id = p_showcase) then 'eigen'
    when exists (select 1 from public.showcases s where s.slug = lower(btrim(p_slug)))
      or exists (select 1 from public.showcase_old_slugs o where o.slug = lower(btrim(p_slug)) and o.showcase_id <> p_showcase)
      then 'vergeben'
    else 'frei'
  end;
$$;
revoke all on function public.showcase_slug_status(text, uuid) from public;
grant execute on function public.showcase_slug_status(text, uuid) to authenticated;

-- Für api/s.mjs: aktueller Kurzname zu einem alten, nur bei öffentlichen Schaufenstern, die online sind
create or replace function public.public_showcase_redirect(p_slug text)
returns text language sql stable security definer set search_path = '' as $$
  select s.slug
    from public.showcase_old_slugs o join public.showcases s on s.id = o.showcase_id
   where o.slug = lower(p_slug) and s.visibility = 'public' and public.showcase_online(s.id);
$$;
revoke all on function public.public_showcase_redirect(text) from public;
grant execute on function public.public_showcase_redirect(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Öffentliche Seite: zusätzlich Titel und Beschreibung für Suchmaschinen (sonst wie 20261111000100)
-- ---------------------------------------------------------------------------

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
