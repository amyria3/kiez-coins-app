# Nutzungsbedingungen: Coins und Edensteine; Fotofeld beim Erstellen kleiner

Datum: 2026-10-30 · Status: umgesetzt, PR #103 und #79 gemergt (30.10.2026); noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitte „Rechtstexte“ und „Erstellen“), Rechtstexte-Doku

## PR #103: Coins als Versprechen von realem Geld, Edensteine ideell

- Nutzungsbedingungen, Abschnitt 4 (`src/data/legal.ts`): „Coins sind Versprechen von realem Geld. Das Konzept befindet sich in der Testphase. …“ statt „Coins sind eine freiwillige Anerkennung zwischen zwei Personen. …“. Neu: „Edensteine sind eine ideelle Anerkennung. Sie lassen sich weder kaufen noch in Geld tauschen.“ Übersetzungen in `src/i18n`.
- `LEGAL_STAND` jetzt 30.10.2026 (vorher 27.10.2026), da sich Inhalte geändert haben. Der Stand erscheint nur als Zeile über den Texten; eine erneute Zustimmung fordert die App nicht an.
- Migration `20261030000100_app_texts_coins_geld.sql` (optional): trägt die zwei Sätze mit Ort in den Texte-Editor ein. Ursprünglich `20261028000300`, umbenannt, da die Nummer schon vergeben war. Seit PR #122 findet der Editor die Texte auch ohne sie.

## PR #79: Fotofeld beim Erstellen kleiner

- `PhotoPicker` (`src/components/Form.tsx`): Ohne Foto ist die gestrichelte Fläche mit Titel so hoch wie ihr Inhalt, 24 px Abstand oben, 48 px vom Hinweis zum Titelfeld. Mit Foto bleibt sie 300 px hoch. Beide Looks.
