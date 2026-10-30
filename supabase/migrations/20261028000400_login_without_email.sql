-- Konto ohne E-Mail: Anmeldung mit Deckname und Passwort (Daria, 27.10.2026).
--
-- Die Edge Function `konto-ohne-mail` legt solche Konten mit einer erfundenen Adresse
-- `<zufall>@ohne-mail.kiezcoins.de` an. Die App braucht diese Adresse zum Anmelden und findet sie über
-- den Decknamen. Echte Adressen gibt die Funktion nie heraus.

-- Adresse zum Anmelden für ein Konto ohne E-Mail. Null, wenn der Deckname zu keinem solchen Konto gehört.
create function public.login_email_for_handle(p_handle text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(btrim(p.handle)) = lower(btrim(p_handle))
    and u.email like '%@ohne-mail.kiezcoins.de'
  limit 1;
$$;

revoke execute on function public.login_email_for_handle(text) from public;
grant execute on function public.login_email_for_handle(text) to anon, authenticated;

-- Ist der Deckname schon vergeben? Für die Edge Function und die App vor dem Anlegen.
create function public.handle_taken(p_handle text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where lower(btrim(handle)) = lower(btrim(p_handle)));
$$;

revoke execute on function public.handle_taken(text) from public;
grant execute on function public.handle_taken(text) to anon, authenticated, service_role;

-- Neue Konten ohne E-Mail in der letzten Stunde. Nur für die Edge Function (Schutz vor Massenanmeldung).
create function public.recent_no_mail_signups()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from auth.users
  where email like '%@ohne-mail.kiezcoins.de' and created_at > now() - interval '1 hour';
$$;

revoke execute on function public.recent_no_mail_signups() from public, anon, authenticated;
grant execute on function public.recent_no_mail_signups() to service_role;
