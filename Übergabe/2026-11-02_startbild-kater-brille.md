# Startbild mit Darias Figma-Kater

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Kater“ oder „Start“; App-Stand zum Startbildschirm

## Daria hat entschieden

- Der Startbildschirm zeigt Darias neuen Kater aus Figma: Cat The Käptn mit Besen, Schürze und Stiefeln vor gelbem Kreis, die Gläser der Sonnenbrille schimmern wie in ihrer Figma-Animation.

## Umsetzung

- Vorlagen: `Übergabe/KiezCoins Cat.svg` (Bild) und `Übergabe/KiezCoins Cat.mp4` (Animation aus Figma, 2 Sekunden). Beide können gelöscht werden, sobald Daria nichts mehr daran ändert.
- `assets/kater/start-kater.png`: der Kater aus dem SVG ohne Gläser, an ihrer Stelle durchsichtig.
- `assets/kater/start-kater-brille.png`: nur die Gläser, still. Sie stehen da, bis das Video sein erstes Bild zeigt, und bei „Bewegung reduzieren“.
- `assets/kater/start-brille.mp4`: Ausschnitt der Gläser aus Darias Video (374 × 188 auf der Fläche 1300 × 1885), vorwärts und rückwärts hintereinander, 4 Sekunden. Darias Video endet an einer anderen Stelle als es beginnt; so läuft die Schleife ohne Sprung.
- `src/components/KaterBrille.tsx`: Gläser, Video, darüber der Körper. Das Video liegt unter dem Körper und zeigt sich nur durch die Aussparung der Gläser. Android nutzt `surfaceType="textureView"`, damit das Bild über dem Video liegt.
- `src/components/StartKater.tsx`: zeigt `KaterBrille` (Breite höchstens 240, auf kleinen Handys 28 % der Bildschirmhöhe) und darüber die Sprechblase mit einem Spruch. Der Kater fegt am Start nicht mehr; Ablauf mit Zahnrädern und Zeiten wie vorher.
- `KaterBlase` aus `src/components/KaterStage.tsx` ist jetzt eine eigene Komponente, damit Start und Onboarding dieselbe Sprechblase nutzen.
- Der Willkommensbildschirm (`src/app/onboarding/welcome.tsx`) und `/cat` zeigen weiter den alten Kater mit Besen-Aktionen.
- Keine native Änderung: `expo-video` steckt schon in der App. Android bekommt das Update ohne neue APK.
