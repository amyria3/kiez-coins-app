# Feed-Kopf verschwindet auf großen Bildschirmen

- Datum: 2026-10-25 (Darias To-do vom 22.10.2026)
- Status: offen, To-do von Daria
- Gehört in Documentation: `kiez-coins/app/Offene_Punkte.md`, nach dem Fix `kiez-coins/design/Designsystem.md` (Verhalten des Feed-Kopfs)

## To-do (Daria, 22.10.2026)

„The Header should Not randomly disappear on scroll on huge screens like huge iPhones“

## Stand

Claudes Code-Prüfung vom 25.10.2026, nicht auf einem Gerät nachgestellt. Der Feed-Kopf (Logo und Begrüßung) steuert sich in `src/app/feed.tsx`:

- `collapse()` blendet den Kopf aus, sobald `y > 8` und die Liste weiter nach unten scrollt (`onScroll`).
- `expand()` blendet ihn erst wieder ein, wenn die Liste vorher mehr als 120 Punkte weit unten war und dann ganz oben ankommt, oder beim Herunterziehen ganz oben (`y < -48`).
- Zusätzlich blendet ein Timer den Kopf nach `HEADER_HIDE_MS` (3500 ms) ohne Interaktion aus (Darias Wunsch vom 23.10.2026).

Vermutete Ursache: Auf einem großen Bildschirm passt eine kurze Liste fast ganz hinein. Ein kleiner Wisch über 8 Punkte blendet den Kopf aus, die Liste erreicht aber nie 120 Punkte Tiefe. Damit kommt der Kopf nur über Herunterziehen zurück, und das wirkt zufällig. Der Timer verstärkt den Eindruck.

## Offene Fragen an Daria

- Soll der Kopf auf großen Bildschirmen immer stehen bleiben, oder nur, wenn die Liste nicht viel länger als der Bildschirm ist?
- Gilt der Timer (3,5 Sekunden) auf großen Bildschirmen weiter?

## Code-Vorschlag

In `onScroll` erst ausblenden, wenn die Liste spürbar länger als der Bildschirm ist:

```tsx
const { contentSize, layoutMeasurement } = e.nativeEvent;
const scrollable = contentSize.height - layoutMeasurement.height > HEADER_HEIGHT + 120;
if (scrollable && y > 8 && y > lastY.current) collapse();
```

Den Timer genauso an `scrollable` koppeln (Wert in einem Ref merken).
