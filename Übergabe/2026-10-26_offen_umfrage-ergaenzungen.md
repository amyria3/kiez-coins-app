# Umfrage: zwei neue Fragen und Kommentarfeld

- **Stand:** 26.10.2026
- **Gehört nach:** Documentation › `kiez-coins/app/Stand_App.md` (Umfrage) und Datenbank-Doku (`survey_answers`, `survey_results`).
- **Arbeitsteilung:** Claude hat Frage, Kommentarfeld, Auswertung und Migration gebaut. Daria führt die Migration aus.

## Was neu ist

- Neue Frage 1 „Wie oft würdest Du die App nutzen?“ (Oft, vielleicht sogar täglich / Gelegentlich / Eher ausnahmsweise), Einfachauswahl. 
- Neue letzte Frage 7 „Wieso hast Du die App getestet?“ (Klingt mega spannend / Neugierde / Wollte nur nett sein) mit Feld für eine eigene Antwort. Auswahl oder eigene Antwort genügt.
- Alle Antwortlisten stehen von „top“ zu „flop“ (Vorgabe Daria).
- Nach den sieben Fragen folgt ein freiwilliger Schritt „Möchtest Du uns noch etwas sagen?“ mit einem Textfeld (höchstens 1000 Zeichen).
- Wer vor dem 26.10.2026 geantwortet hat, bekommt die Umfrage im Feed noch einmal, sofern er oder sie sie auf dem Gerät nicht mit „Nicht wieder fragen“ oder durch das Absenden abgeschlossen hat. Über Dein Konto › Umfrage lässt sie sich jederzeit ergänzen; die alten Antworten sind vorbelegt.
- Frage „Was denkst Du über diese App?“: Antworten neu sortiert (Gute Idee, Weiß noch nicht, „Nicht noch eine App!“).
- Dein Konto › Umfrage-Ergebnis zählt die neue Frage nur über die Antworten, die sie enthalten, und zeigt unter den Zahlen die eigenen Antworten zu Frage 7 und alle Kommentare, neueste zuerst, ohne Namen.
- Code: `src/data/survey.ts`, `src/components/SurveyOverlay.tsx`, `src/app/account/umfrage/ergebnis.tsx`, `src/data/remote.ts`.

## Datenbank

- Migration `supabase/migrations/20261026000100_survey_frequency_comment.sql`: Spalten `frequency`, `reason`, `reason_other` und `comment` in `survey_answers`; `survey_results()` liefert zusätzlich `frequency`, `reason`, `reason_other` und `comments`.
- Pflichtaufgabe vor dem Merge: Migration im Supabase-SQL-Editor ausführen. Ohne die Spalten lädt die App keine Antwort und speichert keine neue.
