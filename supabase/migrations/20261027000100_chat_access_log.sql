-- Protokoll, wer private Chats liest (Daria, 27.10.2026).
-- Die App selbst zeigt Nachrichten nur den beiden Beteiligten (RLS in 20261022000600_messages.sql).
-- Daria und Claude können sie aber im SQL-Editor oder per Supabase-MCP lesen. Dafür gilt:
--
-- 1. Lesen nur über chat_einsehen(person_a, person_b, wer, grund). Jeder Aufruf landet dauerhaft
--    in chat_access_log: wann, wer (Daria oder Claude), welches Paar, warum.
--    Beispiel: select * from public.chat_einsehen('<id a>', '<id b>', 'Daria', 'Meldung wegen Belästigung');
-- 2. Sicherheitsnetz: pgaudit schreibt jedes direkte Lesen von public.messages durch die Rollen
--    postgres und service_role ins Postgres-Log (Dashboard > Logs > Postgres, nach "AUDIT" suchen).
--    Im Free-Plan hält Supabase das Log nur einen Tag. Es zeigt also Umgehungen von heute, ist aber kein Archiv.
--    Die App-Nutzer:innen (Rolle authenticated) protokolliert pgaudit nicht.

-- ---------------------------------------------------------------------------
-- 1. Protokolltabelle und Lesefunktion
-- ---------------------------------------------------------------------------

create table if not exists public.chat_access_log (
  id bigint generated always as identity primary key,
  read_at timestamptz not null default now(),
  reader text not null check (char_length(btrim(reader)) between 2 and 60),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  person_a uuid not null,
  person_b uuid not null,
  message_count integer not null default 0,
  db_role text not null default current_user
);
create index if not exists chat_access_log_read_at_idx on public.chat_access_log (read_at desc);

alter table public.chat_access_log enable row level security;
revoke all on public.chat_access_log from anon, authenticated;
grant select on public.chat_access_log to authenticated;

-- Moderator:innen sehen das Protokoll (für eine spätere Ansicht in der App). Schreiben kann nur chat_einsehen.
drop policy if exists "Moderation liest Protokoll" on public.chat_access_log;
create policy "Moderation liest Protokoll" on public.chat_access_log for select to authenticated
  using ((select public.is_moderator()));

create or replace function public.chat_einsehen(person_a uuid, person_b uuid, wer text, grund text)
returns table (id uuid, sender_id uuid, recipient_id uuid, body text, created_at timestamptz, read_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  select count(*) into n
    from public.messages m
   where (m.sender_id = person_a and m.recipient_id = person_b)
      or (m.sender_id = person_b and m.recipient_id = person_a);

  insert into public.chat_access_log (reader, reason, person_a, person_b, message_count)
  values (btrim(wer), btrim(grund), person_a, person_b, n);

  return query
    select m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.read_at
      from public.messages m
     where (m.sender_id = person_a and m.recipient_id = person_b)
        or (m.sender_id = person_b and m.recipient_id = person_a)
     order by m.created_at;
end;
$$;
-- Nur im SQL-Editor bzw. per MCP (Rolle postgres), nicht aus der App
revoke execute on function public.chat_einsehen(uuid, uuid, text, text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Sicherheitsnetz: pgaudit für direktes Lesen
-- ---------------------------------------------------------------------------

create extension if not exists pgaudit;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'chat_auditor') then
    create role chat_auditor noinherit nologin;
  end if;
end;
$$;
grant select on public.messages to chat_auditor;

-- Gilt für neue Verbindungen dieser Rollen
alter role postgres set pgaudit.role to 'chat_auditor';
alter role service_role set pgaudit.role to 'chat_auditor';
