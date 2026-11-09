# Hinweise vor Fragen, wie im Chat

**Stand 2026-11-09, offen bis zur Übernahme in Documentation.** Ziel: `kiez-coins/design/Designsystem.md`, Abschnitt zu Kater-Karte, Hinweis (Notice) und Frage (QuestionHint).

Daria hat am 2026-11-09 entschieden:

- Ein Screen mit Kater-Karte, Hinweisen und Fragen liest sich wie ein Chat.
- Reihenfolge: erst der Start (Kater-Karte oder Einleitung), direkt danach die Hinweise, die immer dastehen. Danach die Fragen. Die Antwort erscheint unter ihrer Frage.
- Ein Hinweis hängt nicht mehr an der Antwort einer Frage.

## Code

- `src/app/account/pause/index.tsx`: Hinweis „Offene Challenges und Coins …“ steht zwischen Kater-Karte und Frage.
- `src/app/account/data-access.tsx`: Hinweis „Protokoll nicht geladen“ steht vor der Frage.
- `src/app/challenge/[id]/index.tsx`: „Alle Plätze sind vergeben.“ steht vor den Fragen, wie die übrigen Hinweise.
- `account/delete` hatte die Reihenfolge schon.

## Nächster Schritt

Inhalt ins Designsystem übernehmen und diese Datei löschen.
