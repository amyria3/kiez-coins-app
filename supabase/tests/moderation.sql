-- Prüft Blockieren, Melden, Lob und Moderation (Migration 20261021000700).
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen im SQL-Editor oder mit `psql -f`.
-- Jede Zeile im Ergebnis beginnt mit „ok“ oder zeigt den erwarteten Wert; „FAIL“ heißt, eine Regel greift nicht.
begin;
create temp table t_log(step int generated always as identity, msg text) on commit drop;
grant all on t_log to authenticated;
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-a000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.local'),
 ('00000000-0000-4000-a000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.local'),
 ('00000000-0000-4000-a000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.local');
update public.profiles set handle = 'Test A', kiez = 'Schönefeld, Leipzig' where id = '00000000-0000-4000-a000-00000000000a';
update public.profiles set handle = 'Test B', kiez = 'Schönefeld, Leipzig' where id = '00000000-0000-4000-a000-00000000000b';
update public.profiles set handle = 'Test C', kiez = 'Schönefeld, Leipzig' where id = '00000000-0000-4000-a000-00000000000c';
insert into public.moderators (user_id) values ('00000000-0000-4000-a000-00000000000c');

set local role authenticated;
-- A erstellt zwei Challenges und blockiert B
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into public.challenges (id, author_id, title, location, deadline, image_path) values
 ('11111111-1111-4111-a111-111111111111','00000000-0000-4000-a000-00000000000a','Igelnest','Hof', now() + interval '3 days','00000000-0000-4000-a000-00000000000a/x.jpg'),
 ('22222222-2222-4222-a222-222222222222','00000000-0000-4000-a000-00000000000a','Laub','Hof', now() + interval '3 days','00000000-0000-4000-a000-00000000000a/y.jpg');
insert into public.blocks (blocked_id) values ('00000000-0000-4000-a000-00000000000b');
insert into t_log(msg) select 'A sees own blocks (1): ' || count(*) from public.blocks;
insert into t_log(msg) select 'A is moderator (false): ' || public.is_moderator();
do $$ begin
  insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-4000-a000-00000000000b','00000000-0000-4000-a000-00000000000c');
  insert into t_log(msg) values ('FAIL: block in name of others');
exception when others then insert into t_log(msg) values ('ok block for others refused: ' || sqlstate);
end $$;
do $$ begin
  insert into public.challenge_reports (challenge_id, reason) values ('11111111-1111-4111-a111-111111111111','spam');
  insert into t_log(msg) values ('FAIL: own challenge reported');
exception when others then insert into t_log(msg) values ('ok own challenge not reportable: ' || sqlstate);
end $$;

-- B sieht die Blockierung nicht, kann nicht kommentieren, nicht annehmen, nicht loben
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';
insert into t_log(msg) select 'B sees blocks (0): ' || count(*) from public.blocks;
do $$ begin
  insert into public.comments (challenge_id, body) values ('11111111-1111-4111-a111-111111111111','Hallo?');
  insert into t_log(msg) values ('FAIL: blocked B commented');
exception when others then insert into t_log(msg) values ('ok blocked B cannot comment: ' || sqlerrm);
end $$;
do $$ begin
  perform public.accept_challenge('11111111-1111-4111-a111-111111111111');
  insert into t_log(msg) values ('FAIL: blocked B accepted');
exception when others then insert into t_log(msg) values ('ok blocked B cannot accept: ' || sqlerrm);
end $$;
do $$ begin
  insert into public.praises (receiver_id) values ('00000000-0000-4000-a000-00000000000a');
  insert into t_log(msg) values ('FAIL: blocked B praised');
exception when others then insert into t_log(msg) values ('ok blocked B cannot praise: ' || sqlstate);
end $$;
-- B meldet A und die Challenge
insert into public.user_reports (reported_id, challenge_id, reason, description) values
 ('00000000-0000-4000-a000-00000000000a','11111111-1111-4111-a111-111111111111','harassment','Test');
insert into public.challenge_reports (challenge_id, reason) values ('11111111-1111-4111-a111-111111111111','discrimination');
do $$ begin
  update public.user_reports set status = 'dismissed' where true;
  if found then insert into t_log(msg) values ('FAIL: reporter changed status');
  else insert into t_log(msg) values ('ok reporter cannot change status (no rows)'); end if;
exception when others then insert into t_log(msg) values ('ok reporter cannot change status: ' || sqlstate);
end $$;

-- C lobt A, kommentiert und nimmt an (keine Blockierung)
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}';
insert into public.praises (receiver_id) values ('00000000-0000-4000-a000-00000000000a');
insert into t_log(msg) select 'praise_count A (1): ' || public.praise_count('00000000-0000-4000-a000-00000000000a');
insert into public.comments (challenge_id, body) values ('22222222-2222-4222-a222-222222222222','Mach ich');
select public.accept_challenge('22222222-2222-4222-a222-222222222222');
insert into t_log(msg) select 'C accepted (accepted): ' || status from public.challenges where id = '22222222-2222-4222-a222-222222222222';
-- C ist Moderatorin: sieht alle Meldungen und setzt den Status
insert into t_log(msg) select 'moderator sees user_reports (1): ' || count(*) from public.user_reports;
insert into t_log(msg) select 'moderator sees challenge_reports (1): ' || count(*) from public.challenge_reports;
update public.user_reports set status = 'confirmed', handled_at = now() where true;
insert into t_log(msg) select 'status after moderation (confirmed): ' || status from public.user_reports;
do $$ begin
  update public.user_reports set reason = 'spam' where true;
  insert into t_log(msg) values ('FAIL: moderator changed reason');
exception when others then insert into t_log(msg) values ('ok reason stays fixed: ' || sqlstate);
end $$;

-- A sieht keine fremden Meldungen und nicht, wer gelobt hat
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into t_log(msg) select 'A sees reports about A (0): ' || count(*) from public.user_reports;
insert into t_log(msg) select 'A sees praise rows (0): ' || count(*) from public.praises;
delete from public.blocks where blocked_id = '00000000-0000-4000-a000-00000000000b';
insert into t_log(msg) select 'A blocks after unblock (0): ' || count(*) from public.blocks;
reset role;
select step, msg from t_log order by step;
rollback;
