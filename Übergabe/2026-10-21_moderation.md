# Blockieren, Melden, Profil und Community-Regeln

Stand: 21.10.2026. Umgesetzt in Branch `claude/project-thread-svuml9`.

- **Gehört nach:** Datenbank-Doku in Documentation (Liste der Migrationen, neue Tabellen `blocks`, `challenge_reports`, `praises`, `moderators`, Funktionen `is_moderator`, `is_blocked_between`, `praise_count`) und `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Moderation“.
- **Wer:** Daria spielt die Migration nach dem Test ein. Claude hat sie lokal gegen alle bisherigen Migrationen geprüft.

## Die App kann jetzt blockieren, melden und loben

- **Profil anderer Personen** (`user/[id]`): Tippen auf die AuthorRow im Detail einer Challenge oder auf Bild und Name eines Kommentars öffnet es. Es zeigt Foto, Deckname, Kiez und die Zahl der Lobe. Dort stehen „Lob zollen“, „Person melden“, „Person blockieren“ und die Community-Regeln.
- **Blockieren:** Die blockierende Person sieht Challenges und Kommentare der blockierten Person nicht mehr. Die blockierte Person kann Challenges der blockierenden Person weder annehmen noch kommentieren und erfährt nichts davon. Die Datenbank prüft das per Trigger in beide Richtungen. Aufheben unter „Dein Konto“ → „Blockierte Personen“.
- **Challenge melden** (`challenge/[id]/flag`): Fahne oben rechts im Detail fremder Challenges. Gründe: Diskriminierung, Belästigung, Gewalt, gefährliche Aufgabe, rechtswidrig, Spam, anderes.
- **Person melden:** neue Gründe Diskriminierung, Belästigung, Gewalt. Der alte Grund `abusive` bleibt in der Datenbank erlaubt, die App bietet ihn nicht mehr an.
- **Moderation** (`moderation`): Erscheint unter „Dein Konto“ nur für Personen in der Tabelle `moderators`. Zeigt alle Meldungen, setzt den Status auf bestätigt oder verworfen. Sperren und Löschen laufen weiter im Supabase-Dashboard.
- **Community-Regeln** (`rechtliches/regeln`, Text in `src/data/legal.ts`): gegen Sexismus, Rassismus, Antisemitismus und jede Diskriminierung, Belästigung, Gewalt, Täuschung. Neuer vierter Schalter im Kodex. Nutzungsbedingungen, Datenschutz und Impressum verweisen darauf. Die Download-Seite hat die Seite `community-regeln.html`.

## So spielst Du die Migration ein

1. Öffne im Supabase-Projekt den SQL-Editor.
2. Kopiere `supabase/migrations/20261021000700_moderation.sql` in eine neue Abfrage und klicke auf „Run“.
3. Trag Dich als Moderatorin ein. Deine Konto-ID steht unter „Authentication“ → „Users“:
   `insert into public.moderators (user_id) values ('<Deine Konto-ID>');`
4. Optional: `supabase/tests/moderation.sql` ausführen. Jede Zeile beginnt mit „ok“ oder zeigt den erwarteten Wert.

**Bis sie läuft:** Profil, Blockierte Personen und Kodex funktionieren. Lob blendet sich aus. Blockieren, Challenge melden und die neuen Meldegründe melden einen Fehler.

## Offene Punkte

- Push oder E-Mail an Daria bei neuer Meldung (zum Beispiel per Database Webhook und Edge Function).
- Moderation in der App: Challenge entfernen und Konto sperren direkt aus der Liste.
- Fahne an Beiträgen im Feed und Profil-Link aus dem Feed.
