-- Offizielle Posts über den KiezCoins-Connector (Daria, 03.11.2026).
--
-- Claude legt Posts über die Edge Function `kiezcoins-social` an. Ein Post erscheint zur geplanten Zeit auf
-- KiezCoins (als Bild-Beitrag des offiziellen Kontos), X, Bluesky und Instagram.
--
-- * profiles.is_official: markiert das eine offizielle KiezCoins-Konto. Nutzerinnen können die Spalte nicht ändern.
-- * social_posts: Warteschlange der Posts. Nur die Edge Function liest und schreibt sie (Service Role).
-- * claim_social_posts(): holt fällige Posts und sperrt sie 5 Minuten, damit kein Post doppelt erscheint.
-- * Cron-Job `kiezcoins-social-publish`: ruft die Edge Function alle 5 Minuten auf. URL und Schlüssel liegen im
--   Vault (Secrets `kiezcoins_social_url` und `kiezcoins_social_cron_key`), Anleitung in
--   Übergabe/2026-11-03_offen_social-connector.md.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.profiles add column if not exists is_official boolean not null default false;
create unique index if not exists profiles_one_official on public.profiles (is_official) where is_official;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  -- Titel auf KiezCoins
  title text not null check (char_length(btrim(title)) between 1 and 60),
  -- Grundtext für alle Kanäle; text_x und text_bluesky ersetzen ihn dort, wo er zu lang ist
  text text not null check (char_length(text) <= 2200),
  text_x text check (char_length(text_x) <= 280),
  text_bluesky text check (char_length(text_bluesky) <= 300),
  -- Pfad im Bucket `photos`, Ordner des offiziellen Kontos
  image_path text not null,
  image_alt text not null default '' check (char_length(image_alt) <= 1000),
  channels text[] not null default array['kiezcoins', 'x', 'bluesky', 'instagram']
    check (channels <@ array['kiezcoins', 'x', 'bluesky', 'instagram'] and cardinality(channels) >= 1),
  publish_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Ergebnis je Kanal: kiezcoins = id der Challenge, x = id des Posts, bluesky = at-URI, instagram = id des Posts
  results jsonb not null default '{}'::jsonb,
  -- Letzter Fehler je Kanal
  errors jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  locked_until timestamptz,
  done_at timestamptz
);
create index if not exists social_posts_due_idx on public.social_posts (publish_at) where done_at is null;

alter table public.social_posts enable row level security;
revoke all on public.social_posts from anon, authenticated;

-- Token für Instagram. Die Edge Function erneuert ihn selbst, bevor er nach 60 Tagen abläuft.
create table if not exists public.social_tokens (
  name text primary key,
  token text not null,
  refreshed_at timestamptz not null default now()
);
alter table public.social_tokens enable row level security;
revoke all on public.social_tokens from anon, authenticated;

-- Fällige Posts holen und 5 Minuten sperren. Nach 3 Versuchen bleibt ein Post liegen; die Fehler stehen in errors.
create or replace function public.claim_social_posts(p_id uuid default null)
returns setof public.social_posts
language sql
security definer
set search_path = ''
as $$
  update public.social_posts s
     set locked_until = now() + interval '5 minutes', attempts = s.attempts + 1
   where s.id in (
     select q.id from public.social_posts q
      where q.done_at is null and q.publish_at <= now() and q.attempts < 3
        and (q.locked_until is null or q.locked_until < now())
        and (p_id is null or q.id = p_id)
      order by q.publish_at
      limit 10
      for update skip locked
   )
  returning s.*;
$$;
revoke execute on function public.claim_social_posts(uuid) from public, anon, authenticated;
grant execute on function public.claim_social_posts(uuid) to service_role;

-- Cron-Job: alle 5 Minuten. Ohne Vault-Secrets tut der Aufruf nichts.
do $$
begin
  perform cron.unschedule('kiezcoins-social-publish')
    where exists (select 1 from cron.job where jobname = 'kiezcoins-social-publish');
  perform cron.schedule(
    'kiezcoins-social-publish',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := url.decrypted_secret || '/publish',
        headers := jsonb_build_object('content-type', 'application/json', 'x-cron-key', key.decrypted_secret),
        body := '{}'::jsonb
      )
        from vault.decrypted_secrets url, vault.decrypted_secrets key
       where url.name = 'kiezcoins_social_url' and key.name = 'kiezcoins_social_cron_key'
         and exists (select 1 from public.social_posts s
                      where s.done_at is null and s.publish_at <= now() and s.attempts < 3);
    $job$
  );
end $$;
