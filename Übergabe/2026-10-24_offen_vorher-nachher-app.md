# Vorher-Nachher in der App bauen

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/konzept/Vorher_Nachher.md`, `kiez-coins/app/Anleitung_App.md`

## Stand

- Datenbank fertig und eingespielt: `supabase/migrations/20261023000300_before_after.sql`, Test `supabase/tests/before_after.sql`.
- Test-Screens beider Looks: Artifact https://claude.ai/artifact/MKgFwXvx2JeUbKgC6qQjBb, Quelle `scripts/prototyp-vorher-nachher/` (Aufruf `node scripts/prototyp-vorher-nachher/gen.mjs $PWD /tmp/vn`).
- In der App ist noch nichts gebaut.

## So funktioniert Vorher-Nachher (Darias Entscheidung, 2026-10-23)

1. Beim Erstellen wählt ein Schalter Challenge, Vorher-Nachher oder Bild, in dieser Reihenfolge. Zielgruppe: Kiez oder eine Gruppe.
2. Vorher-Foto, Überschrift, Erklärung. Die App speichert den Stand als Entwurf.
3. Timer starten. Er läuft auf dem Server, auch bei geschlossener App.
4. Nachher-Foto und zweite Erklärung, dann posten. Nach höchstens 48 h postet die App selbst, auch ohne Nachher-Foto. Ohne gestarteten Timer bleibt der Entwurf liegen.
5. Eine Überschrift für beide. Jede Erklärung höchstens 240 Zeichen, beginnt mit `#vorher` bzw. `#nachher`. Die Datenbank setzt beide beim Posten zu einem Text zusammen. Keine Bounty, keine Frist, kein Ort; im Kiez gilt der Kiez aus dem Profil.
6. Im Feed: Vorher oben 1/3 der Höhe, Nachher 2/3. Ein Tipp vergrößert eines auf 5/6, die Karte wächst um 25 %, zweiter Tipp stellt zurück (Bewegung „Schranke“). An der Naht die Dauer, zum Beispiel „2 h 14 min“. Läuft ein eigener Timer, zeigt der Feed oben das Vorher-Foto rund mit einem Ring über 48 h und „Du hast Dich selbst herausgefordert“.

Das ganze Konzept steht in Documentation unter `kiez-coins/konzept/Vorher_Nachher.md`.

## Für den Bau

- Der Tipp aufs Foto zeigt im Kiez-Look bisher, wer gepostet hat (`KiezPost` in `ChallengePost.tsx`). Bei Vorher-Nachher ändert er die Größe. `store.tsx` filtert offene Challenges mit `type !== 'photo'`; `before_after` braucht dort denselben Ausschluss. `deadline` setzt die Datenbank beim Posten auf den Zeitpunkt des Postens; die App zeigt bei Vorher-Nachher keine Frist.
- Arbeitspakete: Datenschicht, Erstellen mit drei Schritten, Rückkehr zu einem laufenden Entwurf, Karte in beiden Looks, Detail-Ansicht, Texte fürs Texte-CMS.

## Offene Fragen an Daria

- Darias Feedback zu den Test-Screens.
- Sichtbarkeit während des Timers: Bisher ist der Beitrag bis zum Posten ein Entwurf, den nur die Ersteller:in sieht. Aufrufe und Likes gibt es erst danach.
