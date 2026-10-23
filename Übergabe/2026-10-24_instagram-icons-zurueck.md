# Instagram-Look: Icons und Zurück-Pfeil (2026-10-24)

Gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Look“) und `kiez-coins/app/Arbeitsstand_Code.md`.

- Icons nach Darias Mockups „Vorher-Nachher“: alle Hauptsymbole gleich groß, 24 pt bei 360 pt App-Breite, mit der Breite wachsend bis 30 pt (`useIconPt` in `src/components/icons/instagramSvgs.ts`). Linie immer ein Zwölftel der Größe (2 auf 24), kleine Icons mindestens 1,5 pt. Leiste, Aktionen, Profil-Reiter, Münze und Edenstein nutzen dieselbe Größe.
- Leiste im Instagram-Look 54 pt hoch plus Safe Area; Profilbild so groß wie die Icons.
- Zurück ohne Verlauf: Nach einem Look-Wechsel, einem Neuladen oder einem direkten Link führt der Pfeil eine Ebene höher (`useGoBack` in `src/lib/goBack.ts`, in allen Unterseiten).
- Instagram-Look wie Darias Mockup „Vorher-Nachher“ (24.10.2026), die Kamera bleibt:
  - Kopf: Schriftzug „Kiez Coins“ als Text (Inter Tight halbfett 24/28, −0,4), rechts Herz („Was Du so machst“) und Papierflieger (Chats), 18 Abstand; keine Begrüßung. Der Kopf gleitet nach 3,5 s weg und kommt bei jedem Zurückscrollen wieder.
  - Leiste: vier Felder, zwei Personen (Feed), Kamera (Erstellen), Papierflieger (Chats), Burger (Menü); inaktiv 55 % Deckkraft. Haus und Profilbild entfallen.
  - Umschalter: Großbuchstaben halbfett 12, Laufweite 0,5, Strich 1,5.
  - Verwalten am Beitrag und an der Gruppe wieder als Zahnrad.
