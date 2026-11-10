-- Feature-Freischaltung (Daria, 2026-11-10): Jede Funktion, die nicht zum Kern gehört, hat einen Schlüssel und ist
-- an oder aus. Ob sie für eine Person an ist, entscheidet allein public.feature_an(). Später lassen sich Funktionen
-- gezielt für einzelne Personen, Gruppen oder Vereine (eine Gruppe mit Schaufenster) freischalten.
--
-- Reihenfolge der Prüfung in public.feature_an(schluessel, gruppe):
--   1. Moderatorinnen haben alles an (zum Testen).
--   2. Freischaltung für die Person selbst (feature_grants.user_id).
--   3. Freischaltung für eine Gruppe: mit Gruppe genau für diese, ohne Gruppe für eine ihrer Gruppen.
--   4. Standard der Funktion (features.default_on).
--   Unbekannter Schlüssel: an. Kein Feature ist aus, nur weil es hier fehlt.
--
-- Eine Freischaltung gilt bis `until`; 'infinity' heißt ohne Ende, wie plan_until beim Schaufenster
-- (20261110001000). enabled = false sperrt eine Funktion für diese Person oder Gruppe, obwohl sie sonst an ist.
-- Das Schaufenster selbst bleibt bei plan_until: Das ist der Bezahlstand eines Schaufensters, kein Feature-Schalter.
-- Läuft nach 20261110001000_schaufenster_bezahlt.

create table if not exists public.features (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null,
  description text,
  default_on boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
alter table public.features enable row level security;
drop policy if exists features_lesen on public.features;
create policy features_lesen on public.features for select to authenticated using (true);
drop policy if exists features_moderation on public.features;
create policy features_moderation on public.features for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

create table if not exists public.feature_grants (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null references public.features (key) on update cascade on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  enabled boolean not null default true,
  until timestamptz not null default 'infinity',
  note text,
  created_at timestamptz not null default now(),
  -- genau eins von beiden: Person oder Gruppe
  check ((user_id is null) <> (group_id is null))
);
create unique index if not exists feature_grants_person_idx on public.feature_grants (user_id, feature_key) where user_id is not null;
create unique index if not exists feature_grants_gruppe_idx on public.feature_grants (group_id, feature_key) where group_id is not null;
create index if not exists feature_grants_key_idx on public.feature_grants (feature_key);
alter table public.feature_grants enable row level security;
-- Lesen nur über public.feature_an() und public.meine_features(); verwalten nur Moderatorinnen
drop policy if exists feature_grants_moderation on public.feature_grants;
create policy feature_grants_moderation on public.feature_grants for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- Die Funktionen außerhalb des Kerns. Stand 2026-11-10: alles an für alle, außer Routine und Schaufenster, die
-- Daria heute erst für Moderatorinnen freigegeben hat. Für alle freischalten:
--   update public.features set default_on = true where key in ('routine', 'schaufenster');
insert into public.features (key, name, description, default_on, note) values
  ('routine', 'Routine', 'Erinnerungen, Kalender und der Knopf „Routine“ im Feed', false, 'Erst für Moderatorinnen (Daria, 2026-11-09)'),
  ('schaufenster', 'Schaufenster', 'Öffentliche Seite einer Gruppe oder eines Vereins', false, 'Erst für Moderatorinnen (Daria, 2026-11-10)'),
  ('weiterposten', 'Weiterposten', 'Öffentliche Posts auf BlueSky, Mastodon, Instagram und Facebook teilen', true, 'Für alle (Daria, 2026-11-09)')
on conflict (key) do nothing;

create or replace function public.feature_an(p_key text, p_group_id uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when (select public.is_moderator()) then true
    else coalesce(
      (select g.enabled from public.feature_grants g
        where g.feature_key = p_key and g.user_id = (select auth.uid()) and g.until > now()),
      (select bool_or(g.enabled) from public.feature_grants g
        where g.feature_key = p_key and g.group_id is not null and g.until > now()
          and case when p_group_id is not null then g.group_id = p_group_id
                   else exists (select 1 from public.group_members m
                                 where m.group_id = g.group_id and m.user_id = (select auth.uid())) end),
      (select f.default_on from public.features f where f.key = p_key),
      true)
  end;
$$;
revoke all on function public.feature_an(text, uuid) from public, anon;
grant execute on function public.feature_an(text, uuid) to authenticated;

-- Alle Funktionen auf einmal, für die App: {"routine": true, "schaufenster": false, …}
create or replace function public.meine_features(p_group_id uuid default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(f.key, public.feature_an(f.key, p_group_id)), '{}'::jsonb)
    from public.features f;
$$;
revoke all on function public.meine_features(uuid) from public, anon;
grant execute on function public.meine_features(uuid) to authenticated;
