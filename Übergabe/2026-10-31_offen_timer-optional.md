# Timer der Me-Challenge optional, Reihenfolge der Beitragsarten

- Datum: 2026-10-31
- Status: offen (Funktion steht, Layout fehlt)
- Ziel in Documentation: `kiez-coins/vorher-nachher/` (Datei zur Me-Challenge), Reihenfolge in `kiez-coins/ENTSCHEIDUNGEN.md`

## Daria hat entschieden

- Reihenfolge der Beitragsarten überall: Bild, Me-Challenge, We-Challenge (privat: Bild, Me-Challenge). Gilt im Erstellen-Blatt der App (`src/components/compose/ComposeSheet.tsx`) und im Prototyp auf der Website (`scripts/site/prototyp.js`, `scripts/build-download-site.mjs`). Die vorausgewählte Art bleibt: We-Challenge im Kiez, Me-Challenge privat.
- Der Timer der Me-Challenge ist optional.

## Stand

- `src/app/before-after/[id].tsx`: Schritt 2 hat den Knopf „Ohne Timer weiter“. Er führt direkt zum Nachher. Der Server (`finish_before_after`) postet auch ohne Timer; der Beitrag zeigt dann keine Dauer.
- Keine Migration nötig.

## Offen

- Layout mit Daria besprechen: Fortschritt „1 Vorher, 2 Timer, 3 Nachher“, Platz und Text des Knopfs, Timer eventuell als Schalter im Vorher-Schritt.
- Prototyp auf der Website: Timer dort ebenfalls optional machen, sobald das Layout steht.
