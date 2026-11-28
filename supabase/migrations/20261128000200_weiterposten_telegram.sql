-- Weiterposten auch auf Telegram (Daria, 2026-11-28). Ein KiezCoins-Bot für alle. Jeder Weiterpost geht in den
-- privaten Chat der Person mit dem Bot (zum Weiterleiten in Gruppen ohne Bots) und zusätzlich in jeden Kanal und jede
-- Gruppe, in die die Person den Bot aufgenommen hat.
-- Telegram in crosspost_accounts: handle = @Benutzername oder Name, instance = Chat-ID des privaten Chats (gleich der
-- Telegram-Kennung der Person), secret = dieselbe Kennung (der Bot-Schlüssel ist ein Secret der Edge Functions).
-- Edge Functions: `weiterposten` (verbinden beginnen, posten, löschen) und `telegram-bot` (Webhook).
-- Voraussetzung: 20261128000100_weiterposten_linkedin.sql. Läuft auch mehrfach ohne Fehler.

alter table public.crosspost_accounts drop constraint if exists crosspost_accounts_platform_check;
alter table public.crosspost_accounts add constraint crosspost_accounts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook', 'linkedin', 'telegram'));

alter table public.crosspost_posts drop constraint if exists crosspost_posts_platform_check;
alter table public.crosspost_posts add constraint crosspost_posts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook', 'linkedin', 'telegram'));

alter table public.crosspost_event_posts drop constraint if exists crosspost_event_posts_platform_check;
alter table public.crosspost_event_posts add constraint crosspost_event_posts_platform_check
  check (platform in ('bluesky', 'mastodon', 'instagram', 'facebook', 'linkedin', 'telegram'));

-- Gesendete Nachrichten eines Weiterposts, zum Löschen: [{ "chat": <id>, "message": <id> }]. Nur Telegram setzt sie,
-- denn dort entstehen je Post mehrere Nachrichten (privater Chat, Kanäle, Gruppen).
alter table public.crosspost_posts add column if not exists refs jsonb;
alter table public.crosspost_event_posts add column if not exists refs jsonb;

-- Codes zum Verbinden: t.me/<bot>?start=<code>. Gilt 10 Minuten und wird beim „Starten“ gelöscht.
-- Nur die Edge Functions lesen und schreiben.
create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.telegram_link_codes enable row level security;
revoke all on public.telegram_link_codes from anon, authenticated;

-- Kanäle und Gruppen, in denen der Bot posten darf, mit der Telegram-Kennung der Person, die ihn aufgenommen hat.
-- Die Zeile entsteht auch vor dem Verbinden; sie gilt, sobald ein KiezCoins-Konto mit dieser Kennung verbunden ist.
-- Nur die Edge Functions lesen und schreiben; die App fragt über `weiterposten` (telegram_chats, telegram_remove).
create table if not exists public.telegram_chats (
  chat_id bigint primary key,
  added_by bigint not null,
  title text not null default '',
  kind text not null check (kind in ('channel', 'group', 'supergroup')),
  username text,
  created_at timestamptz not null default now()
);
create index if not exists telegram_chats_added_by_idx on public.telegram_chats (added_by);
alter table public.telegram_chats enable row level security;
revoke all on public.telegram_chats from anon, authenticated;
