-- Zähler für die Testphase auf kiezcoins.de (Daria, 23.10.2026).
-- Als Testperson zählt, wer die Umfrage in der App abgeschickt hat (Tabelle survey_answers, eine Zeile pro Person).
-- Die Funktion gibt nur die Zahl heraus, keine Antworten und keine Namen. Darum darf sie auch ohne Anmeldung laufen.

create or replace function public.tester_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.survey_answers;
$$;

revoke all on function public.tester_count() from public;
grant execute on function public.tester_count() to anon, authenticated;
