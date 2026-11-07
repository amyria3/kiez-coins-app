-- Sichtbarkeit eines eigenen Beitrags nachträglich ändern (Daria, 07.11.2026): Privat, Kiez oder Überall,
-- auch in „Text bearbeiten“ und „Challenge bearbeiten“.
--
-- * Privat: visibility 'private', local_only false. Erlaubt nur, was der Check challenges_visibility zulässt
--   (ohne Gruppe, nur Bild und Me-Challenge, ohne Coins).
-- * Kiez: visibility 'public', local_only true (nicht in „Überall“).
-- * Überall: visibility 'public', local_only false.
-- Nur die Ersteller:in, nur ohne Gruppe, nur solange niemand die Challenge angenommen hat.
-- Gilt für offene, geschlossene, gelöschte (Archiv) Beiträge und Entwürfe.
--
-- Voraussetzung: 20261028000100_challenge_visibility_private, 20261029000100_ueberall_umkreis.
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

create or replace function public.set_challenge_audience(p_challenge_id uuid, p_private boolean, p_local_only boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set visibility = case when coalesce(p_private, false) then 'private' else 'public' end,
         local_only = not coalesce(p_private, false) and coalesce(p_local_only, false)
   where id = p_challenge_id and author_id = auth.uid() and group_id is null and assignee_id is null;
  if not found then perform public.challenge_not_changed('geändert werden'); end if;
end;
$$;
revoke execute on function public.set_challenge_audience(uuid, boolean, boolean) from public, anon;
grant execute on function public.set_challenge_audience(uuid, boolean, boolean) to authenticated;
