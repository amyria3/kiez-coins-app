-- Push-Nachrichten (Daria, 16.11.2026): Struktur für Web-Push (Web-App auf dem Home-Bildschirm) und die Android-App.
--
-- Ablauf: Ein Ereignis (Nachricht, Freundschaftsanfrage, Challenge angenommen …) ruft `queue_push` auf. Die Funktion
-- prüft die Einstellungen der Person, schreibt eine Zeile in `push_outbox` und stößt die Edge Function `push` an
-- (pg_net). Die Edge Function schickt die Nachricht an alle Geräte der Person (`push_subscriptions`) und vermerkt
-- das Ergebnis. Nie an die Person selbst, nie zwischen blockierten Personen.
--
-- Arten (je ein Schalter unter Dein Konto › Benachrichtigungen, dazu der Hauptschalter `push`):
-- * messages: neue Nachricht
-- * challenges: angenommen, mitmachen (Anfrage, beigetreten, zugelassen, abgelehnt), erledigt gemeldet, bestätigt,
--   als bezahlt markiert, Coins angekommen
-- * friends: Freundschaftsanfrage, Anfrage angenommen, Einladung angenommen (Freundschaft per Code, Gruppe beigetreten)
-- * showcase: neue Follower:in des Schaufensters, neue Frage (Kommentar) zu einem Post im Schaufenster
--
-- Die Texte sind deutsch. Übersetzungen nach der Sprache der Person kommen später.
-- Voraussetzung: 20261110000400_schaufenster, 20261028000300_we_challenge_teilnehmende. Läuft auch mehrfach ohne Fehler.

create extension if not exists pg_net with schema extensions;

-- 1. Einstellungen je Art. `push` ist der Hauptschalter (gibt es seit 20261019000100).
alter table public.profile_settings
  add column if not exists push_messages boolean not null default true,
  add column if not exists push_challenges boolean not null default true,
  add column if not exists push_friends boolean not null default true,
  add column if not exists push_showcase boolean not null default true;

-- 2. Geräte: Web-Push-Abo (Endpoint und Schlüssel) oder Expo-Push-Token der Android-App
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('web', 'expo')),
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text check (p256dh is null or char_length(p256dh) <= 200),
  auth text check (auth is null or char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;
drop policy if exists "Eigene Geräte lesen" on public.push_subscriptions;
create policy "Eigene Geräte lesen" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- Gerät anmelden. Ein Gerät gehört immer der Person, die zuletzt darauf angemeldet war.
create or replace function public.save_push_subscription(p_kind text, p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Melde Dich zuerst an.' using errcode = 'P0001'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, kind, endpoint, p256dh, auth)
  values (auth.uid(), p_kind, p_endpoint, p_p256dh, p_auth);
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke execute on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.remove_push_subscription(text) to authenticated;

-- 3. Warteschlange. Nur der Service-Schlüssel (Edge Function) kommt heran.
create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('messages', 'challenges', 'friends', 'showcase')),
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 300),
  url text not null default '/' check (url like '/%' and char_length(url) <= 300),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text check (error is null or char_length(error) <= 500)
);
create index if not exists push_outbox_open_idx on public.push_outbox (created_at) where sent_at is null;
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;
-- Erledigtes nach 30 Tagen weg
select cron.schedule('push-outbox-aufraeumen', '17 3 * * *', $$delete from public.push_outbox where created_at < now() - interval '30 days'$$);

-- Deckname für Texte
create or replace function public.push_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.handle), ''), 'Jemand') from public.profiles p where p.id = p_user;
$$;
revoke execute on function public.push_name(uuid) from public, anon, authenticated;

-- Titel eines Posts für Texte
create or replace function public.push_title(p_challenge public.challenges)
returns text
language sql
immutable
set search_path = ''
as $$
  select '„' || coalesce(nullif(btrim(p_challenge.title), ''), 'Dein Post') || '“';
$$;
revoke execute on function public.push_title(public.challenges) from public, anon, authenticated;

