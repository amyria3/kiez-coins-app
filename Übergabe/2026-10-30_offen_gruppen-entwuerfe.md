# Entwürfe auch in Gruppen

Datum: 2026-10-30 · Status: umgesetzt, PR #135 gemergt, Migration eingespielt (Daria, 30.10.2026); offen bis zum Test am Telefon · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitte „Gruppen“ und „Challenges“), Datenbank-Doku (`publish_challenge`, Policy „Gruppenaufgabe erstellen“)

## Entscheidung von Daria (30.10.2026)

We-Challenge und Bild in einer Gruppe lassen sich als Entwurf speichern, wie im Kiez. Der Hinweis im Reiter Gruppen sagt das schon („Du kannst aber auch einen Post als Entwurf speichern.“). Vorher-Nachher hat schon einen eigenen Entwurf mit Timer.

## Umsetzung

- Erstellen-Blatt (Reiter Gruppe) und Route `groups/[id]/task`: unter „We-Challenge veröffentlichen“ bzw. „Bild posten“ steht „Als Entwurf speichern“ (`GroupTaskForm.tsx`, `GroupPhotoForm.tsx`).
- „Deine Challenges“ öffnet einen Gruppen-Entwurf in `groups/[id]/task?draftId=…`. Dort gibt es nur We-Challenge und Bild. Veröffentlichen speichert den Entwurf und ruft `publish_challenge` auf.
- `saveDraft` (`src/data/remote.ts`) nimmt `groupId` an und setzt `group_id` beim Anlegen.
- Migration `20261030000300_gruppen_entwuerfe.sql`:
    - Policy „Gruppenaufgabe erstellen“ erlaubt `status = 'draft'`. Ein Bild-Entwurf darf noch ohne Foto sein.
    - `publish_challenge`: In Gruppen zählt die Mitgliedschaft statt des Kiezes, und es braucht keinen Ort. Private Bilder brauchen auch keinen Ort. Bisher scheiterte ein gespeicherter privater Entwurf beim Veröffentlichen an „Bitte gib einen Ort ein.“. Ein Foto braucht es überall außer bei der Gruppenaufgabe.
    - `grant update (edensteine)`, wie in `20261030000200` (PR #134).
- Lokal mit Postgres geprüft: Policy und `publish_challenge` für Gruppe, Privat und Kiez, auch ohne Mitgliedschaft. In der Web-App (Beispieldaten) geprüft: Entwurf speichern, in „Deine Challenges“ öffnen, veröffentlichen.

## Offene Punkte

- [x] Migration in Supabase eingespielt (30.10.2026).
- [ ] Am Telefon testen: Bild-Entwurf in der Gruppe speichern, öffnen, posten.
- [ ] Android-Update nach dem Merge.
- [x] Entwürfe beim Posten: Zeile „Deine Entwürfe“ oben im Erstellen-Blatt (`DraftStrip.tsx`, 30.10.2026).
