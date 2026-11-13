# Aufgaben: Erledigt, Aufgeben, Abbrechen. Schaufenster weiterposten. Tutorial

Pflichtaufgabe: Migration `supabase/migrations/20261113000400_erinnerung_ausgang.sql` im Supabase SQL Editor einspielen (nach `20261110000100_erinnerungen`). Ohne sie enden Erinnerungen weiter, aber „aufgegeben“ und „abgebrochen“ werden nicht gezählt.

- Datum: 2026-11-13
- Status: offen, bis die Migration eingespielt ist. Code im PR „Aufgaben-Knöpfe, Schaufenster weiterposten, Tutorial“.
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitte „Routine“, „Teilen“, „Tutorial“) und die Datenbank-Doku (Tabelle `reminders`, neue Spalte `ended_as`).

## Entscheidungen (Daria, 2026-11-13)

- Aufgaben-Karten in der Routine haben zwei Knöpfe: „Erledigt“ und „Aufgeben“ (Englisch „Done“ und „Give up“). Vorher „Beenden“ und „Erledigt“.
- Drei Punkte auf der Karte öffnen ein Menü mit „Das hier abbrechen“ („Cancel this“).
- Wischen nach rechts ist erledigt, nach links abbrechen.
- Alle drei Stati zählen: erledigt, aufgegeben, abgebrochen.
- Schaufenster-Posts lassen sich weiterposten.
- Tutorial: neue Seiten zu Kalender (Routine) und Schaufenster. Am Schluss, vor der Frage zur Erklärung, eine Seite mit Schaltern für „Bilder und Textposts“ und „Routine“. Beide sind an und lassen sich dort ausschalten. Dazu der Hinweis auf Dein Konto › Meine Features.

## So ist es gebaut

- `reminders.ended_as`: `given_up` oder `cancelled`, gesetzt zusammen mit `archived_at` (`archiveReminder` in `src/data/reminders.ts`). Erledigt steht wie bisher in `reminder_done`. Fehlt die Spalte, speichert die App nur `archived_at`.
- Kalender der Routine: unter dem Monat steht „x aufgegeben · y abgebrochen“, sobald es im Monat eins davon gibt. Die Zeile unter dem Kalender nennt die Aufgabe am Tag mit „(aufgegeben)“ oder „(abgebrochen)“.
- Aufgeben und Abbrechen fragen nach, bevor die Aufgabe verschwindet.
- Wischen geht nur, wenn die Gruppe eine einzige Karte hat. Bei mehreren Karten blättert seitliches Wischen durch die Karten (Daria, 2026-11-12). Das Menü und die Knöpfe gehen immer.
- Termin-Karten behalten „Beenden“ und „Erledigt“. „Beenden“ zählt als abgebrochen.
- Look „Fashionable“ (Liste): Links „Aufgeben“ und „Das hier abbrechen“ statt „Beenden“.
- Schaufenster: Posts über das Erstellen-Blatt gingen schon weiter. Neu ist das Formular `schaufenster/[id]/post` (Knopf „Post erstellen“ in der Schaufenster-Übersicht): Es zeigt die Karte „Weiterposten“ und postet nach dem Veröffentlichen weiter. Keine Änderung an der Edge Function.
- Tutorial, Seite zur Routine: Die Karte lässt sich dort wischen (nach rechts erledigt, nach links abbrechen), Hinweis und Text nennen es (Daria, 2026-11-13). Solange der Finger auf der Karte liegt, blättert die Tour nicht.
- Die Migration heißt `20261113000400`, weil main die Nummer `000200` am selben Tag auch für Weiterposten vergeben hat.
- Tutorial: Seiten `kalender`, `schaufenster`, `funktionen` in `src/data/tour.ts`, Beispiele in `src/components/tour/TourDemo.tsx`. Kalender und Schaufenster erscheinen nur, wenn die Features `routine` und `schaufenster` freigeschaltet sind. Die Seite mit den Schaltern erscheint nur mit Konto.

## Offene Fragen an Daria

- „Kalender“ im Tutorial ist als Routine gelesen, weil es seit 2026-11-13 keinen Schalter für den ganzen Kalender mehr gibt. Der Schalter heißt wie unter Meine Features „Routine“.
- Soll Wischen auch bei mehreren Karten gehen? Dann müssten die Karten untereinander stehen oder das Blättern anders laufen.
- Titel und Texte der drei neuen Tutorial-Seiten sind von Claude.

## Betroffene Dateien

`src/components/RoutineList.tsx`, `src/components/RoutineContent.tsx`, `src/components/ShowcaseManage.tsx`, `src/data/reminders.ts`, `src/app/schaufenster/[id]/post.tsx`, `src/app/tour.tsx`, `src/data/tour.ts`, `src/components/tour/TourDemo.tsx`, `src/i18n/en.json`, `supabase/migrations/20261113000400_erinnerung_ausgang.sql`
