-- Umfrage: freies Kommentarfeld als letzter, freiwilliger Schritt (Wunsch Daria, 26.10.2026).
--
-- * survey_answers.comment: Freitext, höchstens 1000 Zeichen, leer erlaubt.
-- * survey_results() liefert zusätzlich alle Kommentare, neueste zuerst, ohne Namen.

alter table public.survey_answers
  add column comment text check (char_length(comment) <= 1000);

create or replace function public.survey_results()
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
    'recommend', (select coalesce(jsonb_object_agg(k, n), '{}') from (select recommend k, count(*) n from public.survey_answers group by 1) s),
    'comments', (
      select coalesce(jsonb_agg(jsonb_build_object('text', comment, 'at', updated_at) order by updated_at desc), '[]')
      from public.survey_answers
      where nullif(btrim(comment), '') is not null
    )
  );
end;
$$;
revoke execute on function public.survey_results() from public, anon;
grant execute on function public.survey_results() to authenticated;
