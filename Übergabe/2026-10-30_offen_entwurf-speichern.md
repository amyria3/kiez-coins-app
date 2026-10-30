# Entwurf speichern schlug fehl

Datum: 2026-10-30 · Status: offen, bis die Migration eingespielt ist · Ziel in Documentation: Datenbank-Doku (Rechte auf `challenges`)

## Fehler (Daria, 30.10.2026)

Daria wollte einen Entwurf speichern und bekam einen Fehler.

## Ursache

`saveDraft` in `src/data/remote.ts` schickt seit den Edensteinen im Kiez (28.10.2026) immer die Spalte `edensteine` mit. Für vorhandene Entwürfe ist das ein Update. Das Recht zum Ändern fehlte für diese Spalte, denn `challenges` erlaubt Updates nur spaltenweise (`20261019000200_rls.sql`). Postgres lehnt dann das ganze Update ab (Code 42501). Die App zeigt „Das darfst Du gerade nicht. Hast Du schon Deinen Kiez festgelegt?“.

Betroffen sind:

- ein Entwurf, der schon gespeichert ist, ein zweites Mal speichern,
- einen gespeicherten Entwurf veröffentlichen, da `publishDraft` ihn vorher speichert.

Das erste Speichern eines neuen Entwurfs ist ein Insert und funktioniert.

## Lösung

Migration `20261030000200_entwurf_edensteine.sql`: `grant update (edensteine)`. Die Policy „Eigenen Entwurf bearbeiten“ erlaubt Änderungen weiter nur an eigenen Entwürfen. Die Regel `challenges_group_reward` prüft die Werte.

## Offene Punkte

- [ ] Migration in Supabase einspielen.
- [ ] Danach einen Entwurf zweimal speichern und veröffentlichen.
