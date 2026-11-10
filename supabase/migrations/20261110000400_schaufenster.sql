-- Schaufenster, Bau ohne Geld, erster Teil (Daria, 2026-11-10; Plan: Übergabe/2026-11-10_offen_schaufenster.md).
--
-- * Jede Gruppe hat höchstens ein Schaufenster. Die Gründer:in legt es an, bearbeitet es und schaltet Mitglieder
--   zum Posten frei (group_members.can_post_showcase).
-- * Sichtbarkeit `public` (alle) oder `invite` (Eingeladene per Code oder angenommene Anfrage). Kopfdaten (Name,
--   Logo, Kiez …) sind für alle Angemeldeten lesbar, damit man ein Schaufenster finden und anfragen kann. Posts und
--   Termine eines Schaufensters `invite` sehen nur Team und Eingeladene.
-- * Posts sind normale Challenges mit showcase_id. Zusätzliche restriktive Regeln, die bestehenden bleiben unberührt.
-- * Höchstens 50 Einträge (Posts und Termine zusammen); der 51. löscht den ältesten endgültig, außer plan_until liegt
--   in der Zukunft (setzt Daria von Hand). Die App zeigt die 10 neuesten.
-- * Termine (showcase_events) lassen sich speichern (event_saves). Das Team sieht nur die Anzahl.

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.groups (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  logo_path text,
  cover_path text,
  about text check (about is null or char_length(about) <= 1000),
  kiez text check (kiez is null or char_length(kiez) <= 80),
  address text check (address is null or char_length(address) <= 160),
  website text check (website is null or (website ~* '^https://' and char_length(website) <= 300)),
  opening_hours text check (opening_hours is null or char_length(opening_hours) <= 400),
  imprint text check (imprint is null or char_length(imprint) <= 1000),
  lat double precision,
  lng double precision,
  visibility text not null default 'public' check (visibility in ('public', 'invite')),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  plan_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.group_members add column if not exists can_post_showcase boolean not null default false;

create table if not exists public.showcase_guests (
  showcase_id uuid not null references public.showcases (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (showcase_id, user_id)
);

create table if not exists public.showcase_follows (
  showcase_id uuid not null references public.showcases (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (showcase_id, user_id)
);
create index if not exists showcase_follows_user_idx on public.showcase_follows (user_id);

alter table public.challenges add column if not exists showcase_id uuid references public.showcases (id) on delete cascade;
create index if not exists challenges_showcase_idx on public.challenges (showcase_id, created_at desc);

create table if not exists public.showcase_events (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.showcases (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text check (body is null or char_length(body) <= 1000),
  image_path text,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  location text check (location is null or char_length(location) <= 160),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists showcase_events_showcase_idx on public.showcase_events (showcase_id, created_at desc);

create table if not exists public.event_saves (
  event_id uuid not null references public.showcase_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_saves_user_idx on public.event_saves (user_id);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen (security definer, damit sich die Regeln nicht gegenseitig aufrufen)
-- ---------------------------------------------------------------------------

create or replace function public.is_showcase_founder(p_showcase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.showcases s join public.groups g on g.id = s.group_id
     where s.id = p_showcase and g.founder_id = (select auth.uid())
  );
$$;

create or replace function public.can_post_showcase(p_showcase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.showcases s join public.group_members m on m.group_id = s.group_id
     where s.id = p_showcase and m.user_id = (select auth.uid()) and (m.role = 'founder' or m.can_post_showcase)
  );
$$;

create or replace function public.can_see_showcase(p_showcase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.showcases s
     where s.id = p_showcase
       and (
         s.visibility = 'public'
         or exists (select 1 from public.group_members m where m.group_id = s.group_id and m.user_id = (select auth.uid()))
         or exists (
           select 1 from public.showcase_guests gu
            where gu.showcase_id = s.id and gu.user_id = (select auth.uid()) and gu.status = 'accepted'
         )
       )
  );
$$;

-- Höchstens 50 Einträge: ältere Posts und Termine endgültig löschen, außer plan_until liegt in der Zukunft.
create or replace function public.enforce_showcase_limit(p_showcase uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.showcases s where s.id = p_showcase and s.plan_until > now()) then
    return;
  end if;
  with entries as (
    select 'post' as kind, c.id, c.created_at from public.challenges c where c.showcase_id = p_showcase
    union all
    select 'event', e.id, e.created_at from public.showcase_events e where e.showcase_id = p_showcase
  ), old as (
    select kind, id from entries order by created_at desc offset 50
  )
  , gone_posts as (delete from public.challenges c using old where old.kind = 'post' and c.id = old.id returning c.id)
  delete from public.showcase_events e using old where old.kind = 'event' and e.id = old.id;
end;
$$;
revoke all on function public.enforce_showcase_limit(uuid) from public;

create or replace function public.showcase_events_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.enforce_showcase_limit(new.showcase_id);
  return null;
end;
$$;
drop trigger if exists showcase_events_limit on public.showcase_events;
create trigger showcase_events_limit after insert on public.showcase_events
  for each row execute function public.showcase_events_limit();

create or replace function public.challenges_showcase_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.showcase_id is not null then
    perform public.enforce_showcase_limit(new.showcase_id);
  end if;
  return null;
end;
$$;
drop trigger if exists challenges_showcase_limit on public.challenges;
create trigger challenges_showcase_limit after insert or update of showcase_id on public.challenges
  for each row execute function public.challenges_showcase_limit();

-- ---------------------------------------------------------------------------
-- Funktionen für die App
-- ---------------------------------------------------------------------------

-- Schaufenster anlegen: nur die Gründer:in der Gruppe, höchstens eins pro Gruppe.
create or replace function public.create_showcase(p_group_id uuid, p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.groups g where g.id = p_group_id and g.founder_id = auth.uid()) then
    raise exception 'Nur die Gründer:in der Gruppe legt ein Schaufenster an.' using errcode = 'P0001';
  end if;
  insert into public.showcases (group_id, name, slug) values (p_group_id, btrim(p_name), lower(p_slug)) returning id into v_id;
  return v_id;
end;
$$;

-- Mitglied zum Posten freischalten oder nicht: nur die Gründer:in.
create or replace function public.set_showcase_poster(p_group_id uuid, p_user_id uuid, p_allow boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.groups g where g.id = p_group_id and g.founder_id = auth.uid()) then
    raise exception 'Nur die Gründer:in schaltet Mitglieder frei.' using errcode = 'P0001';
  end if;
  update public.group_members set can_post_showcase = p_allow where group_id = p_group_id and user_id = p_user_id;
end;
$$;

-- Eigenen Post einem Schaufenster zuordnen (direkt nach dem Posten). Prüft die Freischaltung.
create or replace function public.attach_showcase_post(p_challenge_id uuid, p_showcase_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_post_showcase(p_showcase_id) then
    raise exception 'Du darfst in diesem Schaufenster nicht posten.' using errcode = 'P0001';
  end if;
  update public.challenges set showcase_id = p_showcase_id
   where id = p_challenge_id and author_id = auth.uid() and group_id is null;
  if not found then
    raise exception 'Nur eigene Posts außerhalb von Gruppen.' using errcode = 'P0001';
  end if;
end;
$$;

-- Mit Code einem Schaufenster „nur für Eingeladene“ beitreten.
create or replace function public.join_showcase(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = 'P0001';
  end if;
  select id into v_id from public.showcases where invite_code = upper(btrim(p_code));
  if v_id is null then
    raise exception 'Diesen Code gibt es nicht.' using errcode = 'P0001';
  end if;
  insert into public.showcase_guests (showcase_id, user_id, status) values (v_id, auth.uid(), 'accepted')
    on conflict (showcase_id, user_id) do update set status = 'accepted';
  return v_id;
end;
$$;

-- Anfrage annehmen oder ablehnen: Team des Schaufensters.
create or replace function public.answer_showcase_request(p_showcase_id uuid, p_user_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_post_showcase(p_showcase_id) then
    raise exception 'Nur das Team beantwortet Anfragen.' using errcode = 'P0001';
  end if;
  if p_accept then
    update public.showcase_guests set status = 'accepted' where showcase_id = p_showcase_id and user_id = p_user_id;
  else
    delete from public.showcase_guests where showcase_id = p_showcase_id and user_id = p_user_id;
  end if;
end;
$$;

-- Wie viele Menschen einen Termin gespeichert haben, ohne Namen: nur für das Team.
create or replace function public.event_save_count(p_event_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select case when public.can_post_showcase(e.showcase_id)
    then (select count(*)::integer from public.event_saves s where s.event_id = e.id) end
  from public.showcase_events e where e.id = p_event_id;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'is_showcase_founder(uuid)', 'can_post_showcase(uuid)', 'can_see_showcase(uuid)', 'create_showcase(uuid, text, text)',
    'set_showcase_poster(uuid, uuid, boolean)', 'attach_showcase_post(uuid, uuid)', 'join_showcase(text)',
    'answer_showcase_request(uuid, uuid, boolean)', 'event_save_count(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.showcases enable row level security;
alter table public.showcase_guests enable row level security;
alter table public.showcase_follows enable row level security;
alter table public.showcase_events enable row level security;
alter table public.event_saves enable row level security;

-- Schaufenster: Kopfdaten für alle Angemeldeten; anlegen nur über create_showcase; ändern und löschen die Gründer:in.
revoke insert, update on public.showcases from authenticated;
grant update (name, slug, logo_path, cover_path, about, kiez, address, website, opening_hours, imprint, lat, lng, visibility)
  on public.showcases to authenticated;
drop policy if exists "Schaufenster lesen" on public.showcases;
create policy "Schaufenster lesen" on public.showcases for select to authenticated using (true);
drop policy if exists "Schaufenster ändern" on public.showcases;
create policy "Schaufenster ändern" on public.showcases for update to authenticated
  using ((select public.is_showcase_founder(id))) with check ((select public.is_showcase_founder(id)));
drop policy if exists "Schaufenster löschen" on public.showcases;
create policy "Schaufenster löschen" on public.showcases for delete to authenticated
  using ((select public.is_showcase_founder(id)));

-- Eingeladene: eigene Zeile und das Team; anfragen mit eigener Zeile (Status requested); zurückziehen oder entfernen.
drop policy if exists "Gäste lesen" on public.showcase_guests;
create policy "Gäste lesen" on public.showcase_guests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.can_post_showcase(showcase_id)));
drop policy if exists "Anfragen" on public.showcase_guests;
create policy "Anfragen" on public.showcase_guests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'requested');
drop policy if exists "Gast entfernen" on public.showcase_guests;
create policy "Gast entfernen" on public.showcase_guests for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.can_post_showcase(showcase_id)));

-- Folgen: nur eigene Zeilen, nur sichtbare Schaufenster.
drop policy if exists "Folgen lesen" on public.showcase_follows;
create policy "Folgen lesen" on public.showcase_follows for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Folgen" on public.showcase_follows;
create policy "Folgen" on public.showcase_follows for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.can_see_showcase(showcase_id)));
drop policy if exists "Entfolgen" on public.showcase_follows;
create policy "Entfolgen" on public.showcase_follows for delete to authenticated using (user_id = (select auth.uid()));

-- Termine: sehen, wer das Schaufenster sieht; anlegen, ändern und löschen das Team.
drop policy if exists "Termine lesen" on public.showcase_events;
create policy "Termine lesen" on public.showcase_events for select to authenticated
  using ((select public.can_see_showcase(showcase_id)));
drop policy if exists "Termin anlegen" on public.showcase_events;
create policy "Termin anlegen" on public.showcase_events for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.can_post_showcase(showcase_id)));
drop policy if exists "Termin ändern" on public.showcase_events;
create policy "Termin ändern" on public.showcase_events for update to authenticated
  using ((select public.can_post_showcase(showcase_id))) with check ((select public.can_post_showcase(showcase_id)));
drop policy if exists "Termin löschen" on public.showcase_events;
create policy "Termin löschen" on public.showcase_events for delete to authenticated
  using ((select public.can_post_showcase(showcase_id)));

-- Gespeicherte Termine: nur eigene.
drop policy if exists "Gespeicherte lesen" on public.event_saves;
create policy "Gespeicherte lesen" on public.event_saves for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Termin speichern" on public.event_saves;
create policy "Termin speichern" on public.event_saves for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.showcase_events e where e.id = event_id and (select public.can_see_showcase(e.showcase_id)))
  );
drop policy if exists "Termin entfernen" on public.event_saves;
create policy "Termin entfernen" on public.event_saves for delete to authenticated using (user_id = (select auth.uid()));

-- Posts eines Schaufensters: zusätzlich (restriktiv) nur sichtbar, wer das Schaufenster sieht. Die bestehenden Regeln
-- für challenges bleiben unverändert; restriktive Regeln gelten zusätzlich.
drop policy if exists "Schaufenster-Posts lesen" on public.challenges;
create policy "Schaufenster-Posts lesen" on public.challenges as restrictive for select to authenticated
  using (showcase_id is null or author_id = (select auth.uid()) or (select public.can_see_showcase(showcase_id)));
drop policy if exists "Schaufenster-Posts anlegen" on public.challenges;
create policy "Schaufenster-Posts anlegen" on public.challenges as restrictive for insert to authenticated
  with check (showcase_id is null or (select public.can_post_showcase(showcase_id)));
