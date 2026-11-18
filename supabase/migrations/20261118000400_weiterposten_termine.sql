-- Weiterposten auch für Schaufenster-Termine (Daria, 2026-11-18: kostenlose Integrationen für kleine Betriebe).
-- Baut auf 20261105000100, 20261109000300 und 20261110000400 auf.
--
-- * crosspost_event_posts: wie crosspost_posts, nur je Termin statt je Post. Die Edge Function `weiterposten`
--   schreibt mit dem Service-Schlüssel (Aktion post_event); lesen darf jede Person nur ihre eigenen Zeilen.
-- * Jeder Termin höchstens einmal je Plattform; nach einem Fehler darf es noch einmal klappen.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

create table if not exists public.crosspost_event_posts (
  event_id uuid not null references public.showcase_events (id) on delete cascade,
  platform text not null check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook')),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('running', 'ok', 'error')),
  url text check (url is null or char_length(url) <= 500),
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  primary key (event_id, platform)
);
create index if not exists crosspost_event_posts_user_idx on public.crosspost_event_posts (user_id);

alter table public.crosspost_event_posts enable row level security;
revoke all on public.crosspost_event_posts from anon, authenticated;
grant select on public.crosspost_event_posts to authenticated;

drop policy if exists "Eigene Weiterposts von Terminen lesen" on public.crosspost_event_posts;
create policy "Eigene Weiterposts von Terminen lesen" on public.crosspost_event_posts for select to authenticated
  using (user_id = (select auth.uid()));
