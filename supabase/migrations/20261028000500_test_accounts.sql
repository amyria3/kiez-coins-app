-- Testkonten (Daria, 27.10.2026): einmal testen ohne Anmeldung.
--
-- Die App meldet Testende über die anonyme Anmeldung von Supabase an (signInAnonymously).
-- Pflichtaufgabe: In Supabase › Authentication › Sign In / Providers „Allow anonymous sign-ins“ einschalten.
--
-- 1. profiles.is_test: true für anonyme Konten. Beiträge zeigen dann die Marke „Testaccount“.
--    Nur die Datenbank setzt den Wert, Nutzer:innen können ihn nicht ändern.
-- 2. Wer E-Mail oder Passwort nachträgt, ist kein anonymes Konto mehr: is_test wird false, alles bleibt.
-- 3. Jede Nacht löscht ein Job Testkonten, die älter als 7 Tage sind, samt Profil und Beiträgen.

alter table public.profiles add column is_test boolean not null default false;

-- is_test folgt auth.users.is_anonymous.
create function public.sync_test_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set is_test = coalesce(new.is_anonymous, false) where id = new.id;
  return new;
end;
$$;

-- Name nach on_auth_user_created, damit das Profil schon da ist (Trigger laufen in Namensreihenfolge).
create trigger on_auth_user_test_mark
  after insert or update of is_anonymous on auth.users
  for each row execute function public.sync_test_account();

-- Nutzer:innen dürfen ihr Profil ändern, aber nicht is_test.
create function public.keep_test_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_test is distinct from old.is_test and current_user in ('anon', 'authenticated') then
    new.is_test := old.is_test;
  end if;
  return new;
end;
$$;

create trigger profiles_keep_test_flag
  before update on public.profiles
  for each row execute function public.keep_test_flag();

-- Bestehende Konten nachtragen (bisher gibt es keine anonymen).
update public.profiles p set is_test = true
from auth.users u where u.id = p.id and u.is_anonymous;

-- Aufräumen: anonyme Konten älter als 7 Tage löschen. Profil, Challenges und Kommentare hängen per
-- on delete cascade daran.
create function public.delete_old_test_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from auth.users where is_anonymous and created_at < now() - interval '7 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.delete_old_test_accounts() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('delete-old-test-accounts', '30 3 * * *', 'select public.delete_old_test_accounts()');
end;
$$;
