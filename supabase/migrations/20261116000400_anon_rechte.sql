-- Funktionen ohne Anmeldung (CRA-Risikobewertung, Befund 8, Daria, 16.11.2026).
--
-- Supabase gibt neuen Funktionen im Schema public das Recht zum Ausführen auch für `anon` (ohne Anmeldung).
-- Bei Funktionen mit erhöhten Rechten (security definer) ist das nur gewollt, wo die öffentliche Website oder eine
-- Seite ohne Konto sie braucht. Diese Migration nimmt `anon` das Recht überall sonst.
--
-- Bleiben für anon, weil öffentlich gebraucht: app_release (Download-Seite), finanzierung_ist und
-- finanzierung_mein_punkt (Finanzierungsseite), tester_count (Website), like_event (Herzen ohne Konto),
-- login_email_for_handle (Anmeldung mit Deckname), public_showcase, public_showcase_redirect, public_showcase_slugs,
-- showcase_online, shared_post (öffentliche Seiten), can_see_showcase, showcase_private, event_save_count,
-- showcase_slug_status (Schaufenster ohne Konto in der Web-App).
--
-- Läuft auch mehrfach ohne Fehler; fehlt eine Funktion, wird sie übersprungen.

do $$
declare
  f text;
begin
  -- Nur mit Anmeldung
  foreach f in array array[
    'public.answer_showcase_request(uuid, uuid, boolean)',
    'public.attach_showcase_post(uuid, uuid)',
    'public.can_post_showcase(uuid)',
    'public.create_showcase(uuid, text, text)',
    'public.enforce_showcase_limit(uuid)',
    'public.finanzierung_link()',
    'public.is_showcase_founder(uuid)',
    'public.join_showcase(text)',
    'public.link_routine_post(uuid, uuid, text)',
    'public.routine_feed_paused()',
    'public.routine_feed_set_paused(boolean)',
    'public.routine_feed_token(boolean)',
    'public.set_showcase_poster(uuid, uuid, boolean)',
    'public.sync_test_account()',
    'public.handle_taken(text)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;

  -- Trigger-Funktionen: niemand ruft sie direkt auf (das Recht prüft Postgres nur beim Anlegen des Triggers)
  foreach f in array array[
    'public.challenges_showcase_limit()',
    'public.end_friendship_on_block()',
    'public.showcase_events_limit()',
    'public.showcase_slug_change()',
    'public.push_on_message()',
    'public.push_on_friendship()',
    'public.push_on_group_member()',
    'public.push_on_challenge()',
    'public.push_on_participant()',
    'public.push_on_showcase_follow()',
    'public.push_on_showcase_comment()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;
