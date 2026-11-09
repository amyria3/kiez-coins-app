-- Aufrufe wurden nie gezählt (Daria, 08.11.2026: „0 mal gesehen aber 3 Likes?“).
-- Die App zählt mit `upsert(..., { ignoreDuplicates: true })`, also INSERT ... ON CONFLICT DO NOTHING.
-- Postgres verlangt dafür, dass die schreibende Person die Zeile auch lesen darf. Bisher durfte nur,
-- wer die Challenge erstellt hat, die Aufrufe lesen. Darum scheiterte jeder Aufruf an der RLS.
-- Neu: Jede Person liest ihre eigenen Aufrufe. Fremde Aufrufe bleiben verborgen.

create policy "Eigene Aufrufe lesen" on public.challenge_views for select to authenticated
  using (user_id = (select auth.uid()));
