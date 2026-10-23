# Instagram-Look: Review und Überarbeitung (2026-10-23)

Gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Look“) und `kiez-coins/app/Arbeitsstand_Code.md` (Abschnitt „Wählbarer Look“).

## Entscheidungen von Daria

- Freundschaften gehören zum Reiter „Gruppen“ und stehen direkt unter der Gruppe, in beiden Looks (`src/components/FriendsRow.tsx`, Daten aus `src/data/friends.ts`).
- Logo und Kater bekommen im Instagram-Look eine eigene Signaturfarbe: Kiez-Violett `#7B2FF7`, Token `color.brand.signature`. Im Kiez-Look bleibt `#7E94FF`.
- Logo und Begrüßung im Feed gleiten nach 3,5 s von selbst weg (`HEADER_HIDE_MS` in `src/app/feed.tsx`), in beiden Looks.
- Erstellen sitzt im Instagram-Look in der Leiste unten, mit Kamera-Icon (Kamera mit Plus in der Linse). Die Kamera oben rechts entfällt dort.
- Icons im Instagram-Look weicher: Linie 1,6 statt 1,8, runde Ecken, neuer Papierflieger (`instagramSvgs.ts`).
- Beiträge im Instagram-Look im Hochformat 4:5, ohne Foto 4:3.
- „Was Du so machst“ im Instagram-Look als Profil wie instagram.com/<name> (`src/components/InstaProfile.tsx`).
- Umschalter „In der Nähe / Gruppen“ im Instagram-Look als Unterstrich-Reiter wie im Instagram-Profil.

## Leiste im Instagram-Look

Haus (Feed), zwei Personen (Gruppen und Freund:innen), Kamera mit Plus (Erstellen), Papierflieger (Chats), eigenes Bild (Profil). Das Menü (Konto) sitzt oben rechts im Profil. Von anderen Seiten öffnen `/feed?reiter=gruppen` und `/feed?erstellen=1` den Reiter bzw. das Erstellen.

## Maße (pt)

- Feed-Kopf: 16 seitlich, Logo 28 hoch, Begrüßung 22/28 halbfett, Unterzeile 14/18.
- Umschalter: Felder 44 hoch, Schrift 15, Strich 1 pt schwarz, Haarlinie darunter.
- Beitrag: Kopf 54 (links 12, rechts 4, Bild 32, 10 bis zum Namen), Foto 4:5, Aktionen 44 (links 4, Icons 24), Text 12 seitlich, 16 bis zum nächsten Beitrag.
- Leiste: 50 hoch plus Safe Area, fünf gleich breite Felder, Icons 24, Profilbild 24 mit 1,5 Ring.
- Freundesleiste: 16 seitlich, 12 zwischen den Kreisen, Kreis 70 (Bild 62, Ring 2, Luft 2).
- Profil: Kopf 44, Bild 86, Knöpfe 34 hoch, Highlights 64, Reiter-Icons 44, Raster drei Spalten 3:4 mit 2 Fuge.

## Offen

- Der Kater im Startbild (`KaterStage`, PNG-Teile) bleibt braun; nur die SVG-Kater (Logo, Sprechblasen) nehmen die Signaturfarbe an.
- Die Zahlen im Profil zählen Challenges, Freund:innen und Gruppen; der Verdienst steht darunter in der Bio-Zeile.
