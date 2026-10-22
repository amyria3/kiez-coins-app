-- Direktnachrichten unter Freund:innen (Daria, 22.10.2026).
-- Nur bestätigte Freund:innen (friendships, Status accepted) schreiben und lesen sich.
-- Endet die Freundschaft (auch durch Blockieren), ist der Chat für beide weg.
-- Inhalte verschwinden nach einem Monat: täglich gelöscht (pg_cron), und ältere sind schon vorher unsichtbar.
-- Voraussetzung: 20261022000400_bio_friends.sql

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_not_self check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx
  on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;
revoke all on public.messages from anon;
grant select, insert, delete on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

drop policy if exists "Eigene Nachrichten lesen" on public.messages;
create policy "Eigene Nachrichten lesen" on public.messages for select to authenticated
  using (
    (select auth.uid()) in (sender_id, recipient_id)
    and created_at > now() - interval '1 month'
    and public.are_friends(sender_id, recipient_id)
  );

drop policy if exists "Nachricht an Freund:in" on public.messages;
create policy "Nachricht an Freund:in" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.are_friends(sender_id, recipient_id));

drop policy if exists "Gelesen markieren" on public.messages;
create policy "Gelesen markieren" on public.messages for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

drop policy if exists "Eigene Nachricht löschen" on public.messages;
create policy "Eigene Nachricht löschen" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));

-- Neue Nachrichten ohne Neuladen (Supabase Realtime, RLS gilt auch hier)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Nach einem Monat löschen: täglich um 3:17 Uhr (UTC)
create extension if not exists pg_cron with schema pg_catalog;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'messages_nach_einem_monat_loeschen') then
    perform cron.unschedule('messages_nach_einem_monat_loeschen');
  end if;
  perform cron.schedule(
    'messages_nach_einem_monat_loeschen',
    '17 3 * * *',
    $job$delete from public.messages where created_at < now() - interval '1 month'$job$
  );
end;
$$;
