# Leere Reiter einheitlich mit Cat The Käptn

Datum: 2026-10-29 · Status: umgesetzt, PR #121 gemergt (29.10.2026); noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/design/UX_UI_Regeln.md` (leere Zustände), `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Feed“)

## Entscheidung von Daria (29.10.2026)

Alle vier Reiter sehen leer aus wie bisher „Kiez“ und „Überall“: Kater mittig, Titel „Cat The Käptn wartet“, ein Satz, Knopf.

| Reiter | Satz | Knopf |
| --- | --- | --- |
| Privat | Poste Deine erste Me-Challenge | Posten |
| Gruppe ohne Gruppe | Erstelle Deine erste Gruppe | Gruppe gründen, darunter „Mit Beitrittscode beitreten“ |
| Gruppe ohne Aufgaben | Poste die erste Challenge in Deiner Gruppe | Posten |
| Kiez, Überall | Poste als Erste:r | Posten |

## Umsetzung

- `src/components/FeedStateMessage.tsx`: Satz und Knopf lassen sich ersetzen, optional ein zweiter Knopf.
- `src/app/feed.tsx`: Privat und Gruppe nutzen `FeedStateMessage` statt der Sprechblase (`GroupsEmpty`). „Posten“ öffnet das Erstellen-Blatt des Reiters.
- „Poste als Erste:r“ nach Ansprache: „Poste als Erster“ / „Poste als Erste“ (`src/i18n/de.er.json`, `de.sie.json`).
- Übersetzungen von Claude, ungeprüft (en, fr, uk, ru, he, ar, je mit Fassungen nach Geschlecht).

## Offene Punkte

- „Was Du so machst“, das Profil im Fashionable-Look und das Erstellen-Blatt ohne Gruppe zeigen weiter die Sprechblase.
