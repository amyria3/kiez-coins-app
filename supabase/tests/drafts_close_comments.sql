-- Prüft Entwürfe, Bearbeiten, Schließen und Kommentare (Migrationen 20261020000100 und 20261020000200).
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Jede Zeile sollte mit „ok“ beginnen
-- oder den erwarteten Wert in Klammern zeigen; „FAIL“ heißt, eine Regel greift nicht.
begin;
create temp table t_log(step int generated always as identity, msg text) on commit drop;
grant all on t_log to authenticated;
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-a000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.local'),
 ('00000000-0000-4000-a000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.local');
update public.profiles set handle = 'Test A', kiez = 'Schönefeld, Leipzig' where id = '00000000-0000-4000-a000-00000000000a';
update public.profiles set handle = 'Test B', kiez = 'Schönefeld, Leipzig' where id = '00000000-0000-4000-a000-00000000000b';

set local role authenticated;

-- A legt einen fast leeren Entwurf an und füllt ihn später
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into public.challenges (id, author_id, status, title) values
 ('22222222-2222-4222-a222-222222222222','00000000-0000-4000-a000-00000000000a','draft','Halbfertig');
do $$ begin
  perform public.publish_challenge('22222222-2222-4222-a222-222222222222', now() + interval '3 days');
  insert into t_log(msg) values ('FAIL: draft without location published');
exception when others then insert into t_log(msg) values ('ok incomplete draft not published: ' || sqlerrm);
end $$;
update public.challenges set location = 'Hof', bounty_amount = 15, image_path = '00000000-0000-4000-a000-00000000000a/d.jpg'
 where id = '22222222-2222-4222-a222-222222222222';
do $$ begin
  update public.challenges set image_path = '00000000-0000-4000-a000-00000000000b/x.jpg'
   where id = '22222222-2222-4222-a222-222222222222';
  insert into t_log(msg) values ('FAIL: foreign photo path allowed');
exception when others then insert into t_log(msg) values ('ok foreign photo path blocked: ' || sqlstate);
end $$;
do $$ begin
  update public.challenges set status = 'open' where id = '22222222-2222-4222-a222-222222222222';
  insert into t_log(msg) values ('FAIL: status writable');
exception when others then insert into t_log(msg) values ('ok status not writable: ' || sqlstate);
end $$;

-- B sieht den Entwurf nicht, kann ihn nicht annehmen und nicht kommentieren
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';
insert into t_log(msg) select 'B sees draft (0): ' || count(*) from public.challenges where id = '22222222-2222-4222-a222-222222222222';
do $$ begin
  perform public.accept_challenge('22222222-2222-4222-a222-222222222222');
  insert into t_log(msg) values ('FAIL: draft accepted');
exception when others then insert into t_log(msg) values ('ok draft not acceptable: ' || sqlerrm);
end $$;
do $$ begin
  insert into public.comments (challenge_id, body) values ('22222222-2222-4222-a222-222222222222', 'Hallo?');
  insert into t_log(msg) values ('FAIL: comment on draft');
exception when others then insert into t_log(msg) values ('ok no comment on draft: ' || sqlstate);
end $$;

-- A veröffentlicht, bearbeitet und schließt
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
select public.publish_challenge('22222222-2222-4222-a222-222222222222', now() + interval '3 days');
insert into t_log(msg) select 'after publish (open): ' || status from public.challenges where id = '22222222-2222-4222-a222-222222222222';
do $$ begin
  update public.challenges set title = 'Heimlich' where id = '22222222-2222-4222-a222-222222222222';
  if found then insert into t_log(msg) values ('FAIL: open challenge updated directly');
  else insert into t_log(msg) values ('ok open challenge not directly writable'); end if;
end $$;
select public.edit_open_challenge('22222222-2222-4222-a222-222222222222', 'Igelnest bauen', 'Mit Laub', 'Hof 2', 20, now() + interval '5 days');
insert into t_log(msg) select 'edited title (Igelnest bauen): ' || title from public.challenges where id = '22222222-2222-4222-a222-222222222222';
do $$ begin
  delete from public.challenges where id = '22222222-2222-4222-a222-222222222222';
  if found then insert into t_log(msg) values ('FAIL: open challenge deleted');
  else insert into t_log(msg) values ('ok open challenge not deletable'); end if;
end $$;

-- B kommentiert die offene Challenge
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';
insert into public.comments (challenge_id, body) values ('22222222-2222-4222-a222-222222222222', 'Wie groß soll das Nest sein?');
insert into t_log(msg) select 'B sees comments (1): ' || count(*) from public.comments where challenge_id = '22222222-2222-4222-a222-222222222222';
do $$ begin
  perform public.close_challenge('22222222-2222-4222-a222-222222222222');
  insert into t_log(msg) values ('FAIL: B closed foreign challenge');
exception when others then insert into t_log(msg) values ('ok B cannot close: ' || sqlerrm);
end $$;

-- A antwortet und schließt
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
insert into public.comments (challenge_id, body) values ('22222222-2222-4222-a222-222222222222', 'Schuhkarton reicht.');
select public.close_challenge('22222222-2222-4222-a222-222222222222');

-- B sieht die geschlossene Challenge weiter, kann sie aber nicht annehmen oder kommentieren
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';
insert into t_log(msg) select 'B sees closed (closed): ' || status from public.challenges where id = '22222222-2222-4222-a222-222222222222';
do $$ begin
  perform public.accept_challenge('22222222-2222-4222-a222-222222222222');
  insert into t_log(msg) values ('FAIL: closed accepted');
exception when others then insert into t_log(msg) values ('ok closed not acceptable: ' || sqlerrm);
end $$;
do $$ begin
  insert into public.comments (challenge_id, body) values ('22222222-2222-4222-a222-222222222222', 'Schade');
  insert into t_log(msg) values ('FAIL: comment on closed');
exception when others then insert into t_log(msg) values ('ok no comment on closed: ' || sqlstate);
end $$;

-- A kann die geschlossene Challenge nicht mehr bearbeiten; ein zweiter Entwurf lässt sich löschen
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';
do $$ begin
  perform public.edit_open_challenge('22222222-2222-4222-a222-222222222222', 'X', '', 'Hof', null, now() + interval '1 day');
  insert into t_log(msg) values ('FAIL: closed edited');
exception when others then insert into t_log(msg) values ('ok closed not editable: ' || sqlerrm);
end $$;
insert into public.challenges (id, author_id, status) values
 ('33333333-3333-4333-a333-333333333333','00000000-0000-4000-a000-00000000000a','draft');
delete from public.challenges where id = '33333333-3333-4333-a333-333333333333';
insert into t_log(msg) select 'draft deleted (0): ' || count(*) from public.challenges where id = '33333333-3333-4333-a333-333333333333';

reset role;
select step, msg from t_log order by step;
rollback;
