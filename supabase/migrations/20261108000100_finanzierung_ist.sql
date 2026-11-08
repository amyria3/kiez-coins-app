-- Ist-Zustand für die Seite kiezcoins.de/finanzierung (Daria, 2026-11-08).
-- Registriert: Profile ohne Testkonten, Gruppenprofile und gesperrte Konten.
-- Aktiv: davon alle, die sich in den letzten 30 Tagen angemeldet, eine Challenge angesehen, gepostet,
-- kommentiert, geliked oder eine Gruppe betreten haben.
-- Die Funktion gibt nur zwei Zahlen heraus, keine Namen und keine Inhalte. Darum darf sie ohne Anmeldung laufen.

create or replace function public.finanzierung_ist()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with konten as (
    select p.id
    from public.profiles p
    where not p.is_test and not p.is_group and p.banned_at is null
  ),
  aktiv as (
    select id from auth.users where last_sign_in_at > now() - interval '30 days'
    union select user_id from public.challenge_views where created_at > now() - interval '30 days'
    union select author_id from public.challenges where created_at > now() - interval '30 days'
    union select author_id from public.comments where created_at > now() - interval '30 days'
    union select user_id from public.likes where created_at > now() - interval '30 days'
    union select user_id from public.group_members where joined_at > now() - interval '30 days'
  )
  select json_build_object(
    'registriert', (select count(*) from konten),
    'aktiv', (select count(*) from konten k where k.id in (select id from aktiv)),
    'stand', now()
  );
$$;

revoke all on function public.finanzierung_ist() from public;
grant execute on function public.finanzierung_ist() to anon, authenticated;
