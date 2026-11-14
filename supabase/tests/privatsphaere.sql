-- Prüft, dass private Daten nur bei den Berechtigten ankommen (Sicherheitsprüfung, Daria, 2026-11-14):
-- private Posts, Gruppen-Posts, Nachrichten, Erinnerungen, verbundene Kalender, Zugänge fürs Weiterposten (Vault)
-- und die Grenze für Konten ohne E-Mail. Jede Prüfung bricht mit „FAIL: …“ ab, wenn eine Regel nicht greift.
-- Läuft in einer Transaktion und wird am Ende zurückgerollt. Ausführen mit supabase/tests/lokal/pruefen.sh
-- oder im SQL-Editor.
begin;

-- Drei Personen: A (Autorin, Gruppe, befreundet mit B), B (Freundin), C (fremd)
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-4000-b000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pa@test.local'),
 ('00000000-0000-4000-b000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pb@test.local'),
 ('00000000-0000-4000-b000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pc@test.local');
update public.profiles set handle = 'Privat A', kiez = 'Leipzig' where id = '00000000-0000-4000-b000-00000000000a';
update public.profiles set handle = 'Privat B', kiez = 'Leipzig' where id = '00000000-0000-4000-b000-00000000000b';
update public.profiles set handle = 'Privat C', kiez = 'Leipzig' where id = '00000000-0000-4000-b000-00000000000c';

-- Testdaten ohne Regeln anlegen (als Datenbank-Eigentümer)
insert into public.groups (id, name, founder_id, invite_code) values
 ('33333333-3333-4333-a333-333333333333','Hof','00000000-0000-4000-b000-00000000000a','PRIVAT');
insert into public.group_members (group_id, user_id, role) values
 ('33333333-3333-4333-a333-333333333333','00000000-0000-4000-b000-00000000000a','founder'),
 ('33333333-3333-4333-a333-333333333333','00000000-0000-4000-b000-00000000000b','member')
on conflict do nothing;
insert into public.challenges (id, author_id, type, title, location, deadline, visibility, group_id) values
 ('44444444-4444-4444-a444-444444444441','00000000-0000-4000-b000-00000000000a','photo','Privat','Hof', now() + interval '3 days','private', null),
 ('44444444-4444-4444-a444-444444444442','00000000-0000-4000-b000-00000000000a','individual','Gruppe','Hof', now() + interval '3 days','public','33333333-3333-4333-a333-333333333333'),
 ('44444444-4444-4444-a444-444444444443','00000000-0000-4000-b000-00000000000a','individual','Kiez','Hof', now() + interval '3 days','public', null);
insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
 ('00000000-0000-4000-b000-00000000000a','00000000-0000-4000-b000-00000000000b','accepted', now());
insert into public.messages (sender_id, recipient_id, body) values
 ('00000000-0000-4000-b000-00000000000a','00000000-0000-4000-b000-00000000000b','Hallo B');
insert into public.reminders (user_id, want, per_week) values ('00000000-0000-4000-b000-00000000000a','joggen gehen', 3);
insert into public.routine_calendars (user_id, name, url) values ('00000000-0000-4000-b000-00000000000a','Privat','https://example.org/geheim.ics');
-- Weiterposten-Zugang über die Funktion, wie die Edge Function
select public.crosspost_save('00000000-0000-4000-b000-00000000000a','mastodon','a@example.social','https://example.social','geheimes-token');

-- Vault: kein Klartext in der Tabelle, Zugang nur über die Funktion lesbar
do $$ begin
  if exists (select 1 from public.crosspost_accounts where secret is not null) then raise exception 'FAIL: Zugang im Klartext gespeichert'; end if;
  if (select secret from public.crosspost_accounts_of('00000000-0000-4000-b000-00000000000a')) <> 'geheimes-token' then
    raise exception 'FAIL: crosspost_accounts_of liefert den Zugang nicht';
  end if;
end $$;

set local role authenticated;

-- C (fremd): sieht den Kiez-Post, aber weder den privaten noch den Gruppen-Post, keine Nachrichten, nichts Privates
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-00000000000c","role":"authenticated"}';
do $$ begin
  if (select count(*) from public.challenges where id in ('44444444-4444-4444-a444-444444444441','44444444-4444-4444-a444-444444444442')) <> 0 then
    raise exception 'FAIL: Fremde sehen private oder Gruppen-Posts';
  end if;
  if (select count(*) from public.challenges where id = '44444444-4444-4444-a444-444444444443') <> 1 then
    raise exception 'FAIL: Fremde sehen den Kiez-Post nicht';
  end if;
  if (select count(*) from public.messages) <> 0 then raise exception 'FAIL: Fremde lesen Nachrichten'; end if;
  if (select count(*) from public.reminders) <> 0 then raise exception 'FAIL: Fremde sehen Erinnerungen'; end if;
  if (select count(*) from public.routine_calendars) <> 0 then raise exception 'FAIL: Fremde sehen Kalender'; end if;
  if (select count(*) from public.crosspost_accounts) <> 0 then raise exception 'FAIL: Fremde sehen verbundene Konten'; end if;
