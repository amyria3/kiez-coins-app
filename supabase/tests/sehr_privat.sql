-- Prüft „Sehr privat“ (Migration 20261116000200_sehr_privat, Daria, 2026-11-15): keine öffentliche Seite, Fotos nur
-- im privaten Speicher, nur die Ersteller:in schaltet um. Jede Prüfung bricht mit „FAIL: …“ ab.
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen mit supabase/tests/lokal/pruefen.sh
-- oder im SQL-Editor.
begin;

insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-e000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa@test.local'),
 ('00000000-0000-4000-e000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sc@test.local');
update public.profiles set handle = 'Sehr A', kiez = 'Leipzig' where id = '00000000-0000-4000-e000-00000000000a';
update public.profiles set handle = 'Sehr C', kiez = 'Leipzig' where id = '00000000-0000-4000-e000-00000000000c';
insert into public.challenges (id, author_id, type, title, location, deadline, status, image_path, extra_image_paths) values
 ('77777777-7777-4777-a777-777777777771','00000000-0000-4000-e000-00000000000a','photo','Kiez','Hof', now() + interval '3 days','open',
  '00000000-0000-4000-e000-00000000000a/1-kiez.jpg', '{00000000-0000-4000-e000-00000000000a/2-extra.jpg}');

set local role authenticated;

-- C darf den Post von A nicht umschalten und keine Fotos umbenennen
set local request.jwt.claims = '{"sub":"00000000-0000-4000-e000-00000000000c","role":"authenticated"}';
do $$ begin
  perform public.set_challenge_very_private('77777777-7777-4777-a777-777777777771', true);
  raise exception 'FAIL: Fremde schalten „Sehr privat“';
exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;

set local request.jwt.claims = '{"sub":"00000000-0000-4000-e000-00000000000a","role":"authenticated"}';
-- Aus: teilbar
select public.share_challenge('77777777-7777-4777-a777-777777777771');
-- An: nicht mehr teilbar, keine öffentliche Seite
select public.set_challenge_very_private('77777777-7777-4777-a777-777777777771', true);
do $$ begin
  perform public.share_challenge('77777777-7777-4777-a777-777777777771');
  raise exception 'FAIL: Sehr privater Post lässt sich teilen';
exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
do $$ begin
  if public.shared_post('77777777-7777-4777-a777-777777777771', false) is not null then
    raise exception 'FAIL: Öffentliche Seite eines sehr privaten Posts lädt';
  end if;
end $$;
-- Neue Namen müssen privat sein
do $$ begin
  perform public.rename_challenge_photos('77777777-7777-4777-a777-777777777771',
    array['00000000-0000-4000-e000-00000000000a/1-kiez.jpg'], array['00000000-0000-4000-e000-00000000000a/3-offen.jpg']);
  raise exception 'FAIL: Öffentlicher Name für sehr privaten Post erlaubt';
exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
do $$ begin
  perform public.rename_challenge_photos('77777777-7777-4777-a777-777777777771',
    array['00000000-0000-4000-e000-00000000000a/1-kiez.jpg'], array['00000000-0000-4000-e000-00000000000c/p_3.jpg']);
  raise exception 'FAIL: Name in fremdem Ordner erlaubt';
exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
select public.rename_challenge_photos('77777777-7777-4777-a777-777777777771',
  array['00000000-0000-4000-e000-00000000000a/1-kiez.jpg', '00000000-0000-4000-e000-00000000000a/2-extra.jpg'],
  array['00000000-0000-4000-e000-00000000000a/p_3-neu.jpg', '00000000-0000-4000-e000-00000000000a/p_4-neu.jpg']);
do $$ begin
  if (select image_path from public.challenges where id = '77777777-7777-4777-a777-777777777771') <> '00000000-0000-4000-e000-00000000000a/p_3-neu.jpg'
     or (select extra_image_paths from public.challenges where id = '77777777-7777-4777-a777-777777777771') <> '{00000000-0000-4000-e000-00000000000a/p_4-neu.jpg}' then
    raise exception 'FAIL: Fotos nicht umbenannt';
  end if;
end $$;
-- Wieder aus: sync nimmt das p_ weg, teilen geht wieder
select public.set_challenge_very_private('77777777-7777-4777-a777-777777777771', false);
select public.sync_challenge_photo_names('77777777-7777-4777-a777-777777777771');
do $$ begin
  if (select image_path from public.challenges where id = '77777777-7777-4777-a777-777777777771') <> '00000000-0000-4000-e000-00000000000a/3-neu.jpg' then
    raise exception 'FAIL: Fotos nach dem Ausschalten nicht öffentlich benannt';
  end if;
end $$;
select public.share_challenge('77777777-7777-4777-a777-777777777771');

select 'sehr_privat: alles in Ordnung' as ergebnis;
rollback;
