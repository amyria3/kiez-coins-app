-- Eigener Punkt auf kiezcoins.de/finanzierung (Daria, 2026-11-08).
-- Nur wer die Seite über „Dein Konto › Finanzierung“ in der App öffnet, sieht dort den eigenen Punkt.
-- 1. finanzierung_link(): Die angemeldete Person holt einen einmaligen Code. Die App öffnet damit
--    kiezcoins.de/finanzierung#ich=<code>. Der Code steht nur im Fragment und erreicht keinen Server-Log.
-- 2. finanzierung_mein_punkt(code): Die Seite löst den Code ein. Er gilt 10 Minuten und nur einmal.
--    Zurück kommen nur Gruppe und Rang des eigenen Punkts plus die Zahlen aus finanzierung_ist,
--    keine Namen und keine anderen Konten.

create table public.finanzierung_links (
  code text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Kein Zugriff über die API, nur über die beiden Funktionen
alter table public.finanzierung_links enable row level security;

create or replace function public.finanzierung_link()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  delete from public.finanzierung_links where user_id = auth.uid() or created_at < now() - interval '10 minutes';
  insert into public.finanzierung_links (code, user_id) values (v_code, auth.uid());
  return v_code;
end;
$$;

revoke all on function public.finanzierung_link() from public;
grant execute on function public.finanzierung_link() to authenticated;

create or replace function public.finanzierung_mein_punkt(p_code text)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_result json;
begin
  delete from public.finanzierung_links
  where code = p_code and created_at > now() - interval '10 minutes'
  returning user_id into v_user;
  if v_user is null then
    return null;
  end if;

  -- Gleiche Regeln wie finanzierung_ist: registriert ohne Testkonten, Gruppenprofile und gesperrte Konten;
  -- aktiv mit Anmeldung, Aufruf, Post, Kommentar, Like oder Gruppenbeitritt in den letzten 30 Tagen.
  -- Rang: Reihenfolge der Anmeldung innerhalb der eigenen Gruppe, ab 0.
  with konten as (
    select p.id, p.created_at
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
  ),
  gruppen as (
    select k.id,
      case when k.id in (select id from aktiv) then 'aktiv' else 'inaktiv' end as kategorie,
      k.created_at
    from konten k
  ),
  rang as (
    select id, kategorie, (row_number() over (partition by kategorie order by created_at, id) - 1) as rang
    from gruppen
  )
  select json_build_object(
    'registriert', (select count(*) from gruppen),
    'aktiv', (select count(*) from gruppen where kategorie = 'aktiv'),
    'stand', now(),
    'kategorie', (select r.kategorie from rang r where r.id = v_user),
    'rang', (select r.rang from rang r where r.id = v_user)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.finanzierung_mein_punkt(text) from public;
grant execute on function public.finanzierung_mein_punkt(text) to anon, authenticated;
