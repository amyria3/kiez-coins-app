# Kater im Kreis: lila auf Schwarz, fährt herein, Herzen blitzen

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Kater“; `kiez-coins/design/Designsystem.md` (KaterCard)

## Daria hat entschieden

- Der Kater im runden Bild (KaterCard im Kiez-Look, überall in der App) ist lila (`#7E94FF`) auf schwarzem Kreis.
- Er fährt beim Erscheinen sanft von unten ins runde Bild.
- In seiner Brille blitzen Herzen auf, unregelmäßig.

## Umsetzung

- `src/components/Content.tsx`, `KaterRund`: Kreis `#000000`, Icon „cat“ in `color.brand.signature`. Einfahren 750 ms mit Easing.out(cubic), 120 ms verzögert. Herzen: Pause zufällig 2,5 bis 9 s, in 30 % der Fälle zweimal kurz hintereinander; jedes Blitzen rund 0,5 bis 0,8 s. Mit „Bewegung reduzieren“ sitzt der Kater still, ohne Herzen.
- `src/components/Herz.tsx`: Darias Herz, flach, rot mit weißem Rand; genutzt von `KaterStage` und `KaterRund`.