-- 4. Eine Nachricht einreihen und die Edge Function anstoßen
create or replace function public.queue_push(p_user uuid, p_category text, p_title text, p_body text, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_actor uuid := auth.uid();
begin
  if p_user is null or p_user = v_actor then return; end if;
  if v_actor is not null and public.is_blocked_between(p_user, v_actor) then return; end if;
  if not exists (
    select 1 from public.profile_settings s
     where s.user_id = p_user and s.push
       and case p_category
             when 'messages' then s.push_messages
             when 'challenges' then s.push_challenges
             when 'friends' then s.push_friends
             when 'showcase' then s.push_showcase
             else false
           end
  ) then return; end if;
  if not exists (select 1 from public.push_subscriptions d where d.user_id = p_user) then return; end if;
  insert into public.push_outbox (user_id, category, title, body, url)
  values (p_user, p_category, left(p_title, 120), left(coalesce(p_body, ''), 300), coalesce(p_url, '/'))
  returning id into v_id;
  -- Asynchron: Die Edge Function holt die Zeile selbst. Ohne Schlüssel, denn sie verschickt nur, was schon hier steht.
  perform net.http_post(
    url := 'https://aqxzxpxrshizlaqyjplw.supabase.co/functions/v1/push',
    body := jsonb_build_object('id', v_id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  -- Push darf nie das eigentliche Ereignis (Nachricht, Annehmen …) verhindern
  raise warning 'push: %', sqlerrm;
end;
$$;
revoke execute on function public.queue_push(uuid, text, text, text, text) from public, anon, authenticated;

-- 5. Ereignisse

-- Nachrichten
create or replace function public.push_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.queue_push(new.recipient_id, 'messages', public.push_name(new.sender_id), left(new.body, 120), '/chat/' || new.sender_id);
  return new;
end;
$$;
drop trigger if exists messages_push on public.messages;
create trigger messages_push after insert on public.messages for each row execute function public.push_on_message();

-- Freundschaften: Anfrage, angenommen, Einladung per Code angenommen
create or replace function public.push_on_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.queue_push(new.addressee_id, 'friends', 'Neue Freundschaftsanfrage',
      public.push_name(new.requester_id) || ' möchte mit Dir befreundet sein.', '/account/friends');
  elsif tg_op = 'INSERT' and new.status = 'accepted' then
    perform public.queue_push(new.requester_id, 'friends', 'Einladung angenommen',
      public.push_name(new.addressee_id) || ' hat Deine Einladung angenommen. Ihr seid jetzt befreundet.', '/user/' || new.addressee_id);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    perform public.queue_push(case when auth.uid() = new.requester_id then new.addressee_id else new.requester_id end, 'friends',
      'Freundschaft angenommen',
      public.push_name(auth.uid()) || ' hat Deine Freundschaftsanfrage angenommen.', '/user/' || auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists friendships_push on public.friendships;
create trigger friendships_push after insert or update of status on public.friendships
  for each row execute function public.push_on_friendship();

-- Gruppe per Einladung beigetreten: an die Gründerin
create or replace function public.push_on_group_member()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  g public.groups;
begin
  if new.role <> 'member' or new.user_id <> auth.uid() then return new; end if;
  select * into g from public.groups where id = new.group_id;
  perform public.queue_push(g.founder_id, 'friends', 'Einladung angenommen',
    public.push_name(new.user_id) || ' ist „' || g.name || '“ beigetreten.', '/groups/' || g.id);
  return new;
end;
$$;
drop trigger if exists group_members_push on public.group_members;
create trigger group_members_push after insert on public.group_members for each row execute function public.push_on_group_member();

-- Challenge-Ablauf (eine Person)
create or replace function public.push_on_challenge()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := '/challenge/' || new.id;
begin
  if new.status = old.status and new.assignee_id is not distinct from old.assignee_id then return new; end if;
  if new.assignee_id is not null and old.assignee_id is null and new.status = 'accepted' then
    perform public.queue_push(new.author_id, 'challenges', 'Challenge angenommen',
      public.push_name(new.assignee_id) || ' hat ' || public.push_title(new) || ' angenommen.', v_url);
  elsif new.status = 'reported' and old.status <> 'reported' then
    perform public.queue_push(new.author_id, 'challenges', 'Erledigt gemeldet',
      public.push_name(coalesce(new.assignee_id, auth.uid())) || ' hat ' || public.push_title(new) || ' erledigt. Schau es Dir an.', v_url);
  elsif new.status = 'confirmed' and old.status <> 'confirmed' then
    perform public.queue_push(new.assignee_id, 'challenges', 'Bestätigt', public.push_title(new) || ' ist bestätigt. Danke!', v_url);
  elsif new.status = 'paid_marked' and old.status <> 'paid_marked' then
    perform public.queue_push(new.assignee_id, 'challenges', 'Als bezahlt markiert',
      'Die Coins für ' || public.push_title(new) || ' sind unterwegs. Sind sie angekommen?', v_url);
  elsif new.status = 'paid' and old.status <> 'paid' then
    perform public.queue_push(new.author_id, 'challenges', 'Coins angekommen',
      'Die Coins für ' || public.push_title(new) || ' sind angekommen.', v_url);
  end if;
  return new;
end;
$$;
drop trigger if exists challenges_push on public.challenges;
create trigger challenges_push after update of status, assignee_id on public.challenges
  for each row execute function public.push_on_challenge();

-- Mitmachen bei We-Challenges mit mehreren Plätzen
create or replace function public.push_on_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c public.challenges;
  v_url text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  select * into c from public.challenges where id = new.challenge_id;
  v_url := '/challenge/' || c.id;
  if new.status = 'requested' then
    perform public.queue_push(c.author_id, 'challenges', 'Neue Anfrage',
      public.push_name(new.user_id) || ' möchte bei ' || public.push_title(c) || ' mitmachen.', v_url);
  elsif new.status = 'joined' and auth.uid() = new.user_id then
    perform public.queue_push(c.author_id, 'challenges', 'Neu dabei',
      public.push_name(new.user_id) || ' macht bei ' || public.push_title(c) || ' mit.', v_url);
  elsif new.status = 'joined' then
    perform public.queue_push(new.user_id, 'challenges', 'Du bist dabei', 'Du machst bei ' || public.push_title(c) || ' mit.', v_url);
  elsif new.status = 'declined' then
    perform public.queue_push(new.user_id, 'challenges', 'Anfrage abgelehnt',
      'Für ' || public.push_title(c) || ' hat es diesmal nicht geklappt.', v_url);
  end if;
  return new;
end;
$$;
drop trigger if exists challenge_participants_push on public.challenge_participants;
create trigger challenge_participants_push after insert or update of status on public.challenge_participants
  for each row execute function public.push_on_participant();

-- Schaufenster: neue Follower:in an die Gründerin der Gruppe hinter dem Schaufenster
create or replace function public.push_on_showcase_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s public.showcases;
  v_founder uuid;
begin
  select * into s from public.showcases where id = new.showcase_id;
  select g.founder_id into v_founder from public.groups g where g.id = s.group_id;
  perform public.queue_push(v_founder, 'showcase', 'Neue Follower:in',
    public.push_name(new.user_id) || ' folgt jetzt „' || s.name || '“.', '/schaufenster/' || s.id);
  return new;
end;
$$;
drop trigger if exists showcase_follows_push on public.showcase_follows;
create trigger showcase_follows_push after insert on public.showcase_follows for each row execute function public.push_on_showcase_follow();

-- Schaufenster: neue Frage (Kommentar) zu einem Post, an die Person, die ihn gepostet hat
create or replace function public.push_on_showcase_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c public.challenges;
begin
  select * into c from public.challenges where id = new.challenge_id;
  if c.showcase_id is null then return new; end if;
  perform public.queue_push(c.author_id, 'showcase', 'Neue Frage zu ' || public.push_title(c),
    public.push_name(new.author_id) || ': ' || left(coalesce(nullif(btrim(new.body), ''), 'Bild'), 100),
    '/challenge/' || c.id || '?kommentare=1');
  return new;
end;
$$;
drop trigger if exists comments_showcase_push on public.comments;
create trigger comments_showcase_push after insert on public.comments for each row execute function public.push_on_showcase_comment();
