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
- „Deine Challenges“ im Instagram-Look nach Darias Mockup „Verwaltungskarte“ (24.10.2026): keine graue Fläche; seitlich 24 (unter 360 Breite 16); Bild 56, Radius 8, 21 unter den Reitern; Titel halbfett 16/20, Hinweis 13/18 grau; Zahlen 24 unter dem Bild, halbfett 16/20 über 13/18, ohne Trennstriche; Knöpfe nebeneinander 34 hoch, Radius 8, grau gefüllt, Hauptaktion blau; „Challenge löschen“ als roter Text, 28 bis zur Haarlinie. „Neue Challenge“ unten 44 hoch mit Radius 8 (`InstaCard` in `src/app/manage.tsx`).
- „Was Du so machst“ in „Dein Konto“ im Instagram-Look mit dem Herz als Icon, wie das Herz oben im Feed, das die Seite öffnet. Die Krone bleibt im Kiez-Look (24.10.2026).
- Edenstein im Instagram-Look (24.10.2026): Brillant als Kontur in Textfarbe mit Gürtel und zwei Facetten. Alle 6 bis 14 s blitzt der Verlauf Amethyst (#F783AC nach #7048E8) auf: 350 ms ein, 500 ms halten, 650 ms aus; mit „Bewegung reduzieren“ oder ohne offene Aufgabe nicht. Der Stein ist eine Angabe neben seiner Zahl und wirkt nicht wie ein Knopf: kleiner als die Aktions-Icons (rund 17 pt am Beitrag, 19 pt in der Gruppenzeile), keine Bewegung, 4 pt bis zur Zahl, Zahl halbfett in Textfarbe (`InstaGem` in `src/components/icons/Brand.tsx`).
