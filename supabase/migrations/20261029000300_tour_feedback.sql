-- Rückmeldung zur Tour (Daria, 29.10.2026): letzte Seite „Wie fandest Du diese Erklärung?“
--
-- * tour_feedback: eine Antwort pro Person (Primärschlüssel user_id). Mehrfachauswahl aus vier Antworten und
--   ein freies Feld „Anderes“ (höchstens 1000 Zeichen). Eins von beiden muss da sein. Erneutes Absenden
--   (Tour noch einmal über „Dein Konto“) ändert die Antwort.
-- * Die Person liest und ändert nur ihre eigene Antwort.
-- * tour_feedback_results(): Auswertung als Zählung und freie Antworten ohne Namen, nur für die Moderation
--   (Dein Konto › Umfrage-Ergebnis).
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

create table if not exists public.tour_feedback (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  choices text[] not null default '{}' check (
    cardinality(choices) <= 4
    and choices <@ array['helpful', 'motivating', 'cumbersome', 'not_needed']
  ),
  other text check (char_length(other) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(choices) > 0 or nullif(btrim(other), '') is not null)
);

alter table public.tour_feedback enable row level security;
revoke delete on public.tour_feedback from authenticated;
revoke all on public.tour_feedback from anon;

drop policy if exists "Eigene Tour-Rückmeldung lesen" on public.tour_feedback;
create policy "Eigene Tour-Rückmeldung lesen" on public.tour_feedback for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Tour-Rückmeldung geben" on public.tour_feedback;
create policy "Tour-Rückmeldung geben" on public.tour_feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Eigene Tour-Rückmeldung ändern" on public.tour_feedback;
create policy "Eigene Tour-Rückmeldung ändern" on public.tour_feedback for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Auswertung: Anzahl Antworten, Zahl pro Antwort, freie Antworten neueste zuerst
create or replace function public.tour_feedback_results()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Die Auswertung sieht nur die Moderation.' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'total', (select count(*) from public.tour_feedback),
    'choices', (select coalesce(jsonb_object_agg(k, n), '{}') from (select unnest(choices) k, count(*) n from public.tour_feedback group by 1) s),
    'other', (
      select coalesce(jsonb_agg(jsonb_build_object('text', other, 'at', updated_at) order by updated_at desc), '[]')
      from public.tour_feedback
      where nullif(btrim(other), '') is not null
    )
  );
end;
$$;
revoke execute on function public.tour_feedback_results() from public, anon;
grant execute on function public.tour_feedback_results() to authenticated;
