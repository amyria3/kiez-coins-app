-- Prüft die Freundschaftseinladung (Migration 20261024000200).
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen im SQL-Editor oder mit `psql -f`.
-- Jede Zeile im Ergebnis beginnt mit „ok“ oder zeigt den erwarteten Wert; „FAIL“ heißt, eine Regel greift nicht.
begin;
create temp table t_log(step int generated always as identity, msg text) on commit drop;
create temp table t_code(code text) on commit drop;
grant all on t_log, t_code to authenticated;
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-a000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.local'),
 ('00000000-0000-4000-a000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.local'),
 ('00000000-0000-4000-a000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.local');

set local role authenticated;
-- A holt den eigenen Code
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into t_code select public.my_friend_invite();
insert into t_log(msg) select 'code has 7 chars (true): ' || (char_length(code) = 7) from t_code;
insert into t_log(msg) select 'same code on second call (true): ' || (public.my_friend_invite() = code) from t_code;
insert into t_log(msg) select 'no news yet (0): ' || count(*) from public.take_new_invite_friends();
do $$ begin
  perform public.accept_friend_invite((select code from t_code));
  insert into t_log(msg) values ('FAIL: own code accepted');
exception when others then insert into t_log(msg) values ('ok own code refused: ' || sqlerrm);
end $$;
do $$ begin
  perform 1 from public.friend_invites;
  insert into t_log(msg) values ('FAIL: friend_invites readable');
exception when others then insert into t_log(msg) values ('ok friend_invites not readable: ' || sqlstate);
end $$;

-- B nimmt an, auch kleingeschrieben und zweimal
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';
insert into t_log(msg) select 'B accepts, inviter is A (true): '
  || (public.accept_friend_invite(lower(code)) = '00000000-0000-4000-a000-00000000000a') from t_code;
insert into t_log(msg) select 'second accept still fine (true): '
  || (public.accept_friend_invite(code) = '00000000-0000-4000-a000-00000000000a') from t_code;
insert into t_log(msg) select 'B sees accepted friendship (accepted): ' || status from public.friendships;

-- A bekommt den Hinweis genau einmal
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into t_log(msg) select 'news for A is B (true): '
  || (id = '00000000-0000-4000-a000-00000000000b') from public.take_new_invite_friends() as id;
insert into t_log(msg) select 'news only once (0): ' || count(*) from public.take_new_invite_friends();

-- C blockiert A: Annehmen geht nicht
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}';
insert into public.blocks (blocked_id) values ('00000000-0000-4000-a000-00000000000a');
do $$ begin
  perform public.accept_friend_invite((select code from t_code));
  insert into t_log(msg) values ('FAIL: accepted despite block');
exception when others then insert into t_log(msg) values ('ok blocked: ' || sqlerrm);
end $$;

-- A erzeugt einen neuen Code, der alte gilt nicht mehr
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into t_log(msg) select 'renewed code differs (true): ' || (public.my_friend_invite(true) <> code) from t_code;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}';
delete from public.blocks;
do $$ begin
  perform public.accept_friend_invite((select code from t_code));
  insert into t_log(msg) values ('FAIL: old code still works');
exception when others then insert into t_log(msg) values ('ok old code gone: ' || sqlerrm);
end $$;

reset role;
select msg from t_log order by step;
rollback;
