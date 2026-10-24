# Startbildschirm: Zahnräder unten, Kater in der Mitte

- Datum: 2026-10-24
- Status: erledigt, Entscheidung für die Doku
- Ziel in Documentation: App-Stand bzw. Entscheidungen, Abschnitt „Start der App“

## Entscheidung

Daria hat den Ablauf beim Start der App festgelegt:

1. Die Zahnräder drehen sich zuerst, unten auf dem Bildschirm.
2. Danach taucht der Kater an seiner Stelle in der Mitte auf, fegt einmal und sagt einen Spruch.
3. Die Zahnräder verschwinden, sobald alles geladen ist (gespeicherte Anmeldung gelesen) und Kater und Zahnräder mindestens eine Sekunde zusammen zu sehen waren.
4. Der Startbildschirm blendet aus, wenn die Zahnräder weg sind und der Kater fertig gefegt hat. Ein Tipp überspringt das Fegen, sobald die Zahnräder weg sind.

## Umsetzung

- `src/components/StartKater.tsx`: ein Startbildschirm mit Zahnrädern (200 pt, auf kleinen Handys 22 % der Bildschirmhöhe, 32 pt über der Safe Area) und Kater (600 ms nach den Zahnrädern). Neue Eigenschaft `loaded`.
- `src/app/_layout.tsx`: der Startbildschirm liegt schon während des Ladens über der App. Der eigene Lade-Screen mit Zahnrädern in der Mitte erscheint beim Start nicht mehr.
