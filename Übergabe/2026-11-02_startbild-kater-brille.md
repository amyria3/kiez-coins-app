# Darias Figma-Kater überall in App und Website

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku; eine offene Frage an Daria (unten)
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Kater“; App-Stand zu Start, Willkommen und `/cat`

## Daria hat entschieden

- Cat The Käptn sieht überall aus wie Darias Figma-Vorlage: blauer Kater mit Besen, Schürze und Stiefeln vor gelbem Kreis. Die Gläser der Sonnenbrille schimmern wie in ihrer Figma-Animation.
- Der Kater bleibt animiert: atmen, fegen, winken, Brille runter, stampfen, dazu das Schimmern der Gläser.
- Drückt man einen Knopf im Willkommensbildschirm, gehen Herzen in der Brille auf (wie in alten Zeichentrickfilmen), mit kräftigem Kontrast.

## Umsetzung

- Vorlagen: `Übergabe/KiezCoins Cat.svg` und `Übergabe/KiezCoins Cat.mp4` (Figma, 2 Sekunden). Beide können gelöscht werden, sobald Daria nichts mehr daran ändert.
- Ebenen in `assets/kater/` aus dem SVG, alle auf der Fläche 1300 × 1885: `unten.png` (Kreis, Körper), `besen.png`, `stiefel.png`, `oben.png` (Schürze, Kopf, Nase, an den Gläsern durchsichtig), `oben-ganz.png` (dasselbe ohne Aussparung), `glaeser.png` (Gläser still).
- `assets/kater/glaeser.mp4`: Ausschnitt der Gläser aus Darias Video (374 × 188 ab 430/423), vorwärts und rückwärts hintereinander, 4 Sekunden, damit die Schleife ohne Sprung läuft. Das Video liegt unter `oben.png` und zeigt sich nur durch die Aussparung. Android nutzt `surfaceType="textureView"`, damit das Bild über dem Video liegt. Bis zum ersten Videobild und bei „Bewegung reduzieren“ stehen die stillen Gläser da.
- `src/components/KaterStage.tsx`: neue Ebenen; Wege der Aktionen auf die neue Fläche umgerechnet; Besen dreht um die Pfote (985/1150). Bei „brille“ liegt kurz `oben-ganz.png` über dem Video und die stillen Gläser rutschen runter.
- Herzen: Prop `herzen` (Zähler) an `KaterStage`. Zwei Herzen in `#FF1E56` mit weißem Rand und Glanzlicht, gehen auf, pochen zweimal, blenden aus (rund 1,3 Sekunden).
- `src/app/onboarding/welcome.tsx`: Beide Knöpfe lösen die Herzen aus; die App wartet 900 ms, bevor sie weitergeht, damit man sie sieht.
- `src/components/StartKater.tsx`: wieder `KaterStage` mit Fegen, Breite höchstens 240 (auf kleinen Handys 28 % der Bildschirmhöhe).
- Entfernt: alte Ebenen `koerper.png`, `besen.png` (alt), `brille.png`, `stiefel.png` (alt) und die Komponente `KaterBrille`.
- Website: `website/kater/kater.png` neu aus dem SVG (1120 × 1624), in allen Sprachen `width="560" height="812"`.
- Keine native Änderung: `expo-video` und `react-native-svg` stecken schon in der App.

## Noch alter Kater

- `website/kater/kopf.png` (Kopf, der links hereinschaut): blauer Kopf, aber schwarze Brille. Neu machen, sobald Daria den Kopf aus Figma liefert.
- `assets/illustrations/kater.svg`, `assets/illustrations/kater-logo-xs.svg`, `assets/brand/kater-*.svg`: alte Vorlagen, im Code nicht mehr verwendet.

## Offene Frage an Daria

- Daria schreibt, in den Bildern sei ein zweiter, lächelnder Mund versteckt. Im SVG, in den eingebetteten Gläsern und im Video gibt es nur den einen Mund (Nase mit Schnurrbart). Vermutlich liegt der lächelnde Mund als ausgeblendete Ebene in Figma und kam nicht mit in den Export. Gebraucht: Export als eigenes SVG oder Link zum Figma-Frame, und wann er lächeln soll (etwa zu den Herzen).
