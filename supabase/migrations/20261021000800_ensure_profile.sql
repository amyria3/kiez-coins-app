-- Profil und Einstellungen sicherstellen.
--
-- Normalerweise legt der Trigger on_auth_user_created beides beim Registrieren an. Am 21.10.2026 gab es ein
-- Konto ohne Profil (Ursache unklar). Ohne Zeile in profiles und profile_settings speichert die App
-- Deckname, Kiez und Einstellungen ins Leere, ohne Fehler.
--
-- 1. Fehlende Zeilen für alle bestehenden Konten nachtragen.
-- 2. Funktion ensure_own_profile: Die App ruft sie nach dem Anmelden auf, wenn kein Profil da ist.

insert into public.profiles (id)
select u.id from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.profile_settings (user_id)
select u.id from auth.users u
where not exists (select 1 from public.profile_settings s where s.user_id = u.id);

create function public.ensure_own_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.profile_settings (user_id) values (auth.uid()) on conflict (user_id) do nothing;
end;
$$;

revoke execute on function public.ensure_own_profile() from public, anon;
grant execute on function public.ensure_own_profile() to authenticated;
