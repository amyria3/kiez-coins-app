-- Weiterposten auf BlueSky und Mastodon (Daria, 05.11.2026). Beide Schnittstellen kosten nichts.
--
-- * crosspost_accounts: verbundenes Konto pro Person und Plattform. Den Zugang (App-Passwort bei BlueSky,
--   Zugangsschlüssel bei Mastodon) schreibt und liest nur die Edge Function `weiterposten` mit dem Service-Schlüssel.
--   Die Person sieht ihr Konto ohne Zugang und kann es trennen (löschen).
-- * crosspost_posts: was wohin weitergepostet wurde, mit Link oder Fehler. Ein Post geht höchstens einmal pro
--   Plattform raus (Primärschlüssel). Nur die Edge Function schreibt, die Person liest ihre eigenen Zeilen.
--
-- Läuft auch mehrfach ohne Fehler.

create table if not exists public.crosspost_accounts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('bluesky', 'mastodon')),
  -- BlueSky: Handle (z. B. hofgruen.bsky.social), Mastodon: Konto (z. B. hofgruen@leipzig.town)
  handle text not null check (char_length(handle) between 1 and 200),
  -- Mastodon: Adresse der Instanz (https://leipzig.town), BlueSky: Server (https://bsky.social)
  instance text not null check (char_length(instance) between 8 and 200),
  secret text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, platform)
);

alter table public.crosspost_accounts enable row level security;
revoke all on public.crosspost_accounts from anon, authenticated;
grant select (user_id, platform, handle, instance, created_at) on public.crosspost_accounts to authenticated;
grant delete on public.crosspost_accounts to authenticated;

drop policy if exists "Eigene verbundene Konten lesen" on public.crosspost_accounts;
create policy "Eigene verbundene Konten lesen" on public.crosspost_accounts for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Eigenes Konto trennen" on public.crosspost_accounts;
create policy "Eigenes Konto trennen" on public.crosspost_accounts for delete to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.crosspost_posts (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  platform text not null check (platform in ('bluesky', 'mastodon')),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('running', 'ok', 'error')),
  url text check (url is null or char_length(url) <= 500),
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  primary key (challenge_id, platform)
);

alter table public.crosspost_posts enable row level security;
revoke all on public.crosspost_posts from anon, authenticated;
grant select on public.crosspost_posts to authenticated;

drop policy if exists "Eigene Weiterposts lesen" on public.crosspost_posts;
create policy "Eigene Weiterposts lesen" on public.crosspost_posts for select to authenticated
  using (user_id = (select auth.uid()));
