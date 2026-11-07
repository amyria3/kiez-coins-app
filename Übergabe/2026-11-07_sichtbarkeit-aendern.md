# Sichtbarkeit nachträglich ändern, Eingaben im Erstellen-Blatt behalten

Datum: 2026-11-07 · Status: erledigt (PR #204) · Gehört in Documentation: Datenbank-Doku (Funktionen) und `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“.

Pflichtaufgabe: Migration `supabase/migrations/20261107000300_sichtbarkeit_aendern.sql` muss in Supabase laufen.

## Entscheidungen (Daria, 07.11.2026)

- Im Erstellen-Blatt über dem Feed bleiben beim Wechsel zwischen Privat, Kiez, Überall und Gruppen alle Eingaben erhalten: Foto, Titel, Text, Blätter eines Text-Posts, Schrift, Zusatzfotos, Text auf dem Foto und die gewählte Art. Privat ohne We-Challenge zeigt „Bild“; zurück im Kiez ist die We-Challenge wieder gewählt.
- In „Text bearbeiten“ und „Challenge bearbeiten“ lässt sich die Sichtbarkeit ändern: Privat, Kiez oder Überall. Privat nur bei Bild, Text und Me-Challenge ohne Coins und ohne Gruppe. Bei Privat entfällt das Feld „Ort“.

## Datenbank

`public.set_challenge_audience(p_challenge_id uuid, p_private boolean, p_local_only boolean)`, security definer.
Setzt `visibility` ('private' oder 'public') und `local_only` (bei Privat immer false). Nur die Ersteller:in, nur ohne Gruppe, nur ohne `assignee_id`. Gilt für jeden Status, auch Archiv und Entwurf. Der Check `challenges_visibility` verhindert Privat bei We-Challenges und Coins.

## Code

- `src/components/compose/compose.ts`: `useComposeSheetContent`
- `src/components/compose/ComposeSheet.tsx`, `PublicComposeForm.tsx`, `GroupPhotoForm.tsx`
- `src/app/challenge/[id]/edit.tsx`: Schalter Privat / Kiez / Überall
- `src/data/store.tsx`: Aktion `setAudience`; `src/data/remote.ts`: `challengeActions.setAudience`
