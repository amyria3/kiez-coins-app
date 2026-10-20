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

## Offene Angaben (Daria trägt sie in `OPERATOR` in `src/data/legal.ts` ein)

- Straße und Hausnummer, PLZ und Ort (ladungsfähige Anschrift, kein Postfach)
- E-Mail-Adresse für Impressum, Datenschutz und Meldungen
- Telefonnummer
- Zuständige Datenschutz-Aufsichtsbehörde

## Außerhalb des Codes

- Auftragsverarbeitungsvertrag mit Supabase (im Dashboard unter Legal) und Brevo (Konto › Sicherheit) abschließen.
- Postfach der angegebenen E-Mail-Adresse einrichten.
- Prüfen, ob Supabase-Projekt und Brevo-Konto auf Maria Arkadieff laufen.
