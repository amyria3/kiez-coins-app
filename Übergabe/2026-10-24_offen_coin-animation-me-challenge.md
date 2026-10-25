# Coin-Animation bei der Me-Challenge

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/konzept/` (Vorher-Nachher) und `kiez-coins/design/Designsystem.md` (Bewegungen)

## Idee von Daria

Die Me-Challenge bringt keine Coins. Eine Coin-Animation beim Abschluss stellt trotzdem die Verbindung zum Namen der App her.

## Vorschlag aus dem Gespräch, noch nicht entschieden

- Die Person postet das Nachher-Foto. Dann fallen Coins ins Bild und zählen in einem Zähler hoch, z. B. „+1 Kiez-Tat“.
- Der Zähler hat einen eigenen Namen, da sonst die Erwartung entsteht, die Person habe Coins verdient.
- Bei der ersten We-Challenge verwandelt eine Animation die gesammelten Zähler-Coins in echte Coins (nur Bild, kein Guthaben).

## Offene Fragen an Daria

- Name des Zählers.
- Erscheint die Animation nur beim Abschluss oder auch beim Vorher-Foto?
- Zählt der Zähler sichtbar im Profil („Was Du so machst“)?
- Animation selbst bauen (React Native `Animated`, wie `GearsLoader.tsx`) oder aus Figma übernehmen?

## Betroffene Dateien

- Abschluss der Me-Challenge: `finishBeforeAfter` in `src/data/store.tsx` (um Zeile 683) und Bildschirm `src/app/vorher-nachher/[id].tsx`.
- Coin-Grafik: Phosphor `coins` (`PH.coins`) oder Darias Coin aus `src/components/icons/Brand.tsx`.
- Bewegungen: `motion` in `src/theme/tokens.ts`.

## Entscheidung (Daria, 25.10.2026)

- Text beim Abschluss: „1 gute Tat für den Kiez!“
- Die Animation kommt später.
