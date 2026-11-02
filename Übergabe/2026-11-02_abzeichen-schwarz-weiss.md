# Offene Abzeichen in Schwarz-Weiß

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Abzeichen“

## Daria hat entschieden

- Noch nicht erhaltene Abzeichen („Noch offen“ in Me) zeigen Darias Icons in Schwarz-Weiß.

## Umsetzung

- `src/components/BadgeIcon.tsx`: Bei `muted` wird jede Farbe in Darias SVG zum Grau gleicher Helligkeit (0,299 R + 0,587 G + 0,114 B), ohne Transparenz. Der Farbpunkt unter 20 pt wird ebenso grau.
- `muted` gilt auch für ausgeblendete eigene Abzeichen (Me, Persönliche Angaben); sie erscheinen damit ebenfalls schwarz-weiß.
- Der Fashionable Look zeigt weiter die Platzhalter mit grauer Kachel.
