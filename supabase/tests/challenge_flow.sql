-- Prüft Zugriffsregeln und Statuswechsel einmal komplett durch (Bounty-Challenge).
-- Läuft in einer Transaktion und wird am Ende zurückgerollt, hinterlässt also nichts.
-- Ausführen im SQL-Editor von Supabase oder mit `psql -f`. Jede Zeile im Ergebnis sollte mit „ok“
-- beginnen oder den erwarteten Wert zeigen; „FAIL“ heißt, eine Regel greift nicht.
begin;
create temp table t_log(step int generated always as identity, msg text) on commit drop;
grant all on t_log to authenticated;
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-a000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.local'),
 ('00000000-0000-4000-a000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.local'),
 ('00000000-0000-4000-a000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.local');
update public.profiles set handle = 'Test A', kiez = 'Schönefeld, Leipzig' where id = '00000000-0000-4000-a000-00000000000a';
update public.profiles set handle = 'Test B', kiez = 'Schönefeld, Leipzig' where id = '00000000-0000-4000-a000-00000000000b';
update public.profiles set handle = 'Test C' where id = '00000000-0000-4000-a000-00000000000c';

set local role authenticated;
-- A erstellt eine Challenge mit Bounty
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into public.challenges (id, author_id, title, location, bounty_amount, deadline, image_path)
values ('11111111-1111-4111-a111-111111111111','00000000-0000-4000-a000-00000000000a','Igelnest','Hof',15, now() + interval '3 days','00000000-0000-4000-a000-00000000000a/x.jpg');
insert into t_log(msg) select 'created kiez=' || kiez || ' status=' || status from public.challenges;
do $$ begin
  update public.challenges set status = 'paid' where true;
  insert into t_log(msg) values ('FAIL: direct update allowed');
exception when others then insert into t_log(msg) values ('ok direct update blocked: ' || sqlstate);
end $$;
do $$ begin
  perform public.accept_challenge('11111111-1111-4111-a111-111111111111');
  insert into t_log(msg) values ('FAIL: author accepted own');
exception when others then insert into t_log(msg) values ('ok author cannot accept: ' || sqlerrm);
end $$;

-- C hat keinen Kiez und darf nicht annehmen
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}';
do $$ begin
  perform public.accept_challenge('11111111-1111-4111-a111-111111111111');
  insert into t_log(msg) values ('FAIL: C without kiez accepted');
exception when others then insert into t_log(msg) values ('ok C without kiez blocked: ' || sqlerrm);
end $$;

-- B nimmt an, tauft, kommentiert, gibt Zahlungsdaten frei und meldet erledigt
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';
select public.accept_challenge('11111111-1111-4111-a111-111111111111');
insert into public.operation_names (challenge_id, user_id, name) values ('11111111-1111-4111-a111-111111111111','00000000-0000-4000-a000-00000000000b','Operation Igelglück');
insert into public.comments (challenge_id, body) values ('11111111-1111-4111-a111-111111111111','Handschuhe da?');
insert into public.payout_shares (challenge_id, method, account_holder, iban) values ('11111111-1111-4111-a111-111111111111','iban','B','DE38430609671234564821');
select public.report_challenge('11111111-1111-4111-a111-111111111111','00000000-0000-4000-a000-00000000000b/after.jpg','fertig');
insert into t_log(msg) select 'B sees share (1): ' || count(*) from public.payout_shares;

-- A sieht die Freigabe erst nach der Bestätigung, den Operationsnamen nie
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into t_log(msg) select 'A sees share before confirm (0): ' || count(*) from public.payout_shares;
insert into t_log(msg) select 'A sees op names (0): ' || count(*) from public.operation_names;
select public.confirm_challenge('11111111-1111-4111-a111-111111111111');
insert into t_log(msg) select 'after confirm status (payment_open)=' || status from public.challenges;
insert into t_log(msg) select 'A sees share after confirm (1): ' || count(*) from public.payout_shares;
select public.mark_challenge_paid('11111111-1111-4111-a111-111111111111');

-- C sieht keine Freigabe, aber die öffentlichen Kommentare
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}';
insert into t_log(msg) select 'C sees share (0): ' || count(*) from public.payout_shares;
insert into t_log(msg) select 'C sees comments (1): ' || count(*) from public.comments;

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';
select public.confirm_bounty_received('11111111-1111-4111-a111-111111111111');
insert into t_log(msg) select 'final status (paid)=' || status from public.challenges;
do $$ begin
  update public.profiles set can_offer_bounties = true where id = '00000000-0000-4000-a000-00000000000b';
  insert into t_log(msg) values ('FAIL: can_offer_bounties writable');
exception when others then insert into t_log(msg) values ('ok can_offer_bounties protected: ' || sqlstate);
end $$;
do $$ begin
  update public.profiles set handle = 'test a' where id = '00000000-0000-4000-a000-00000000000b';
  insert into t_log(msg) values ('FAIL: duplicate handle allowed');
exception when others then insert into t_log(msg) values ('ok duplicate handle blocked: ' || sqlstate);
end $$;
reset role;
select step, msg from t_log order by step;
rollback;
