-- Protokoll, wer private Chats liest (Daria, 27.10.2026).
-- Die App selbst zeigt Nachrichten nur den beiden Beteiligten (RLS in 20261022000600_messages.sql).
-- Daria und Claude können sie aber im SQL-Editor oder per Supabase-MCP lesen. Dafür gilt:
--
-- 1. Lesen nur über chat_einsehen(person_a, person_b, wer, grund). Jeder Aufruf landet dauerhaft
--    in chat_access_log: wann, wer (Daria oder Claude), welches Paar, warum.
--    Beispiel: select * from public.chat_einsehen('<id a>', '<id b>', 'Daria', 'Meldung wegen Belästigung');
--    Automatische Vorgänge (das tägliche Löschen nach einem Monat) stehen ebenfalls im Protokoll,
--    aber klar getrennt: kind = 'automatisch', keine Person, keine gezielte Abfrage, keine Inhalte
--    gelesen (nur das Datum geprüft). Das legt ein Check-Constraint fest.
-- 2. Sicherheitsnetz: pgaudit schreibt jedes direkte Lesen von public.messages durch die Rollen
--    postgres und service_role ins Postgres-Log (Dashboard > Logs > Postgres, nach "AUDIT" suchen).
--    Im Free-Plan hält Supabase das Log nur einen Tag. Es zeigt also Umgehungen von heute, ist aber kein Archiv.
--    Die App-Nutzer:innen (Rolle authenticated) protokolliert pgaudit nicht.
--    Auch das automatische Löschen erscheint dort, erkennbar an messages_alte_loeschen bzw.
--    "delete from public.messages where created_at < ...". Es ist im dauerhaften Protokoll als automatisch vermerkt.

-- ---------------------------------------------------------------------------
-- 1. Protokolltabelle
-- ---------------------------------------------------------------------------

create table if not exists public.chat_access_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- 'person': Daria oder Claude haben einen Chat gezielt geöffnet und die Texte gelesen.
  -- 'automatisch': Ablauf der Datenbank ohne Person, ohne Ziel, ohne Inhalte.
  kind text not null check (kind in ('person', 'automatisch')),
  actor text not null check (char_length(btrim(actor)) between 2 and 60),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  person_a uuid,
  person_b uuid,
  targeted boolean not null,
  content_read boolean not null,
  message_count integer not null default 0,
  db_role text not null default current_user,
  constraint chat_access_log_kind_fits check (
    (kind = 'person' and person_a is not null and person_b is not null and targeted and content_read)
    or
    (kind = 'automatisch' and person_a is null and person_b is null and not targeted and not content_read)
  )
);
create index if not exists chat_access_log_created_at_idx on public.chat_access_log (created_at desc);

comment on column public.chat_access_log.targeted is 'true: ein bestimmter Chat wurde gezielt abgefragt. false: ungezielter, automatischer Vorgang.';
comment on column public.chat_access_log.content_read is 'true: Nachrichtentexte wurden gelesen. false: nur Metadaten wie das Datum.';

alter table public.chat_access_log enable row level security;
revoke all on public.chat_access_log from anon, authenticated;
grant select on public.chat_access_log to authenticated;

-- Moderator:innen sehen das Protokoll (für eine spätere Ansicht in der App). Schreiben können nur die Funktionen unten.
drop policy if exists "Moderation liest Protokoll" on public.chat_access_log;
create policy "Moderation liest Protokoll" on public.chat_access_log for select to authenticated
  using ((select public.is_moderator()));

-- ---------------------------------------------------------------------------
-- 2. Gezielt lesen (Person)
-- ---------------------------------------------------------------------------

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

  insert into public.chat_access_log (kind, actor, reason, person_a, person_b, targeted, content_read, message_count)
  values ('person', btrim(wer), btrim(grund), person_a, person_b, true, true, n);

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
-- 3. Automatisch: tägliches Löschen nach einem Monat, jetzt mit Protokolleintrag
-- ---------------------------------------------------------------------------

create or replace function public.messages_alte_loeschen()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  -- Prüft nur created_at. body wird weder gelesen noch zurückgegeben.
  delete from public.messages where created_at < now() - interval '1 month';
  get diagnostics n = row_count;

  insert into public.chat_access_log (kind, actor, reason, targeted, content_read, message_count)
  values (
    'automatisch',
    'System (pg_cron)',
    'Tägliches Löschen von Nachrichten, die älter als einen Monat sind. Nur das Datum geprüft, keine Inhalte gelesen, keine Person, keine gezielte Abfrage.',
    false,
    false,
    n
  );
  return n;
end;
$$;
revoke execute on function public.messages_alte_loeschen() from public, anon, authenticated, service_role;

-- Den Job aus 20261022000600_messages.sql auf die Funktion umstellen (gleicher Name, gleiche Zeit)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'messages_nach_einem_monat_loeschen') then
    perform cron.unschedule('messages_nach_einem_monat_loeschen');
  end if;
  perform cron.schedule(
    'messages_nach_einem_monat_loeschen',
    '17 3 * * *',
    $job$select public.messages_alte_loeschen()$job$
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Sicherheitsnetz: pgaudit für direktes Lesen
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
