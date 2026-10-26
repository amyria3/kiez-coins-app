-- Umfrage, Ergänzungen von Daria (26.10.2026):
--
-- * survey_answers.frequency: neue Frage „Wie oft würdest Du die App nutzen?“. Leer bei Antworten
--   von vorher; die App fragt diese Personen noch einmal.
-- * survey_answers.reason / reason_other: letzte Frage „Wieso hast Du die App getestet?“ mit Auswahl
--   und eigener Antwort (höchstens 1000 Zeichen). Beides freiwillig, die App verlangt eins von beiden.
-- * survey_answers.comment: freies Kommentarfeld als letzter, freiwilliger Schritt, höchstens 1000 Zeichen.
-- * survey_results() liefert zusätzlich die Zählungen zu `frequency` und `reason`, die eigenen Antworten
--   und alle Kommentare, jeweils neueste zuerst und ohne Namen.

alter table public.survey_answers
  add column frequency text check (frequency in ('often', 'sometimes', 'rarely')),
  add column reason text check (reason in ('exciting', 'curious', 'nice')),
  add column reason_other text check (char_length(reason_other) <= 1000),
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
    'frequency', (select coalesce(jsonb_object_agg(k, n), '{}') from (select frequency k, count(*) n from public.survey_answers where frequency is not null group by 1) s),
    'usability', (select coalesce(jsonb_object_agg(k, n), '{}') from (select usability k, count(*) n from public.survey_answers group by 1) s),
    'design', (select coalesce(jsonb_object_agg(k, n), '{}') from (select design k, count(*) n from public.survey_answers group by 1) s),
    'support', (select coalesce(jsonb_object_agg(k, n), '{}') from (select unnest(support) k, count(*) n from public.survey_answers group by 1) s),
    'recommend', (select coalesce(jsonb_object_agg(k, n), '{}') from (select recommend k, count(*) n from public.survey_answers group by 1) s),
    'reason', (select coalesce(jsonb_object_agg(k, n), '{}') from (select reason k, count(*) n from public.survey_answers where reason is not null group by 1) s),
    'reason_other', (
      select coalesce(jsonb_agg(jsonb_build_object('text', reason_other, 'at', updated_at) order by updated_at desc), '[]')
      from public.survey_answers
      where nullif(btrim(reason_other), '') is not null
    ),
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
