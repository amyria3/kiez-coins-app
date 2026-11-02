# Aufrufe eigener Posts im Feed

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“ oder „Feed“; Datenbank-Doku zu `challenge_views` (Zählweise ergänzen)

## Daria hat entschieden

- Daria sieht an ihren eigenen Posts, wie viele Personen sie gesehen haben.

## Umsetzung

- Ein Post zählt als gesehen, wenn mindestens die Hälfte der Karte eine Sekunde lang im Feed steht oder die Person die Challenge öffnet. Jede Person zählt pro Post einmal, eigene Posts zählen nicht.
- Die Zahl steht nur an eigenen Posts: Auge mit Zahl in Grau rechts neben „Teilen“, in beiden Looks und beim Vorher-Nachher-Post. Kein Knopf.
- Keine Migration nötig: Die Tabelle `challenge_views` (Migration `20261020000500_challenge_views.sql`) und ihre RLS gelten unverändert.
- Dateien: `src/data/seen.ts` (Zählung im Feed, gebündelt alle 3 Sekunden), `src/components/ViewCount.tsx`, `src/app/feed.tsx`, `src/components/ChallengePost.tsx`, `src/components/BeforeAfterPost.tsx`, `recordViews` in `src/data/remote.ts`.
- Grenze: `loadViewCounts` lädt höchstens 10 000 Zeilen. Wächst der Feed darüber hinaus, braucht es eine Datenbankfunktion, die pro Post zählt (wie `like_counts`).
