-- Prüft Fehlerberichte (Migration 20261025000200).
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen im SQL-Editor oder mit `psql -f`.
-- Jede Zeile im Ergebnis beginnt mit „ok“ oder zeigt den erwarteten Wert; „FAIL“ heißt, eine Regel greift nicht.
begin;
create temp table t_log(step int generated always as identity, msg text) on commit drop;
grant all on t_log to anon, authenticated;
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-a000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.local'),
 ('00000000-0000-4000-a000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.local');
insert into public.moderators (user_id) values ('00000000-0000-4000-a000-00000000000c');

-- Ohne Anmeldung: senden geht, lesen nicht
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into public.error_reports (message, stack, screen, platform) values ('Absturz vor dem Login', 'at Foo', '/onboarding', 'web');
insert into t_log(msg) values ('ok anon sends report');
do $$ begin
  perform 1 from public.error_reports;
  insert into t_log(msg) values ('FAIL: anon reads reports');
exception when others then insert into t_log(msg) values ('ok anon read refused: ' || sqlstate);
end $$;
do $$ begin
  insert into public.error_reports (message, status) values ('x', 'done');
  insert into t_log(msg) values ('FAIL: anon sets status');
exception when others then insert into t_log(msg) values ('ok anon status refused: ' || sqlstate);
end $$;

-- A angemeldet: Bericht trägt A, A sieht keine Berichte, fremde user_id geht nicht
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into public.error_reports (message, comment) values ('Absturz im Feed', 'Habe gescrollt');
insert into t_log(msg) select 'A sees reports (0): ' || count(*) from public.error_reports;
do $$ begin
  insert into public.error_reports (message, user_id) values ('x', '00000000-0000-4000-a000-00000000000c');
  insert into t_log(msg) values ('FAIL: report in name of others');
exception when others then insert into t_log(msg) values ('ok report for others refused: ' || sqlstate);
end $$;
do $$ begin
  insert into public.error_reports (message) values ('');
  insert into t_log(msg) values ('FAIL: empty message');
exception when others then insert into t_log(msg) values ('ok empty message refused: ' || sqlstate);
end $$;

-- C ist Moderator:in: liest beide, setzt Status
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}';
insert into t_log(msg) select 'C sees reports (2): ' || count(*) from public.error_reports;
insert into t_log(msg) select 'C sees A as author (1): ' || count(*) from public.error_reports where user_id = '00000000-0000-4000-a000-00000000000a';
update public.error_reports set status = 'done' where message = 'Absturz im Feed';
insert into t_log(msg) select 'C marks done (1): ' || count(*) from public.error_reports where status = 'done';

reset role;
select msg from t_log order by step;
rollback;
