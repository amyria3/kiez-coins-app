# Instagram-Look: Icons und Zurück-Pfeil (2026-10-24)

Gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Look“) und `kiez-coins/app/Arbeitsstand_Code.md`.

- Icons nach Darias Mockups „Vorher-Nachher“: alle Hauptsymbole gleich groß, 24 pt bei 360 pt App-Breite, mit der Breite wachsend bis 30 pt (`useIconPt` in `src/components/icons/instagramSvgs.ts`). Linie immer ein Zwölftel der Größe (2 auf 24), kleine Icons mindestens 1,5 pt. Leiste, Aktionen, Profil-Reiter, Münze und Edenstein nutzen dieselbe Größe.
- Leiste im Instagram-Look 54 pt hoch plus Safe Area; Profilbild so groß wie die Icons.
- Zurück ohne Verlauf: Nach einem Look-Wechsel, einem Neuladen oder einem direkten Link führt der Pfeil eine Ebene höher (`useGoBack` in `src/lib/goBack.ts`, in allen Unterseiten).
