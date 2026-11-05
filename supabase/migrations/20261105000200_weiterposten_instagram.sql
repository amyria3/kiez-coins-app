-- Weiterposten auch auf Instagram (Daria, 05.11.2026). Erlaubt 'instagram' in crosspost_accounts und crosspost_posts.
-- Instagram: handle = Benutzername, instance = https://graph.instagram.com, secret = Zugangs-Token aus Meta for Developers.
-- Voraussetzung: 20261105000100_weiterposten.sql. Läuft auch mehrfach ohne Fehler.

alter table public.crosspost_accounts drop constraint if exists crosspost_accounts_platform_check;
alter table public.crosspost_accounts add constraint crosspost_accounts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram'));

alter table public.crosspost_posts drop constraint if exists crosspost_posts_platform_check;
alter table public.crosspost_posts add constraint crosspost_posts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram'));
