# Vorher-Nachher in der App

Datum: 2026-10-24
Status: offen (gebaut, Test auf dem Handy und Darias Feedback stehen aus)
Ergebnis gehört nach Documentation: `kiez-coins/konzept/Vorher_Nachher.md`, `kiez-coins/app/Anleitung_App.md`, `kiez-coins/app/Stand_App.md`

## Stand

- Datenbank fertig und eingespielt: `supabase/migrations/20261023000300_before_after.sql`, Test `supabase/tests/before_after.sql`. Keine neue Migration nötig.
- App gebaut (2026-10-24), beide Looks, Live- und Demo-Betrieb. Im Browser mit Beispieldaten durchgeklickt: Erstellen, Timer, Nachher, Später weitermachen, Ring im Feed, Posten, Detail.
- Test-Screens von vorher: Artifact https://claude.ai/artifact/MKgFwXvx2JeUbKgC6qQjBb, Quelle `scripts/prototyp-vorher-nachher/`.

## So funktioniert es in der App

Namen (Daria, 2026-10-24): Vorher-Nachher heißt in der App „Me-Challenge“, die normale Challenge „We-Challenge“, in Gruppen auch statt „Aufgabe“. Der Knopf zum Posten heißt „Me-Challenge posten“. Code-Typ bleibt `before_after`, die Marken bleiben `#vorher` und `#nachher`.


1. Erstellen-Blatt über dem Feed: oben ein Schalter. Im Kiez Challenge, Vorher-Nachher, Bild; in einer Gruppe Aufgabe, Vorher-Nachher. Der bisherige Schalter „Challenge/Bild“ ist durch diesen Schalter ersetzt, auch in `challenge/create/step-1` (dort nur Challenge und Bild).
2. Vorher: Foto, Überschrift (Pflicht), Erklärung mit fester Marke `#vorher`, höchstens 240 Zeichen. „Vorher speichern“ legt den Entwurf an (`start_before_after`) und öffnet den Timer.
3. Timer (Route `vorher-nachher/[id]`): Ring über 48 h, Uhr „0:00:00“, Vorher-Foto klein mit Uhrzeit. „Timer starten“ oder „Später starten“. Läuft er: „Nachher aufnehmen“ oder „Entwurf löschen“.
4. Nachher: Dauer bis jetzt, Nachher-Foto (Pflicht) mit Überschrift für beide, Erklärung mit `#nachher`, Vorschau „So steht der Text im Beitrag“. „Posten“ oder „Später weitermachen“ (speichert Foto und Text).
5. Feed: Läuft ein eigener Timer, steht oben „Du hast Dich selbst herausgefordert“ mit dem Vorher-Foto im Ring; Tippen führt zum Timer. Entwürfe ohne gestarteten Timer liegen in „Deine Challenges“, „Weiter bearbeiten“ führt zum Timer.
6. Karte: Vorher oben 1/3, Nachher 2/3. Tipp auf eine Hälfte vergrößert sie auf 5/6, die Karte wächst um 25 %, zweiter Tipp stellt zurück (Schranke). Dauer an der Naht. Kiez-Look: Glasleiste mit Titel unten, sie verschwindet, solange Vorher groß ist; Tipp auf die Leiste oder den Text öffnet den Beitrag, langes Drücken auch. Fashionable Look: Kopfzeile, 4:5, Text mit fettem Titel, darunter „vor 1 Std. · in 2 h 14 min geschafft“. Ohne Nachher-Foto (nach 48 h automatisch gepostet) zeigt die Karte nur das Vorher-Foto.
7. Detail: Galerie erst Vorher, dann Nachher, Badge „Vorher-Nachher“, Zeile „In 2 h 14 min geschafft“, Text mit hervorgehobenem `#vorher`/`#nachher`. Nach dem Posten nur Löschen, kein Bearbeiten oder Schließen.

## Betroffene Dateien

- Daten: `src/data/types.ts` (Typ `before_after`, `isPostOnly`, Felder), `src/data/remote.ts` (RPCs), `src/data/store.tsx` (`beforeAfter`, `runningBeforeAfter`, `beforeAfterBody`), `src/data/format.ts`, `src/data/features.ts`, `src/data/sample.ts` (Beispielbeitrag „Hinterhof aufgeräumt“).
- Oberfläche: `src/components/BeforeAfterPost.tsx`, `src/components/BeforeAfterTimer.tsx`, `src/components/WithMentions.tsx`, `src/components/compose/TypeSwitch.tsx`, `src/components/compose/BeforeAfterForm.tsx`, `src/components/compose/ComposeSheet.tsx`, `src/app/vorher-nachher/[id].tsx`, dazu Anpassungen in `feed.tsx`, `manage.tsx`, `challenge/[id]/index.tsx`, `Badges.tsx`, `ChallengePost.tsx`.

## Nächste Schritte

- Daria testet auf dem Handy (Expo Go): Foto aufnehmen, Timer im Hintergrund, Posten nach 48 h durch den Server.
- Texte ins Texte-CMS: `node scripts/app-texts.mjs > /tmp/app-texts.sql`, Inhalt im SQL-Editor ausführen. Optional, ohne gelten die Texte aus dem Code.
- Übersetzungen fehlen noch für die neuen Texte (`node scripts/i18n.mjs` listet sie). Bis dahin erscheint Deutsch.

## Offene Fragen an Daria

- Feedback zur gebauten Fassung.
- Sichtbarkeit während des Timers: Bisher ist der Beitrag bis zum Posten ein Entwurf, den nur die Ersteller:in sieht.
- Kopf des Erstellen-Blatts heißt weiter „Challenge erstellen“ bzw. „Aufgabe erstellen“, auch bei Vorher-Nachher und Bild. Passt das, oder soll er dem Schalter folgen?
