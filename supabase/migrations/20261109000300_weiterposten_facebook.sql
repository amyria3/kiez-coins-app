-- Weiterposten auch auf Facebook-Seiten (Daria, 09.11.2026). Erlaubt 'facebook' in crosspost_accounts und crosspost_posts.
-- Facebook: handle = Name der Seite, instance = https://graph.facebook.com/<Seiten-ID>, secret = Seiten-Zugangs-Token.
-- Voraussetzung: 20261105000200_weiterposten_instagram.sql. Läuft auch mehrfach ohne Fehler.

alter table public.crosspost_accounts drop constraint if exists crosspost_accounts_platform_check;
alter table public.crosspost_accounts add constraint crosspost_accounts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook'));

alter table public.crosspost_posts drop constraint if exists crosspost_posts_platform_check;
alter table public.crosspost_posts add constraint crosspost_posts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook'));
