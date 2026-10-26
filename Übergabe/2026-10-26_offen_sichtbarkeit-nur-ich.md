# Sichtbarkeit „Nur ich“ beim Posten

- Datum: 2026-10-26
- Status: offen, To-do von Daria
- Gehört in Documentation: `kiez-coins/app/Offene_Punkte.md`, nach der Umsetzung `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“

## To-do (Daria, 26.10.2026)

„Wir brauchen die Option ‚Nur ich‘ kann es sehen (Nicht ‚Entwurf‘)“

Beim Posten (Challenge, Bild, Vorher-Nachher) wählt die Person die Sichtbarkeit „Nur ich“. Der Beitrag ist veröffentlicht, aber nur für die Ersteller:in sichtbar. Das ist etwas anderes als ein Entwurf: Ein Entwurf ist unfertig (Titel, Ort und Frist dürfen fehlen), ein „Nur ich“-Beitrag ist fertig und gepostet.

Verwandt: `2026-10-26_offen_kiez-ausschalten.md` (Kiez ganz ausschalten, Modus „Erstmal nur ich“). Am besten zusammen umsetzen.

## Stand

Noch nichts umgesetzt. Heute sieht nur die Ersteller:in einen Beitrag, wenn er ein Entwurf (`status = 'draft'`) oder gelöscht (`status = 'deleted'`) ist. Die Lese-Policy steht zuletzt in `supabase/migrations/20261021000200_soft_delete_challenge.sql`:

```sql
alter policy "Challenges lesen" on public.challenges
  using (
    (status not in ('draft', 'deleted') or author_id = (select auth.uid()))
    and (group_id is null or (select public.is_group_member(group_id)))
  );
```

Die Sichtbarkeit ergibt sich bisher nur aus dem Ort: Kiez (`group_id is null`) oder Gruppe (`group_id`).

## Offene Fragen an Daria

- Für welche Beiträge gilt „Nur ich“: alle Typen oder nur Bilder und Me-Challenges? Eine We-Challenge braucht andere, die sie annehmen.
- Wo steht die Auswahl im Erstellen-Blatt (`src/components/compose/ComposeSheet.tsx`): als dritte Wahl neben Kiez und Gruppe oder als eigener Schalter?
- Kann die Person die Sichtbarkeit nachträglich ändern (zum Beispiel von „Nur ich“ auf Kiez)?
- Zählen „Nur ich“-Beiträge für Coins, Bestenliste und Lob?

## Vorschlag

Eine eigene Spalte statt eines neuen Status, damit „Nur ich“ unabhängig vom Ablauf (offen, angenommen, bestätigt) bleibt:

```sql
alter table public.challenges
  add column visibility text not null default 'public'
  check (visibility in ('public', 'private'));

alter policy "Challenges lesen" on public.challenges
  using (
    (status not in ('draft', 'deleted') or author_id = (select auth.uid()))
    and (visibility = 'public' or author_id = (select auth.uid()))
    and (group_id is null or (select public.is_group_member(group_id)))
  );
```

Dazu prüfen: RPCs mit `security definer` (zum Beispiel `accept_challenge`, Like-Zähler, Bestenliste), die an der Policy vorbei lesen.

## Nächste Schritte

- Daria beantwortet die offenen Fragen.
- Migration schreiben, Erstellen-Blatt und Kartenansicht erweitern (Kennzeichen „Nur ich“ auf der Karte).
