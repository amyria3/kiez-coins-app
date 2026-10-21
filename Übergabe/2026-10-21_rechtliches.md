# Rechtstexte und Löschen für den Testbetrieb

Stand: 21.10.2026

Gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Recht und Datenschutz“, neu), Migration in die Migrations-Liste der Datenbank-Doku, offene Angaben nach `kiez-coins/app/Stand_App.md` (Launch-Schritte).

## Was sich geändert hat

- Neue Route `rechtliches/[doc]` mit Impressum, Datenschutzerklärung und Nutzungsbedingungen für die Testphase. Die Texte stehen in `src/data/legal.ts`, das Datum in `LEGAL_STAND`.
- Verlinkt auf `onboarding/welcome` (Fußzeile, ohne Anmeldung erreichbar), in `onboarding/kodex` („Bedingungen lesen“, „Datenschutz lesen“) und unter „Dein Konto“ › „Rechtliches“.
- `onboarding/kodex` heißt jetzt „Nutzungsbedingungen für die Testphase“ statt „AGB“ und zeigt einen Hinweis zum Testbetrieb.
- „Konto löschen“ entfernt jetzt auch die Fotos im Storage-Ordner der Person. Vorher blieben sie liegen, weil Storage-Dateien nicht an den Fremdschlüsseln hängen.

## Migration

`supabase/migrations/20261021000500_own_photos_select.sql`: Leserecht auf den eigenen Foto-Ordner. Storage braucht es für `list()` und `remove()`. Ohne die Migration löscht „Konto löschen“ die Fotos nicht, meldet aber keinen Fehler.

Die Foto-Migration ist ausgeführt (21.10.2026).

## Angaben in `OPERATOR` (`src/data/legal.ts`), Stand 21.10.2026

- E-Mail-Adresse und Aufsichtsbehörde (Sachsen) sind eingetragen.
- Anschrift: Im Testbetrieb steht keine im Impressum, sie gibt es auf Anfrage per E-Mail (PR #19, gemergt). Eine c/o-Adresse kommt, wenn Kiez Coins öffentlich ist und ein Finanzierungskonzept steht.
- Telefonnummer oder Kontaktformular als zweiter schneller Kontaktweg: offen.
- Daria überarbeitet Kodex und Rechtstexte.

## Außerhalb des Codes

- Auftragsverarbeitungsvertrag mit Supabase (im Dashboard unter Legal) unterschreiben. Brevo ist erledigt (über die Brevo-AGB, 21.10.2026).
- Postfach der angegebenen E-Mail-Adresse einrichten.
- Prüfen, ob Supabase-Projekt und Brevo-Konto auf Maria Arkadieff laufen.
