-- Rückmeldung zur Tour auch ohne Konto (Daria, 29.10.2026): Alle sollen die App testen und Rückmeldung geben
-- können, auch mit Beispieldaten ohne Anmeldung.
--
-- * tour_feedback bekommt eine eigene id als Primärschlüssel. user_id bleibt eindeutig, darf aber leer sein.
-- * Ohne Konto (Rolle anon): nur Antwort und freies Feld einfügen, ohne Person. Lesen, ändern und löschen geht
--   ohne Konto nicht. Jede Antwort ohne Konto ist eine neue Zeile.
-- * Mit Konto bleibt es bei einer Antwort pro Person.
-- * tour_feedback_results() zählt beides.
--
-- Voraussetzung: 20261029000300_tour_feedback. Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.tour_feedback add column if not exists id uuid not null default gen_random_uuid();

-- Primärschlüssel von user_id auf id umstellen, user_id bleibt eindeutig (für „erneut Absenden ändert“)
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.tour_feedback'::regclass and contype = 'p'
       and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id)'
  ) then
    alter table public.tour_feedback drop constraint tour_feedback_pkey;
    alter table public.tour_feedback add constraint tour_feedback_pkey primary key (id);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.tour_feedback'::regclass and conname = 'tour_feedback_user_id_key'
  ) then
    alter table public.tour_feedback add constraint tour_feedback_user_id_key unique (user_id);
  end if;
end;
$$;

alter table public.tour_feedback alter column user_id drop not null;

-- Ohne Konto: nur diese beiden Spalten, die Person bleibt leer
grant insert (choices, other) on public.tour_feedback to anon;
drop policy if exists "Tour-Rückmeldung ohne Konto" on public.tour_feedback;
create policy "Tour-Rückmeldung ohne Konto" on public.tour_feedback for insert to anon
  with check (user_id is null);
