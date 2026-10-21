-- UX/UI-Umfrage für Testerinnen und Tester (Dein Konto › Umfrage).
--
-- * survey_answers: eine Antwort pro Person (Primärschlüssel user_id). Die Person liest und ändert
--   nur ihre eigene Antwort. Frage 4 (finanzielle Unterstützung) ist Mehrfachauswahl.
-- * survey_results(): Auswertung als Zählung, nur für Personen in `moderators`.
--   Die Moderation sieht keine einzelnen Antworten und keine Namen.

create table public.survey_answers (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  opinion text not null check (opinion in ('no_more_apps', 'good_idea', 'undecided')),
  usability text not null check (usability in ('intuitive', 'medium', 'difficult')),
  design text not null check (design in ('great', 'meh', 'awful')),
  support text[] not null check (
    cardinality(support) between 1 and 5
    and support <@ array['buy_once', 'subscribe', 'cannot_afford', 'pointless', 'would_not_pay']
  ),
  recommend text not null check (recommend in ('already', 'maybe', 'never_recommend', 'nobody', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_answers enable row level security;
revoke delete on public.survey_answers from authenticated;
create policy "Eigene Umfrage-Antwort lesen" on public.survey_answers for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Umfrage beantworten" on public.survey_answers for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Eigene Umfrage-Antwort ändern" on public.survey_answers for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

/** Auswertung: Anzahl Antworten und je Frage die Zahl pro Antwort. */
create function public.survey_results()
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
    'total', (select count(*) from public.survey_answers),
    'opinion', (select coalesce(jsonb_object_agg(k, n), '{}') from (select opinion k, count(*) n from public.survey_answers group by 1) s),
    'usability', (select coalesce(jsonb_object_agg(k, n), '{}') from (select usability k, count(*) n from public.survey_answers group by 1) s),
    'design', (select coalesce(jsonb_object_agg(k, n), '{}') from (select design k, count(*) n from public.survey_answers group by 1) s),
    'support', (select coalesce(jsonb_object_agg(k, n), '{}') from (select unnest(support) k, count(*) n from public.survey_answers group by 1) s),
    'recommend', (select coalesce(jsonb_object_agg(k, n), '{}') from (select recommend k, count(*) n from public.survey_answers group by 1) s)
  );
end;
$$;
revoke execute on function public.survey_results() from public, anon;
grant execute on function public.survey_results() to authenticated;
