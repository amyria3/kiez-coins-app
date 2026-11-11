# Operationsname ausgeblendet

- Datum: 2026-11-11
- Status: erledigt, Notiz für die Doku
- Gehört nach: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“, und in die Beschreibung des Challenge-Details

## Entscheidung

Daria, 2026-11-11: Das Taufen einer angenommenen Challenge („Operationsname“) ist verwirrend und wird in der App nicht mehr gezeigt. Spalte und gespeicherte Namen bleiben in der Datenbank.

## Umsetzung

- PR #324: Hinweis „Vorschlag von Cat The Käptn …“ unter dem Namensfeld entfernt, in allen Sprachen.
- PR #325: Schalter `OPERATIONSNAME_ZEIGEN = false` in `src/data/types.ts`. Damit sind aus:
  - Kater-Frage „Taufen wir das Baby, Baby?“, Namensfeld und Button „Namen geben“ im Challenge-Detail. Dort steht jetzt gleich „Wie geht es jetzt weiter?“.
  - Namens-Tag auf dem Foto (`OperationTag`).
  - Operationsname als Titel in der Reise (`src/data/reise.ts`) und im Archiv (`src/app/manage.tsx`).
- Wieder zeigen: Schalter auf `true` setzen.
