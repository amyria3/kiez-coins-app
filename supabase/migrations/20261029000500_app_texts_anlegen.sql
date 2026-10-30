-- Texte-Editor findet alle Texte (Daria, 29.10.2026): Die Suche fand neue Texte nicht, weil sie noch nicht in
-- app_texts standen (906 von rund 1360). Der Editor zeigt jetzt auch Texte aus dem Code ohne Zeile. Beim ersten
-- Speichern legt er die Zeile an; das dürfen nur Moderatorinnen.
--
-- Voraussetzung: 20261021001300 (app_texts_edit), 20261026000200 (Spalte ru). Läuft auch mehrfach ohne Fehler.

grant insert (original, text, en, fr, uk, ru, ar, he) on public.app_texts to authenticated;
drop policy if exists "Texte anlegen" on public.app_texts;
create policy "Texte anlegen" on public.app_texts for insert to authenticated
  with check ((select public.is_moderator()));
