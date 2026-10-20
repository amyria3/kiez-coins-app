-- Gelöschte Challenges endgültig löschen (samt Kommentaren, Likes und Aufrufen).
-- Bisher (20261021000200) ließen sich nur Entwürfe endgültig löschen.

alter policy "Eigenen Entwurf löschen" on public.challenges
  using (author_id = (select auth.uid()) and status in ('draft', 'deleted'));
