-- Prüft „Starten (mit Post)“ (Migration 20261116000600_erinnerung_gestartet, Daria, 2026-11-16): Eine Erinnerung
-- merkt sich nur eigene Posts. Bricht mit „FAIL: …“ ab. Läuft in einer Transaktion und wird zurückgerollt.
begin;

insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-e100-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ea@test.local'),
 ('00000000-0000-4000-e100-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ec@test.local');
update public.profiles set handle = 'Erinner A', kiez = 'Leipzig' where id = '00000000-0000-4000-e100-00000000000a';
update public.profiles set handle = 'Erinner C', kiez = 'Leipzig' where id = '00000000-0000-4000-e100-00000000000c';
insert into public.challenges (id, author_id, type, title, location, deadline, status) values
 ('77777777-7777-4777-a777-7777777777e1','00000000-0000-4000-e100-00000000000a','before_after','Spazieren','Kiez', now() + interval '7 days','open'),
 ('77777777-7777-4777-a777-7777777777e2','00000000-0000-4000-e100-00000000000c','before_after','Fremd','Kiez', now() + interval '7 days','open');
insert into public.reminders (id, user_id, want, per_week) values
 ('88888888-8888-4888-a888-8888888888e1','00000000-0000-4000-e100-00000000000a','spazieren', 6);

-- Wie bei Supabase: Angemeldete dürfen ihre Erinnerungen ändern (der lokale Ersatz gibt sonst kein update)
grant update on public.reminders to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-e100-00000000000a","role":"authenticated"}';

update public.reminders set started_challenge_id = '77777777-7777-4777-a777-7777777777e1' where id = '88888888-8888-4888-a888-8888888888e1';
do $$ begin
  if (select started_challenge_id from public.reminders where id = '88888888-8888-4888-a888-8888888888e1') is distinct from '77777777-7777-4777-a777-7777777777e1' then
    raise exception 'FAIL: Eigene Me-Challenge nicht gemerkt';
  end if;
end $$;
do $$ begin
  update public.reminders set started_challenge_id = '77777777-7777-4777-a777-7777777777e2' where id = '88888888-8888-4888-a888-8888888888e1';
  raise exception 'FAIL: Fremder Post an der Erinnerung';
exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
-- Ohne Verknüpfung geht immer
update public.reminders set started_challenge_id = null where id = '88888888-8888-4888-a888-8888888888e1';

select 'erinnerung_gestartet: alles in Ordnung' as ergebnis;
rollback;
