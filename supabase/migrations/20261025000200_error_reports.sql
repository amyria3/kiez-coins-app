-- Fehlerberichte aus dem Fehler-Screen der App (src/components/ErrorScreen.tsx)
-- und aus der Startfehler-Anzeige der Web-App (public/index.html). Daria, 2026-10-25.
--
-- * Anlegen dürfen alle, auch ohne Anmeldung, da die App auch vor dem Login abstürzen kann.
-- * Lesen und Status setzen dürfen nur Moderator:innen (public.is_moderator()).
-- * Die Person ist optional: Angemeldet setzt die Datenbank auth.uid(), sonst bleibt sie leer.

create table public.error_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  message text not null check (char_length(message) between 1 and 1000),
  stack text check (char_length(stack) <= 8000),
  comment text check (char_length(comment) <= 1000),
  screen text check (char_length(screen) <= 300),
  platform text check (char_length(platform) <= 300),
  app_version text check (char_length(app_version) <= 50),
  look text check (char_length(look) <= 30),
  start_info text check (char_length(start_info) <= 300),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index error_reports_created_idx on public.error_reports (created_at desc);

alter table public.error_reports enable row level security;

revoke all on public.error_reports from anon, authenticated;
grant insert (message, stack, comment, screen, platform, app_version, look, start_info)
  on public.error_reports to anon, authenticated;
grant select, update (status) on public.error_reports to authenticated;

create policy "Fehlerbericht senden" on public.error_reports for insert to anon, authenticated
  with check (user_id is not distinct from (select auth.uid()) and status = 'new');
create policy "Fehlerberichte lesen" on public.error_reports for select to authenticated
  using ((select public.is_moderator()));
create policy "Fehlerbericht erledigen" on public.error_reports for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
