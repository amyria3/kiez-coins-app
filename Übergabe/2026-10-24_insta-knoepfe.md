# Instagram-Look: Knöpfe, Farben, Beitrag ohne Foto (2026-10-24)

Status: erledigt, Notiz für die Doku.

Gehört nach Documentation: `kiez-coins/design/UX_UI_Regeln.md` (Knöpfe, Farben, Beitrag ohne Foto) und `kiez-coins/ENTSCHEIDUNGEN.md` (Look).

- Knöpfe im Instagram-Look überall gleich (`InstaButton` in `src/components/Button.tsx`): 44 hoch, Radius 8, halbfett 14, ohne Icon. Primary blau mit weißer Schrift, die übrigen grau gefüllt, Danger mit roter Schrift, Ghost blauer Text. Kein Glas.
- Kein Grün im Instagram-Look: Edensteine, „Offen“ und gewählte Chips in Textfarbe.
- Beitrag ohne Foto im Instagram-Look ohne Fläche: Haarlinie, darunter Aktionen und der Titel fett im Text. Status („Noch 23 Std.“, „Geschlossen“, „Erledigt“) rechts in der Aktionsleiste unter dem Bild, grau; darunter nur noch die Zeit seit dem Posten.
- Erstellen im Reiter „Gruppen“: Kopf „Aufgabe erstellen“ (in beiden Looks). Das Blatt hat im Instagram-Look keine runden Ecken.
- Schalter im Instagram-Look nach dem iOS-Muster (`InstaSwitch` in `src/components/Form.tsx`): Spur 51 × 31, weißer Knopf 27 mit leichtem Schatten, aus #E5E5E5, an Instagram-Blau, 200 ms.
