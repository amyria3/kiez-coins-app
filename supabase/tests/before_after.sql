-- Prüft Vorher-Nachher (Migration 20261023000300_before_after).
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen im SQL-Editor oder mit `psql -f`.
-- Jede Zeile im Ergebnis beginnt mit „ok“; „FAIL“ heißt, eine Regel greift nicht.
begin;
create temp table t_log(step int generated always as identity, msg text) on commit drop;
grant all on t_log to authenticated;
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-a000-0000000000ba','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ba@test.local'),
 ('00000000-0000-4000-a000-0000000000bb','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bb@test.local');
update public.profiles set handle = 'Test BA', kiez = 'Plagwitz, Leipzig' where id = '00000000-0000-4000-a000-0000000000ba';
update public.profiles set handle = 'Test BB', kiez = 'Lindenau, Leipzig' where id = '00000000-0000-4000-a000-0000000000bb';
insert into public.profile_settings (user_id) values ('00000000-0000-4000-a000-0000000000ba'), ('00000000-0000-4000-a000-0000000000bb') on conflict do nothing;
insert into public.groups (id, name, founder_id, invite_code) values ('00000000-0000-4000-a000-0000000000b9', 'Test-WG', '00000000-0000-4000-a000-0000000000ba', 'TESTBA');
insert into public.group_members (group_id, user_id, role) values ('00000000-0000-4000-a000-0000000000b9', '00000000-0000-4000-a000-0000000000ba', 'founder');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000ba","role":"authenticated"}';
do $$
declare
  v_pub uuid; v_grp uuid; r public.challenges;
begin
  -- Öffentlich: Vorher, Timer, Nachher, Posten
  v_pub := public.start_before_after(null, 'Hochbeet aus Paletten', 'Nur Rasen.', '00000000-0000-4000-a000-0000000000ba/v.jpg');
  perform public.start_before_after_timer(v_pub);
  perform public.update_before_after(v_pub, p_after_text => 'Zwei Beete.', p_image_after_path => '00000000-0000-4000-a000-0000000000ba/n.jpg');
  perform public.finish_before_after(v_pub);
  select * into r from public.challenges where id = v_pub;
  insert into t_log(msg) values (case when r.status = 'open' and r.body = E'#vorher Nur Rasen.\n#nachher Zwei Beete.' and r.image_path like '%/n.jpg' and r.location = 'Plagwitz, Leipzig' then 'ok Posten öffentlich' else 'FAIL Posten öffentlich: ' || r.status || ' / ' || r.body end);

  -- Fremder Fotopfad
  begin
    perform public.start_before_after(null, 'x', null, '00000000-0000-4000-a000-0000000000bb/v.jpg');
    insert into t_log(msg) values ('FAIL fremder Pfad angenommen');
  exception when others then insert into t_log(msg) values ('ok fremder Pfad abgelehnt');
  end;

  -- Gruppe, Timer gestartet, kein Nachher
  v_grp := public.start_before_after('00000000-0000-4000-a000-0000000000b9', '', 'Fahrrad kaputt', '00000000-0000-4000-a000-0000000000ba/f.jpg');
  perform public.start_before_after_timer(v_grp);
  perform set_config('t.grp', v_grp::text, true);
end $$;

-- 48 h vergehen lassen und den Cron-Lauf nachstellen
reset role;
update public.challenges set timer_started_at = now() - interval '49 hours' where id = current_setting('t.grp')::uuid;
insert into t_log(msg) select case when public.publish_due_before_after() >= 1 then 'ok nach 48 h gepostet' else 'FAIL nach 48 h nicht gepostet' end;
insert into t_log(msg)
  select case when status = 'open' and title = 'Vorher-Nachher' and body = '#vorher Fahrrad kaputt' and finished_at - timer_started_at = interval '48 hours'
              then 'ok Gruppe ohne Nachher, Dauer höchstens 48 h' else 'FAIL Gruppe: ' || status || ' / ' || body end
    from public.challenges where id = current_setting('t.grp')::uuid;

-- Andere Person: Annehmen gesperrt, Cron-Funktion gesperrt
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000bb","role":"authenticated"}';
do $$
begin
  begin
    perform public.accept_challenge((select id from public.challenges where title = 'Hochbeet aus Paletten' and author_id = '00000000-0000-4000-a000-0000000000ba'));
    insert into t_log(msg) values ('FAIL Vorher-Nachher angenommen');
  exception when others then insert into t_log(msg) values ('ok Annehmen abgelehnt');
  end;
  begin
    perform public.publish_due_before_after();
    insert into t_log(msg) values ('FAIL Cron-Funktion für alle aufrufbar');
  exception when others then insert into t_log(msg) values ('ok Cron-Funktion gesperrt');
  end;
end $$;

reset role;
select step, msg from t_log order by step;
rollback;
