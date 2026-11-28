-- Weiterposten auch auf LinkedIn, persönliches Profil (Daria, 2026-11-28). Erlaubt 'linkedin' in crosspost_accounts,
-- crosspost_posts und crosspost_event_posts. Anmeldung per OAuth über die Edge Function `linkedin-anmeldung`.
-- LinkedIn: handle = Name, instance = urn:li:person:<id>, secret = Zugangs-Token (läuft nach 60 Tagen ab).
-- Voraussetzung: 20261118000400_weiterposten_termine.sql. Läuft auch mehrfach ohne Fehler.

alter table public.crosspost_accounts drop constraint if exists crosspost_accounts_platform_check;
alter table public.crosspost_accounts add constraint crosspost_accounts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook', 'linkedin'));

alter table public.crosspost_posts drop constraint if exists crosspost_posts_platform_check;
alter table public.crosspost_posts add constraint crosspost_posts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook', 'linkedin'));

alter table public.crosspost_event_posts drop constraint if exists crosspost_event_posts_platform_check;
alter table public.crosspost_event_posts add constraint crosspost_event_posts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook', 'linkedin'));

-- Ablauf des Zugangs. Nur LinkedIn setzt ihn; die App zeigt danach „Neu verbinden“.
alter table public.crosspost_accounts add column if not exists expires_at timestamptz;
grant select (expires_at) on public.crosspost_accounts to authenticated;

-- Offene Anmeldungen: verbindet die Rückkehr von LinkedIn mit der Person. Nur die Edge Functions lesen und schreiben.
-- Eine Zeile gilt 10 Minuten und wird bei der Rückkehr gelöscht.
create table if not exists public.linkedin_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  return_to text not null,
  created_at timestamptz not null default now()
);
alter table public.linkedin_oauth_states enable row level security;
revoke all on public.linkedin_oauth_states from anon, authenticated;
