-- Modus „Privat“ (Daria, 27.10.2026): Beiträge, die nur die Ersteller:in sieht.
--
-- Ein privater Beitrag ist fertig und gepostet, aber kein Entwurf. Er steht im Feed im Reiter „Privat“
-- und nirgends sonst. Die Sichtbarkeit ist eine eigene Spalte, damit sie unabhängig vom Ablauf
-- (draft, open, closed …) bleibt. Siehe Übergabe/2026-10-26_offen_sichtbarkeit-nur-ich.md.
--
-- Privat gibt es nur ohne Gruppe und nur für Me-Challenges (before_after) und Bilder (photo).
-- We-Challenges brauchen andere, die sie annehmen; Coins gibt es privat nicht.
--
-- Voraussetzung: 20261021000200_soft_delete_challenge, 20261027000200_group_photo_posts.
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.challenges add column if not exists visibility text not null default 'public';

alter table public.challenges drop constraint if exists challenges_visibility;
alter table public.challenges add constraint challenges_visibility check (
  visibility = 'public'
  or (visibility = 'private' and group_id is null and type in ('photo', 'before_after') and bounty_amount is null)
);

-- Lesen: wie bisher (Stand 20261021000200), dazu private Beiträge nur für die Ersteller:in.
alter policy "Challenges lesen" on public.challenges
  using (
    (status not in ('draft', 'deleted') or author_id = (select auth.uid()))
    and (visibility = 'public' or author_id = (select auth.uid()))
    and (group_id is null or (select public.is_group_member(group_id)))
  );

-- Eigener Entwurf: Sichtbarkeit lässt sich setzen, solange er ein Entwurf ist (Policy „Eigenen Entwurf
-- bearbeiten“). So bekommt ein Vorher-Nachher aus start_before_after die Sichtbarkeit „Privat“.
grant update (visibility) on public.challenges to authenticated;
