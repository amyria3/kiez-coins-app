# Umfrage: Kommentarfeld

- **Stand:** 26.10.2026
- **Gehört nach:** Documentation › `kiez-coins/app/Stand_App.md` (Umfrage) und Datenbank-Doku (`survey_answers.comment`, `survey_results`).
- **Arbeitsteilung:** Claude hat Kommentarfeld, Auswertung und Migration gebaut. Daria führt die Migration aus.

## Was neu ist

- Nach den fünf Fragen folgt ein freiwilliger Schritt „Möchtest Du uns noch etwas sagen?“ mit einem Textfeld (höchstens 1000 Zeichen). Der Fortschrittsbalken hat jetzt sechs Segmente.
- Eine schon abgegebene Antwort lädt auch den Kommentar vor.
- Dein Konto › Umfrage-Ergebnis zeigt unter den Zahlen alle Kommentare, neueste zuerst, ohne Namen.
- Code: `src/components/SurveyOverlay.tsx`, `src/app/account/umfrage/ergebnis.tsx`, `src/data/survey.ts`, `src/data/remote.ts`.

## Datenbank

- Migration `supabase/migrations/20261026000100_survey_comment.sql`: Spalte `survey_answers.comment`, `survey_results()` liefert zusätzlich `comments`.
- Pflichtaufgabe vor dem Merge: Migration im Supabase-SQL-Editor ausführen. Ohne die Spalte lädt die App keine Antwort und speichert keine neue.
