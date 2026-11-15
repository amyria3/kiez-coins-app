-- Prüft den privaten Fotospeicher (Migration 20261116000100_private_fotos, Daria, 2026-11-15):
-- Fotos aus privaten Posts und Gruppen bekommt nur, wer den Post sehen darf, und die Ersteller:in kann die
-- Dateinamen nach einem Wechsel der Sichtbarkeit anpassen. Jede Prüfung bricht mit „FAIL: …“ ab.
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen mit supabase/tests/lokal/pruefen.sh
-- oder im SQL-Editor.
begin;

insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-f000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fa@test.local'),
 ('00000000-0000-4000-f000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fb@test.local'),
 ('00000000-0000-4000-f000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fc@test.local');
update public.profiles set handle = 'Foto A', kiez = 'Leipzig' where id = '00000000-0000-4000-f000-00000000000a';
update public.profiles set handle = 'Foto B', kiez = 'Leipzig' where id = '00000000-0000-4000-f000-00000000000b';
update public.profiles set handle = 'Foto C', kiez = 'Leipzig' where id = '00000000-0000-4000-f000-00000000000c';

insert into public.groups (id, name, founder_id, invite_code) values
 ('55555555-5555-4555-a555-555555555555','Garten','00000000-0000-4000-f000-00000000000a','FOTOSX');
insert into public.group_members (group_id, user_id, role) values
 ('55555555-5555-4555-a555-555555555555','00000000-0000-4000-f000-00000000000a','founder'),
 ('55555555-5555-4555-a555-555555555555','00000000-0000-4000-f000-00000000000b','member')
on conflict do nothing;
insert into public.challenges (id, author_id, type, title, location, deadline, visibility, group_id, image_path, extra_image_paths) values
 ('66666666-6666-4666-a666-666666666661','00000000-0000-4000-f000-00000000000a','photo','Privat','Hof', now() + interval '3 days','private', null,
  '00000000-0000-4000-f000-00000000000a/p_1-privat.jpg', '{00000000-0000-4000-f000-00000000000a/p_2-extra.jpg}'),
 ('66666666-6666-4666-a666-666666666662','00000000-0000-4000-f000-00000000000a','photo','Gruppe','Hof', now() + interval '3 days','public', '55555555-5555-4555-a555-555555555555',
  '00000000-0000-4000-f000-00000000000a/p_3-gruppe.jpg', '{}');
insert into storage.objects (bucket_id, name) values
 ('photos-private','00000000-0000-4000-f000-00000000000a/p_1-privat.jpg'),
 ('photos-private','00000000-0000-4000-f000-00000000000a/p_2-extra.jpg'),
 ('photos-private','00000000-0000-4000-f000-00000000000a/p_3-gruppe.jpg'),
 ('photos-private','00000000-0000-4000-f000-00000000000c/p_9-verwaist.jpg');
grant select, insert, delete on storage.objects to authenticated;

do $$ begin
  if not exists (select 1 from storage.buckets where id = 'photos-private' and not public) then
    raise exception 'FAIL: privater Speicher fehlt oder ist öffentlich';
  end if;
end $$;

set local role authenticated;

-- C (fremd): sieht keine privaten Fotos von A, nur den eigenen Ordner
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-00000000000c","role":"authenticated"}';
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'photos-private' and name like '00000000-0000-4000-f000-00000000000a/%') <> 0 then
    raise exception 'FAIL: Fremde lesen private Fotos';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'photos-private') <> 1 then
    raise exception 'FAIL: Eigener Ordner im privaten Speicher nicht lesbar';
  end if;
end $$;
-- Fremde laden nicht in den Ordner anderer hoch, eigene Dateien nur mit p_
do $$ begin
  insert into storage.objects (bucket_id, name) values ('photos-private','00000000-0000-4000-f000-00000000000a/p_x.jpg');
  raise exception 'FAIL: Hochladen in fremden Ordner erlaubt';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('photos-private','00000000-0000-4000-f000-00000000000c/ohne-zeichen.jpg');
  raise exception 'FAIL: Privates Foto ohne p_ erlaubt';
exception when insufficient_privilege then null;
end $$;
-- Fremde können die Fotos von A nicht umbenennen
do $$ begin
  perform public.sync_challenge_photo_names('66666666-6666-4666-a666-666666666661');
  raise exception 'FAIL: Fremde benennen Fotos um';
exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;

-- B (Gruppenmitglied): sieht das Gruppenfoto, aber nicht die privaten Fotos von A
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-00000000000b","role":"authenticated"}';
do $$ begin
  if (select count(*) from storage.objects where name = '00000000-0000-4000-f000-00000000000a/p_3-gruppe.jpg') <> 1 then
    raise exception 'FAIL: Gruppenmitglied sieht Gruppenfoto nicht';
  end if;
  if (select count(*) from storage.objects where name in ('00000000-0000-4000-f000-00000000000a/p_1-privat.jpg','00000000-0000-4000-f000-00000000000a/p_2-extra.jpg')) <> 0 then
    raise exception 'FAIL: Gruppenmitglied sieht private Fotos';
  end if;
end $$;

-- A: sieht alles Eigene. Nach dem Wechsel auf Kiez verlieren die Fotos das p_, Gruppenfotos behalten es.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-00000000000a","role":"authenticated"}';
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'photos-private') <> 3 then
    raise exception 'FAIL: Ersteller:in sieht eigene private Fotos nicht';
  end if;
end $$;
select public.set_challenge_audience('66666666-6666-4666-a666-666666666661', false, false);
select public.sync_challenge_photo_names('66666666-6666-4666-a666-666666666661');
select public.sync_challenge_photo_names('66666666-6666-4666-a666-666666666662');
do $$ begin
  if (select image_path from public.challenges where id = '66666666-6666-4666-a666-666666666661') <> '00000000-0000-4000-f000-00000000000a/1-privat.jpg'
     or (select extra_image_paths from public.challenges where id = '66666666-6666-4666-a666-666666666661') <> '{00000000-0000-4000-f000-00000000000a/2-extra.jpg}' then
    raise exception 'FAIL: Fotos nach dem Wechsel auf Kiez nicht umbenannt';
  end if;
  if (select image_path from public.challenges where id = '66666666-6666-4666-a666-666666666662') <> '00000000-0000-4000-f000-00000000000a/p_3-gruppe.jpg' then
    raise exception 'FAIL: Gruppenfoto verliert p_';
  end if;
end $$;
select public.set_challenge_audience('66666666-6666-4666-a666-666666666661', true, false);
select public.sync_challenge_photo_names('66666666-6666-4666-a666-666666666661');
do $$ begin
  if (select image_path from public.challenges where id = '66666666-6666-4666-a666-666666666661') <> '00000000-0000-4000-f000-00000000000a/p_1-privat.jpg' then
    raise exception 'FAIL: Fotos nach dem Wechsel auf Privat nicht umbenannt';
  end if;
end $$;

select 'fotos_privat: alles in Ordnung' as ergebnis;
rollback;
