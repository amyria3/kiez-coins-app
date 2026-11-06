# Titel bei „Nur ein Bild“ optional

- Datum: 2026-11-06
- Status: Notiz für die Doku
- Gehört nach: Documentation, `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Challenges“ bzw. „Bild-Posts“) und die Datenbank-Doku

Pflichtaufgabe: Migration `supabase/migrations/20261106000100_titel_optional_bild.sql` in Supabase ausführen.

## Entscheidung (Daria, 06.11.2026)

- Bei „Nur ein Bild“ (Kiez, privat und in der Gruppe) ist der Titel freiwillig. Das Feld zeigt „Titel (optional)“.
- Ein leerer Titel wird überall ausgeblendet: Detailansicht, Vorschau, Feed-Karte, Melden-Seite, Teilen-Text und öffentliche Teilen-Seite.
- Challenges, Gruppenaufgaben und Vorher-Nachher brauchen weiter einen Titel.
- In der Vollbild-Bildansicht blendet ein Tipp aufs Foto Zurück, Teilen, Blatt, Leiste, Punkte und Statusleiste aus. Nochmal tippen zeigt sie wieder. Ausgeklappt klappt ein Tipp aufs Foto wie bisher zu.

## Datenbank

- `challenges_title_check`: leerer Titel auch bei `type = 'photo'` erlaubt (bisher nur im Entwurf).
- `publish_challenge`: Die Prüfung „Bitte gib einen Titel ein.“ gilt nicht mehr für Bilder.
