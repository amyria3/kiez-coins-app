# Titelbild für Gruppen

- Datum: 2026-10-24
- Status: offen, teilweise entschieden (25.10.2026: alle Mitglieder dürfen das Bild ändern)
- Ziel in Documentation: `kiez-coins/KONZEPT.md` bzw. Feature „Groups“, sobald entschieden

## Stand

Daria will, dass Gruppen ein Titelbild haben können. Die Gruppenkarte (`src/components/GroupCard.tsx`) ist dafür schon höher (32 pt Innenabstand oben und unten). Ein Tipp auf Name und Zeile öffnet den Feed der Gruppe.

## Nächster Schritt

- Spalte für das Bild in der Gruppen-Tabelle (Migration in `supabase/migrations`, Speicherort im Storage wie bei Challenge-Fotos) und Datenbank-Doku aktualisieren.
- Bild beim Gründen und unter „Verwalten“ wählbar machen (`PhotoPicker` aus `src/components/Form.tsx`).
- Karte zeigt das Bild als Hintergrund der oberen Fläche, Name und Zeile darauf.

## Offene Fragen an Daria

- Ohne Bild: Fläche wie jetzt oder ein Standardbild?

## Entscheidung (Daria, 25.10.2026)

- Jedes Mitglied der Gruppe darf das Titelbild ändern.
- Noch offen: Was zeigt die Karte ohne Bild?