end $$;
-- Fremde dürfen keine Nachricht an Nicht-Freund:innen schicken
do $$ begin
  insert into public.messages (recipient_id, body) values ('00000000-0000-4000-b000-00000000000a', 'Hi');
  raise exception 'FAIL: Nachricht an Nicht-Freundin erlaubt';
exception when insufficient_privilege or check_violation then null;
end $$;

-- B (Freundin, Gruppenmitglied): sieht Gruppen-Post und die Nachricht, aber nicht den privaten Post
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-00000000000b","role":"authenticated"}';
do $$ begin
  if (select count(*) from public.challenges where id = '44444444-4444-4444-a444-444444444441') <> 0 then
    raise exception 'FAIL: Freundin sieht privaten Post';
  end if;
  if (select count(*) from public.challenges where id = '44444444-4444-4444-a444-444444444442') <> 1 then
    raise exception 'FAIL: Gruppenmitglied sieht Gruppen-Post nicht';
  end if;
  if (select count(*) from public.messages) <> 1 then raise exception 'FAIL: Empfängerin liest Nachricht nicht'; end if;
  if (select count(*) from public.reminders) <> 0 then raise exception 'FAIL: Freundin sieht fremde Erinnerungen'; end if;
end $$;

-- A (Autorin): sieht alles Eigene, aber den Zugang fürs Weiterposten nicht
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-00000000000a","role":"authenticated"}';
do $$ begin
  if (select count(*) from public.challenges where id::text like '44444444-%') <> 3 then raise exception 'FAIL: Autorin sieht eigene Posts nicht'; end if;
  if (select count(*) from public.reminders) <> 1 then raise exception 'FAIL: eigene Erinnerung fehlt'; end if;
  if (select count(*) from public.routine_calendars) <> 1 then raise exception 'FAIL: eigener Kalender fehlt'; end if;
  if (select count(*) from public.crosspost_accounts) <> 1 then raise exception 'FAIL: eigenes verbundenes Konto fehlt'; end if;
end $$;
do $$ begin
  perform secret from public.crosspost_accounts;
  raise exception 'FAIL: Spalte secret für Angemeldete lesbar';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.crosspost_accounts_of('00000000-0000-4000-b000-00000000000a');
  raise exception 'FAIL: crosspost_accounts_of für Angemeldete aufrufbar';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.crosspost_save('00000000-0000-4000-b000-00000000000a','mastodon','x','https://example.social','y');
  raise exception 'FAIL: crosspost_save für Angemeldete aufrufbar';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.no_mail_signup_check('abcdefabcdefabcdef');
  raise exception 'FAIL: no_mail_signup_check für Angemeldete aufrufbar';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform 1 from vault.decrypted_secrets;
  raise exception 'FAIL: Vault für Angemeldete lesbar';
exception when insufficient_privilege then null;
end $$;

-- Trennen löscht auch den Zugang in Vault
delete from public.crosspost_accounts where platform = 'mastodon';
reset role;
do $$ begin
  if exists (select 1 from vault.secrets where description = 'Weiterposten mastodon') then raise exception 'FAIL: Zugang bleibt nach dem Trennen in Vault'; end if;
end $$;

-- Konto ohne E-Mail: 3 Versuche je Anschluss, der vierte wird abgelehnt, ein anderer Anschluss geht weiter
do $$ begin
  if public.no_mail_signup_check('aaaaaaaaaaaaaaaaaaaa') <> 'ok' or public.no_mail_signup_check('aaaaaaaaaaaaaaaaaaaa') <> 'ok'
     or public.no_mail_signup_check('aaaaaaaaaaaaaaaaaaaa') <> 'ok' then
    raise exception 'FAIL: die ersten drei Versuche wurden abgelehnt';
  end if;
  if public.no_mail_signup_check('aaaaaaaaaaaaaaaaaaaa') <> 'ip' then raise exception 'FAIL: vierter Versuch je Anschluss erlaubt'; end if;
  if public.no_mail_signup_check('bbbbbbbbbbbbbbbbbbbb') <> 'ok' then raise exception 'FAIL: anderer Anschluss blockiert'; end if;
end $$;

select 'ok privatsphaere: alle Prüfungen bestanden' as ergebnis;
rollback;
