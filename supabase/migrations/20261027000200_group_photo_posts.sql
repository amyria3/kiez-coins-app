-- Bilder in Gruppen (Daria, 27.10.2026): type 'photo' auch mit group_id.
--
-- Bisher ging in einer Gruppe nur eine Aufgabe mit Edensteinen (type 'individual') oder Vorher-Nachher.
-- Ein Bild ohne Aufgabe gab es nur im Kiez. Jetzt geht es auch in der Gruppe, sichtbar allein für die
-- Mitglieder: Das regelt die bestehende Policy „Challenges lesen“ über is_group_member.
--
-- Ein Gruppenbild hat keine Edensteine, keine Coins, keinen Ort und lässt sich nicht annehmen
-- (accept_challenge schließt 'photo' seit 20261022000100 aus). Es geht direkt raus, ohne Entwurf,
-- wie die Gruppenaufgabe.
--
-- Voraussetzung: 20261021000100_groups, 20261022000100_photo_posts, 20261023000300_before_after.
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

-- Gruppen: Aufgabe mit Edensteinen, Vorher-Nachher ohne Edensteine, Bild ohne Edensteine.
alter table public.challenges drop constraint if exists challenges_group_reward;
alter table public.challenges add constraint challenges_group_reward check (
  (group_id is null and edensteine is null)
  or (group_id is not null and edensteine between 1 and 10 and bounty_amount is null and type = 'individual')
  or (group_id is not null and edensteine is null and type in ('before_after', 'photo'))
);

-- Erstellen in der Gruppe: Aufgabe mit 1 bis 10 Edensteinen oder Bild ohne Edensteine.
-- Stand 20261021000100 plus type 'photo'.
alter policy "Gruppenaufgabe erstellen" on public.challenges
  with check (
    author_id = (select auth.uid())
    and group_id is not null
    and (select public.is_group_member(group_id))
    and status = 'open'
    and deadline > now()
    and bounty_amount is null
    and (
      (type = 'individual' and edensteine between 1 and 10)
      or (type = 'photo' and edensteine is null and image_path is not null)
    )
    and assignee_id is null
    and accepted_at is null
    and reported_at is null
    and confirmed_at is null
    and closed_at is null
    and report_photo_path is null
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );
