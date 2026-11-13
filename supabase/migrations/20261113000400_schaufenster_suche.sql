-- Schaufenster-Suche im Feed (Daria, 2026-11-13): Im Kiez- und im Überall-Feed sitzt unter dem Umschalter ein
-- Suchfeld. Es findet nur öffentliche Schaufenster.
--
-- Öffentlich heißt: visibility = 'public' und das Schaufenster ist online (Feature `schaufenster` der Gruppe an,
-- public.gruppen_feature). Schaufenster „nur für Eingeladene“ und offline geschaltete findet die Suche nie, auch
-- nicht für Mitglieder der eigenen Gruppe.
--
-- Gesucht wird in Name, Kiez und „Über uns“ (Groß- und Kleinschreibung egal), ab zwei Zeichen, nur für Angemeldete.
-- Die Funktion läuft wie public_showcase mit Definer-Rechten, weil Angemeldete lat und lng nicht direkt lesen dürfen
-- (Spaltenrechte, 20261110000600). Die festen Bedingungen unten lassen trotzdem nur öffentliche, online geschaltete Schaufenster
-- durch, und deren Ort zeigt showcase_private ohnehin allen (can_see_showcase). Die App braucht den Ort für den
-- Kiez-Feed (5 km wie die Posts).
--
-- Später (Daria, 2026-11-13, Übergabe/TODO.md): im Überall-Feed nach Entfernung sortieren, in anderen Gegenden suchen.
--
-- Neue Funktion in der Feature-Freischaltung (20261110001100): schaufenster_suche, für alle an.
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

insert into public.features (key, name, description, default_on, note) values
  ('schaufenster_suche', 'Schaufenster suchen', 'Suchfeld im Kiez- und Überall-Feed, findet öffentliche Schaufenster', true, 'Für alle (Daria, 2026-11-13)')
on conflict (key) do nothing;

create or replace function public.schaufenster_suche(p_query text, p_limit int default 50)
returns table (id uuid, name text, slug text, logo_path text, kiez text, about text, lat double precision, lng double precision)
language sql stable security definer set search_path = '' as $$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select s.id, s.name, s.slug, s.logo_path, s.kiez, s.about, s.lat::double precision, s.lng::double precision
    from public.showcases s, q
   where (select auth.uid()) is not null
     and char_length(btrim(coalesce(p_query, ''))) >= 2
     and s.visibility = 'public'
     and public.gruppen_feature('schaufenster', s.group_id)
     and (s.name ilike q.pattern or s.kiez ilike q.pattern or s.about ilike q.pattern)
   order by lower(s.name)
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;
revoke all on function public.schaufenster_suche(text, int) from public, anon;
grant execute on function public.schaufenster_suche(text, int) to authenticated;
