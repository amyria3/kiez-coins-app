# Feinschliff: Gruppenaufgabe, Gruppenkarte, Deine Challenges, Look-Name, Start nach Look-Wechsel

- Datum: 2026-10-24
- Status: erledigt, Entscheidungen für die Doku
- Ziel in Documentation: `kiez-coins/design/Designsystem.md` und App-Stand

- Titel auf dem Foto (`PhotoPicker`): Text mittig, ohne Rahmen. Nur ein Fehler zeigt einen roten Rand.
- Edensteine in der neuen Gruppenaufgabe: Plus und Minus kleiner (Knöpfe 40 pt, Icon 14), Zahl kleiner (`text.metric`) und in Textfarbe.
- Zahl neben dem Edenstein überall in Textfarbe (Gruppenkarte, Gruppenleiste im Feed).
- Kater in der Kachel neben der Sprechblase (Kiez-Look) sitzt 6 pt höher.
- Gruppenkarte: höher, Tipp auf Name und Zeile öffnet den Feed der Gruppe.
- Deine Challenges: Bearbeiten, Schließen, Ansehen und Löschen sind eine leise Leiste mit Trennlinien wie auf der Gruppenkarte, in beiden Looks. „Weiter bearbeiten“ (Entwurf) und „Kopie erstellen“ bleiben Buttons.
- Der Look „Instagram“ heißt überall „Fashionable“, auch im Link: `/app/?look=fashionable`. Alte Links mit `?look=instagram` und die gespeicherte Wahl `instagram` gelten weiter, die App speichert sie als `fashionable`.
- Start: `public/index.html` zeigt die Zahnräder (`public/gears.svg`) sofort an derselben Stelle wie der Startbildschirm, auch nach dem Neuladen beim Look-Wechsel. `StartKater` entfernt sie beim Erscheinen.
