# Startseite mit klickbarem Prototyp

- **Stand:** 21.10.2026
- **Zweck:** Besucherinnen von kiezcoins.de probieren die App direkt auf der Startseite aus, ohne Konto und ohne Download. Darunter zeigen drei illustrierte Figuren, wie die Nachbarschaft über Kiez Coins spricht.
- **Gehört nach:** Documentation › `kiez-coins/app/Stand_App.md` (Website) und `kiez-coins/ENTSCHEIDUNGEN.md` (Prototyp auf der Startseite, Schriften lokal).
- **Arbeitsteilung:** Claude hat Prototyp, Illustrationen und Startseite gebaut. Vercel veröffentlicht die Seite bei jedem Push. Daria prüft Texte und Figuren und testet auf dem Telefon.

## So ist die Startseite aufgebaut

- `scripts/build-download-site.mjs` baut `website/index.html`. Die Rechtstexte und die Web-App unter `/app/` bleiben unverändert.
- Erster Bildschirm: Überschrift, drei Szenarien („Challenge finden“, „Challenge stellen“, „Gruppe“) und ein Telefon mit dem Prototyp. Ein Tipp auf ein Szenario steuert das Telefon. Auf dem Telefon werden die Szenarien zur Leiste „Finden · Stellen · Gruppe“ über dem Gerät.
- Leute: drei Figuren mit Sprechblasen „Besser als Instagram“, „Wie GitHub für den Alltag“, „Schon praktisch“. Die Blasen erscheinen nacheinander, sobald der Bereich im Bild ist. Ein Tipp auf eine Figur lässt sie wackeln.
- Download: Android mit Passwort und iPhone über die Web-App, wie bisher, jetzt als zwei Karten nebeneinander.

## Der Prototyp

- Zwei Rollen über dem Telefon: **Öffentlich** (Connewitz, Bounty in Euro: Igelhaus, Hochbeete, Kinderrad, Müll am Auwald-Weg; Gruppe Hof Kastanienallee) und **Familie** (Familie Berger, Edensteine: Spülmaschine, Einkauf für Oma, Gassi mit Bruno, Rasen mähen; Rangliste mit Mama, Papa, Oma, Jonas). Der Wechsel setzt das Telefon zurück. Die Szenarien heißen in der Familie „Aufgabe übernehmen“, „Aufgabe stellen“ und „Rangliste“.

- `scripts/site/prototyp.js`: Feed mit Karten, Gefällt mir, Detail-Sheet (nach unten ziehen oder Escape schließt), Annehmen → Erledigt melden → Bestätigt mit Coins-Regen, Challenge stellen mit Foto, Titel-Vorschlägen, Bounty und Frist, Pleasure mit Bilanz, Gruppe „Hof Kastanienallee“ mit Edensteinen und Rangliste, die sich nach einer erledigten Aufgabe neu ordnet. Der Kater meldet jeden Schritt in einer Sprechblase.
- Alle Daten sind Beispiele und leben nur im Browser. Neu laden setzt alles zurück.
- Icons, Kater, Schriftzug, Coins, Krone und Diamant zieht das Build-Skript aus `src/components/icons/` (dieselben SVGs wie die App) nach `website/prototyp/daten.js`. Ändern sich die Icons in der App, ändert sich der Prototyp beim nächsten Build mit.
- Farben und Bewegung „Schranke“ entsprechen `src/theme/tokens.ts`. Mit „Bewegung reduzieren“ im System laufen keine Animationen.

## Illustrationen

- Kartenbilder sind echte Fotos in `scripts/site/fotos/` (Unsplash-Lizenz, ohne Namensnennung, auf 720 Pixel verkleinert). Quellen je Datei stehen in `scripts/site/fotos/QUELLEN.md`. Ein neues Foto mit passendem Namen dort ablegen, der nächste Build übernimmt es.
- `scripts/site/kunst.mjs`: drei Figuren als SVG, im Stil von Kater und Coins mit heller, leicht zittriger Kontur. Die drei gezeichneten Kartenbilder dort springen nur ein, wenn ein Foto fehlt.
- Die Figuren tragen keine Namen und keine Sterne. So wirken sie als Illustration und nicht als echte Bewertungen.

## Schriften

- Inter und Inter Tight liegen in `website/fonts/` und kommen aus `node_modules/@expo-google-fonts`. Die Seite lädt nichts von Google-Servern.

## Das macht Daria

1. Nach dem Push `https://kiezcoins.de` am Rechner und auf dem Telefon öffnen und alle drei Szenarien durchtippen.
2. Texte und Sprechblasen prüfen. Die Texte stehen im Build-Skript (Abschnitt „Startseite mit Prototyp“) und in `scripts/site/prototyp.js`.

## Getestet

- Chromium 1280 × 860 und 390 × 844: alle Abläufe durchgeklickt, keine Fehler in der Konsole.

## Offene Punkte

- „Besser als Instagram“ nennt eine fremde Marke. Vergleichende Werbung regelt § 6 UWG. Vor einer breiten Werbeaktion lohnt ein kurzer Blick einer Fachperson.
- Die Startseite und die Sprechblasen hängen nicht am Texte-CMS.
