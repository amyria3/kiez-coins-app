-- Prüft finanzierung_ist, finanzierung_link und finanzierung_mein_punkt (Migrationen 20261108000100 und 20261108000200).
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen im SQL-Editor oder mit `psql -f`.
-- Jede Zeile im Ergebnis beginnt mit „ok“; „FAIL“ heißt, eine Regel greift nicht.
begin;
create temp table t_log(step int generated always as identity, msg text) on commit drop;
grant all on t_log to anon, authenticated;
create temp table t_code(code text) on commit drop;
grant all on t_code to anon, authenticated;
-- a: aktiv (Like), b: inaktiv, c: Testkonto, d: inaktiv, später angemeldet als b
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-a000-0000000000f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f1@test.local'),
 ('00000000-0000-4000-a000-0000000000f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f2@test.local'),
 ('00000000-0000-4000-a000-0000000000f3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f3@test.local'),
 ('00000000-0000-4000-a000-0000000000f4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f4@test.local');
update public.profiles set created_at = now() - interval '3 days' where id = '00000000-0000-4000-a000-0000000000f2';
update public.profiles set created_at = now() - interval '1 day' where id = '00000000-0000-4000-a000-0000000000f4';
update public.profiles set is_test = true where id = '00000000-0000-4000-a000-0000000000f3';
update auth.users set last_sign_in_at = now() - interval '2 days' where id = '00000000-0000-4000-a000-0000000000f1';
update auth.users set last_sign_in_at = now() - interval '90 days' where id in ('00000000-0000-4000-a000-0000000000f2', '00000000-0000-4000-a000-0000000000f4');

-- Ohne Anmeldung: Zahlen ja, Link nein
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ declare j json; begin
  j := public.finanzierung_ist();
  if (j->>'registriert')::int >= 3 and (j->>'aktiv')::int >= 1 then insert into t_log(msg) values ('ok anon reads counts');
  else insert into t_log(msg) values ('FAIL: counts ' || j::text); end if;
end $$;
do $$ begin
  perform public.finanzierung_link();
  insert into t_log(msg) values ('FAIL: anon gets link');
exception when others then insert into t_log(msg) values ('ok anon link refused: ' || sqlstate);
end $$;
do $$ begin
  perform 1 from public.finanzierung_links;
  insert into t_log(msg) values ('FAIL: anon reads codes');
exception when others then insert into t_log(msg) values ('ok anon code table refused: ' || sqlstate);
end $$;

-- b holt einen Code
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000f2","role":"authenticated"}';
insert into t_code select public.finanzierung_link();
do $$ begin
  perform 1 from public.finanzierung_links;
  if found then insert into t_log(msg) values ('FAIL: authenticated reads codes');
  else insert into t_log(msg) values ('ok code table hidden'); end if;
exception when others then insert into t_log(msg) values ('ok code table refused: ' || sqlstate);
end $$;

-- Die Seite löst den Code ohne Anmeldung ein: b ist inaktiv, Rang 0 (vor d angemeldet)
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ declare j json; begin
  j := public.finanzierung_mein_punkt((select code from t_code));
  if j->>'kategorie' = 'inaktiv' and (j->>'rang')::int = 0 then insert into t_log(msg) values ('ok own dot: inaktiv, rang 0');
  else insert into t_log(msg) values ('FAIL: own dot ' || coalesce(j::text, 'null')); end if;
end $$;
-- Zweites Einlösen geht nicht
do $$ begin
  if public.finanzierung_mein_punkt((select code from t_code)) is null then insert into t_log(msg) values ('ok code works once');
  else insert into t_log(msg) values ('FAIL: code reused'); end if;
end $$;
-- Falscher Code liefert nichts
do $$ begin
  if public.finanzierung_mein_punkt('falsch') is null then insert into t_log(msg) values ('ok wrong code');
  else insert into t_log(msg) values ('FAIL: wrong code accepted'); end if;
end $$;

-- d: inaktiv, Rang 1; abgelaufener Code liefert nichts
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000f4","role":"authenticated"}';
delete from t_code;
insert into t_code select public.finanzierung_link();
reset role;
update public.finanzierung_links set created_at = now() - interval '11 minutes';
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if public.finanzierung_mein_punkt((select code from t_code)) is null then insert into t_log(msg) values ('ok expired code');
  else insert into t_log(msg) values ('FAIL: expired code accepted'); end if;
end $$;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000f4","role":"authenticated"}';
delete from t_code;
insert into t_code select public.finanzierung_link();
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ declare j json; begin
  j := public.finanzierung_mein_punkt((select code from t_code));
  if j->>'kategorie' = 'inaktiv' and (j->>'rang')::int = 1 then insert into t_log(msg) values ('ok second inactive: rang 1');
  else insert into t_log(msg) values ('FAIL: second inactive ' || coalesce(j::text, 'null')); end if;
end $$;

-- a ist aktiv; Testkonto c hat keinen Punkt
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000f1","role":"authenticated"}';
delete from t_code;
insert into t_code select public.finanzierung_link();
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ declare j json; begin
  j := public.finanzierung_mein_punkt((select code from t_code));
  if j->>'kategorie' = 'aktiv' then insert into t_log(msg) values ('ok active dot');
  else insert into t_log(msg) values ('FAIL: active dot ' || coalesce(j::text, 'null')); end if;
end $$;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000f3","role":"authenticated"}';
delete from t_code;
insert into t_code select public.finanzierung_link();
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ declare j json; begin
  j := public.finanzierung_mein_punkt((select code from t_code));
  if j is not null and j->>'kategorie' is null then insert into t_log(msg) values ('ok test account has no dot');
  else insert into t_log(msg) values ('FAIL: test account ' || coalesce(j::text, 'null')); end if;
end $$;

reset role;
select msg from t_log order by step;
rollback;
