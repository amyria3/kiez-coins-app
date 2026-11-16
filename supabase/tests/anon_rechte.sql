-- Prüft die Rechte ohne Anmeldung (Migration 20261116000400_anon_rechte, CRA-Befund 8, 2026-11-16).
-- Bricht mit „FAIL: …“ ab. Läuft in einer Transaktion und wird am Ende zurückgerollt.
begin;
do $$ begin
  if has_function_privilege('anon', 'public.create_showcase(uuid, text, text)', 'execute') then
    raise exception 'FAIL: create_showcase ohne Anmeldung aufrufbar';
  end if;
  if has_function_privilege('anon', 'public.routine_feed_token(boolean)', 'execute') then
    raise exception 'FAIL: routine_feed_token ohne Anmeldung aufrufbar';
  end if;
  if not has_function_privilege('authenticated', 'public.create_showcase(uuid, text, text)', 'execute') then
    raise exception 'FAIL: create_showcase für Angemeldete gesperrt';
  end if;
  if not has_function_privilege('anon', 'public.public_showcase(text)', 'execute')
     or not has_function_privilege('anon', 'public.shared_post(uuid, boolean)', 'execute')
     or not has_function_privilege('anon', 'public.login_email_for_handle(text)', 'execute') then
    raise exception 'FAIL: öffentliche Funktion ohne Anmeldung gesperrt';
  end if;
  if has_function_privilege('authenticated', 'public.push_on_message()', 'execute') then
    raise exception 'FAIL: Trigger-Funktion direkt aufrufbar';
  end if;
end $$;
select 'anon_rechte: alles in Ordnung' as ergebnis;
rollback;
