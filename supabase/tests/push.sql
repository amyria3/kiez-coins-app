-- Prüft die Push-Warteschlange (Migration 20261116000300_push, Daria, 2026-11-16): wer wann eine Nachricht bekommt.
-- Jede Prüfung bricht mit „FAIL: …“ ab. Läuft in einer Transaktion und wird am Ende zurückgerollt.
-- Ausführen mit supabase/tests/lokal/pruefen.sh oder im SQL-Editor.
begin;

insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-d000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','qa@test.local'),
 ('00000000-0000-4000-d000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','qb@test.local');
update public.profiles set handle = 'Push A', kiez = 'Leipzig' where id = '00000000-0000-4000-d000-00000000000a';
update public.profiles set handle = 'Push B', kiez = 'Leipzig' where id = '00000000-0000-4000-d000-00000000000b';
-- Nur B hat ein Gerät angemeldet
insert into public.push_subscriptions (user_id, kind, endpoint, p256dh, auth) values
 ('00000000-0000-4000-d000-00000000000b', 'web', 'https://push.example/b', 'k', 'a');
insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
 ('00000000-0000-4000-d000-00000000000a','00000000-0000-4000-d000-00000000000b','accepted', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-d000-00000000000a","role":"authenticated"}';
insert into public.messages (recipient_id, body) values ('00000000-0000-4000-d000-00000000000b', 'Kommst Du mit?');

reset role;
do $$ begin
  if (select count(*) from public.push_outbox where user_id = '00000000-0000-4000-d000-00000000000b' and category = 'messages'
        and title = 'Push A' and body = 'Kommst Du mit?' and url = '/chat/00000000-0000-4000-d000-00000000000a') <> 1 then
    raise exception 'FAIL: Nachricht nicht in der Warteschlange';
  end if;
  if exists (select 1 from public.push_outbox where user_id = '00000000-0000-4000-d000-00000000000a') then
    raise exception 'FAIL: Push an jemanden ohne Gerät';
  end if;
end $$;

-- B schaltet Nachrichten aus: nichts mehr
update public.profile_settings set push_messages = false where user_id = '00000000-0000-4000-d000-00000000000b';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-d000-00000000000a","role":"authenticated"}';
insert into public.messages (recipient_id, body) values ('00000000-0000-4000-d000-00000000000b', 'Noch da?');
reset role;
do $$ begin
  if (select count(*) from public.push_outbox where user_id = '00000000-0000-4000-d000-00000000000b') <> 1 then
    raise exception 'FAIL: Push trotz ausgeschalteter Nachrichten';
  end if;
end $$;

-- Hauptschalter aus: auch Freundschaften nicht. An: Freundschaftsanfrage kommt an.
update public.profile_settings set push = false where user_id = '00000000-0000-4000-d000-00000000000b';
delete from public.friendships;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-d000-00000000000a","role":"authenticated"}';
insert into public.friendships (addressee_id) values ('00000000-0000-4000-d000-00000000000b');
reset role;
do $$ begin
  if exists (select 1 from public.push_outbox where category = 'friends') then
    raise exception 'FAIL: Push trotz Hauptschalter aus';
  end if;
end $$;
update public.profile_settings set push = true where user_id = '00000000-0000-4000-d000-00000000000b';
delete from public.friendships;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-d000-00000000000a","role":"authenticated"}';
insert into public.friendships (addressee_id) values ('00000000-0000-4000-d000-00000000000b');
reset role;
do $$ begin
  if (select count(*) from public.push_outbox where category = 'friends' and title = 'Neue Freundschaftsanfrage') <> 1 then
    raise exception 'FAIL: Freundschaftsanfrage ohne Push';
  end if;
end $$;

-- Die Warteschlange ist für Angemeldete unsichtbar
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-d000-00000000000b","role":"authenticated"}';
do $$ begin
  perform 1 from public.push_outbox;
  raise exception 'FAIL: Warteschlange lesbar';
exception when insufficient_privilege then null;
end $$;

select 'push: alles in Ordnung' as ergebnis;
rollback;
