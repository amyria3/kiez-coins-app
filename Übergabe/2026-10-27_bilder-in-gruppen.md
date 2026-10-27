# Bilder in Gruppen posten

Pflichtaufgabe: Migration `supabase/migrations/20261027000200_group_photo_posts.sql` im SQL-Editor von Supabase einspielen.

Stand: 27.10.2026. Status: erledigt, Notiz für die Doku.
Gehört in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“, und die Datenbank-Doku (Tabelle `challenges`, Policy „Gruppenaufgabe erstellen“).

## Was Daria entschieden hat

„Foto posten“ gab es nur im Kiez. Ab jetzt geht ein Bild ohne Aufgabe auch in einer Gruppe. Es sehen allein die Mitglieder dieser Gruppe, passend zum Hinweis „Was Du hier postest, sehen nur die Mitglieder in dieser Gruppe“ (Daria, 27.10.2026).

## Was die App macht

- Der Schalter über dem Erstellen-Formular zeigt in Gruppen drei Typen: We-Challenge, Me-Challenge, Bild. „Bild“ erscheint, wenn der Schalter „Bild“ in „Dein Konto › Funktionen“ an ist, wie im Kiez.
- Ein Gruppenbild braucht Foto und Titel, dazu bis zu zwei weitere Fotos, eine Beschreibung und einen Zeitraum. Es hat keine Edensteine, keine Coins und keinen Ort.
- Das Bild geht direkt raus, ohne Entwurf und ohne Vorschau, wie die Gruppenaufgabe. Danach öffnet die App den Beitrag.
- Annehmen, Erledigt melden und Bezahlen gibt es nicht; `isPostOnly` deckt das in der Oberfläche ab, `accept_challenge` in der Datenbank.
- Die Zählung „offene Aufgaben“ auf der Gruppenseite überspringt Bilder und Vorher-Nachher.

## Betroffene Dateien

- `src/components/compose/GroupPhotoForm.tsx` (neu): Felder und Knopf „Bild posten“.
- `src/components/compose/ComposeSheet.tsx`: `GROUP_TYPES` um `photo` erweitert, Formular je Typ.
- `src/app/gruppen/[id]/aufgabe.tsx`: derselbe Schalter auf der eigenen Route, Titel wechselt zu „Bild posten“.
- `src/app/gruppen/[id]/index.tsx`: offene Aufgaben ohne Bilder und Vorher-Nachher.
- `src/data/remote.ts`, `src/data/store.tsx`: `NewGroupTask` kennt `type` und `extras`, Edensteine sind optional.
- `supabase/migrations/20261027000200_group_photo_posts.sql`: Prüfung `challenges_group_reward` und Policy „Gruppenaufgabe erstellen“.

## Datenbank

Die Migration ändert zwei Dinge:

1. `challenges_group_reward` erlaubt in einer Gruppe jetzt auch `type = 'photo'` ohne Edensteine.
2. Die Policy „Gruppenaufgabe erstellen“ erlaubt neben der Aufgabe mit 1 bis 10 Edensteinen ein Bild ohne Edensteine, mit Foto im eigenen Ordner.

Lesen regelt weiter die Policy „Challenges lesen“ über `is_group_member`: Ein Gruppenbild sehen nur Mitglieder.

Das Skript läuft auch ein zweites Mal ohne Fehler. Geprüft am 27.10.2026 gegen die Datenbank in einer Transaktion mit `rollback`.

## Offene Punkte

Keine.
