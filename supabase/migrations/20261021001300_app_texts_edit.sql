-- Texte-Editor in der App (Route `texte`): Moderatorinnen ändern die Spalte `text` direkt in der App.
-- Voraussetzung: 0700 (moderators, is_moderator) und 0900 (app_texts).
grant update (text) on public.app_texts to authenticated;
drop policy if exists "Texte ändern" on public.app_texts;
create policy "Texte ändern" on public.app_texts for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
