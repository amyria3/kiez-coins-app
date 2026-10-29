# Hinweis „Wer sieht, was Du postest“ überall unter dem Umschalter

Datum: 2026-10-29 · Status: umgesetzt (PR, siehe Commit); noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/design/UX_UI_Regeln.md` (Hinweis unter dem Umschalter)

## Entscheidung von Daria (29.10.2026)

Der Hinweis unter dem Umschalter Privat / Gruppe / Kiez / Überall erscheint einheitlich.

## Umsetzung

- Feed (`src/app/feed.tsx`): jetzt auch im Reiter „Gruppe“ ohne Gruppe.
- „Was Du so machst“ (`src/app/reise.tsx`) und Profil im Fashionable-Look (`src/components/FashionProfile.tsx`): derselbe Hinweis unter dem Umschalter.
- Das Kreuz blendet den Hinweis je Reiter dauerhaft auf diesem Gerät aus, für Feed und „Was Du so machst“ gemeinsam (`AudienceHint`).
