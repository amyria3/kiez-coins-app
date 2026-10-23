Datum: 2026-10-23
Gehört nach: Documentation, `kiez-coins/app/Stand_App.md`, Abschnitt „Website kiezcoins.de“

# Die Spenden-Karte zeigt die Blumen einzeln und animiert

- `scripts/blumen-zerlegen.py` zerlegt `scripts/site/blumen.webp` in 13 freistehende Pflanzen (`scripts/site/blumen/NN.webp`, Lage in `teile.json`). Pflanzen, die sich berühren, bleiben zusammen, da Erodieren die Stiele zerschneidet. Nach einem neuen Blumenbild läuft das Skript einmal, dann der Website-Build.
- Die Karte hat helles Papier (`#ECE9DF`) mit dunkler Schrift. So fällt der helle Freistellrand der Blumen nicht auf.
- Sobald die Karte im Bild ist, gleitet jede Pflanze von unten aufs Blatt, leicht gedreht und mit kleinem Nachschwingen, als schöbe eine Hand sie hin. Die Reihenfolge läuft von links nach rechts (85 ms Abstand, 1,5 s pro Pflanze). Ohne JavaScript und bei „Bewegung reduzieren“ stehen die Blumen still da.
