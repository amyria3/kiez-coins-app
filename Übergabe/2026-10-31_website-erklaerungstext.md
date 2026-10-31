# Website: Tipp auf den Erklärungstext

Datum: 2026-10-31 · Status: erledigt · Ziel in Documentation: Doku zur Website (Startseite mit Prototyp), Abschnitt Telefon und Tablet

Daria hat am 31.10.2026 festgelegt:

- Ein Tipp auf Überschrift oder Satz zum Prototyp fährt Text und Steuerung doppelt so weit nach oben wie nötig. So ist die Bewegung gut zu sehen, und zwischen Text und Telefon bleibt sichtbar Luft.
- Gleichzeitig scrollt die Seite so, dass der Erklärungstext ganz oben steht (12 px Abstand zum Rand).
- Noch ein Tipp oder eigenes Scrollen stellt zurück.

Code: `scripts/site/prototyp.js`, Abschnitt „Rolle und Szenarien neben dem Telefon“ (`lift`, `phoneShift`). `phoneShift` bildet Scrolleffekt B aus `scripts/build-download-site.mjs` nach (Telefon eilt mit `y * -.12` voraus). Ändert sich dieser Faktor, muss `phoneShift` mitgehen.
