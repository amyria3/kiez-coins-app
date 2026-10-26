# Umfrage: Frage zur Nutzung und Kommentarfeld

- **Stand:** 26.10.2026
- **Gehört nach:** Documentation › `kiez-coins/app/Stand_App.md` (Umfrage) und Datenbank-Doku (`survey_answers.frequency`, `survey_answers.comment`, `survey_results`).
- **Arbeitsteilung:** Claude hat Frage, Kommentarfeld, Auswertung und Migration gebaut. Daria führt die Migration aus.

## Was neu ist

- Neue Frage 1 „Wie oft würdest Du die App nutzen?“ (Oft, vielleicht sogar täglich / Gelegentlich / Eher ausnahmsweise), Einfachauswahl. Die Umfrage hat jetzt sechs Fragen.
- Nach den sechs Fragen folgt ein freiwilliger Schritt „Möchtest Du uns noch etwas sagen?“ mit einem Textfeld (höchstens 1000 Zeichen).
- Wer vor dem 26.10.2026 geantwortet hat, bekommt die Umfrage im Feed noch einmal, sofern er oder sie sie auf dem Gerät nicht mit „Nicht wieder fragen“ oder durch das Absenden abgeschlossen hat. Über Dein Konto › Umfrage lässt sie sich jederzeit ergänzen; die alten Antworten sind vorbelegt.
- Frage „Was denkst Du über diese App?“: Antworten neu sortiert (Gute Idee, Weiß noch nicht, „Nicht noch eine App!“).
- Dein Konto › Umfrage-Ergebnis zählt die neue Frage nur über die Antworten, die sie enthalten, und zeigt unter den Zahlen alle Kommentare, neueste zuerst, ohne Namen.
- Code: `src/data/survey.ts`, `src/components/SurveyOverlay.tsx`, `src/app/account/umfrage/ergebnis.tsx`, `src/data/remote.ts`.

## Datenbank

- Migration `supabase/migrations/20261026000100_survey_frequency_comment.sql`: Spalten `survey_answers.frequency` und `survey_answers.comment`, `survey_results()` liefert zusätzlich `frequency` und `comments`.
- Pflichtaufgabe vor dem Merge: Migration im Supabase-SQL-Editor ausführen. Ohne die Spalten lädt die App keine Antwort und speichert keine neue.
