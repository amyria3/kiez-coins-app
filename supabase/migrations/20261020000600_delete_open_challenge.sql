-- Offene eigene Challenges wieder löschbar, solange niemand angenommen hat.
-- Bisher (20261020000200) nur Entwürfe. Nach dem Annehmen hilft der Kundenservice.

alter policy "Eigenen Entwurf löschen" on public.challenges
  using (author_id = (select auth.uid()) and status in ('draft', 'open') and assignee_id is null);

alter policy "Eigenen Entwurf löschen" on public.challenges rename to "Eigene Challenge löschen";
