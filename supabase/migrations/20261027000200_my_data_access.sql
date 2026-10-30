-- „Abrufe Deiner Daten“ im Menü (Daria, 27.10.2026): Jede Person sieht, ob jemand aus dem Team
-- ihre Chats abgerufen hat (chat_access_log, Migration 20261027000100_chat_access_log.sql).
-- Zurück kommen alle gezielten Abrufe, an denen die Person beteiligt ist (höchstens 100), und der
-- letzte automatische Eintrag (tägliches Löschen, ohne Person und ohne Inhalte).
-- Die Zahl der automatisch gelöschten Nachrichten gilt für alle und bleibt deshalb weg.

create or replace function public.meine_datenabrufe()
returns table (created_at timestamptz, kind text, actor text, reason text, targeted boolean, content_read boolean)
language sql
stable
security definer
set search_path = ''
as $$
  (select l.created_at, l.kind, l.actor, l.reason, l.targeted, l.content_read
     from public.chat_access_log l
    where l.kind = 'person'
      and (select auth.uid()) in (l.person_a, l.person_b)
    order by l.created_at desc
    limit 100)
  union all
  (select l.created_at, l.kind, l.actor, l.reason, l.targeted, l.content_read
     from public.chat_access_log l
    where l.kind = 'automatisch'
    order by l.created_at desc
    limit 1);
$$;
revoke execute on function public.meine_datenabrufe() from public, anon;
grant execute on function public.meine_datenabrufe() to authenticated;
