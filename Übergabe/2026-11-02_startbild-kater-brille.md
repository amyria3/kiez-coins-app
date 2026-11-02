# Darias Figma-Kater überall in App und Website

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Kater“; App-Stand zu Start, Willkommen und `/cat`

## Daria hat entschieden

- Cat The Käptn sieht überall aus wie Darias Figma-Vorlage: blauer Kater mit Besen, Schürze und Stiefeln vor gelbem Kreis. Die Gläser der Sonnenbrille schimmern wie in ihrer Figma-Animation.
- Der Kater bleibt animiert: atmen, fegen, winken, Brille runter, stampfen, dazu das Schimmern der Gläser.
- Drückt man einen Knopf im Willkommensbildschirm, gehen Herzen in der Brille auf (wie in alten Zeichentrickfilmen), mit kräftigem Kontrast.
- Zwei Münder: sonst Darias „Default Mouth“ (braun, `#604500`); bei den Herzen lächelt der Kater mit dem Mund aus dem SVG (Schnurrbart, `#2C2C2C`).
- Über die Brille schauen (Aktion „brille“) wie in `KiezCoins Cat2.svg`: ein weißes, ein schwarzes Auge, Brille tiefer und perspektivisch gekippt, mit Bügeln.
- Der gelbgrüne Kreis sitzt tiefer, hinter dem Körper, wie in `Cat2.svg`.
- Für alle Videos und Grafiken des Katers: grüner Lichtfleck in den Gläsern weiter unten; Herzen in Darias Form ohne 3D-Effekt; neue Schürze in Grün (`#516200`) mit Trägern aus `Cat2.svg`.

## Umsetzung

- Vorlagen in `Übergabe/`: `KiezCoins Cat.svg`, `KiezCoins Cat2.svg` (über die Brille, Kater 294 höher), `KiezCoins Cat Mund.svg` (Default-Mund), `KiezCoins Cat.mp4` (Figma, 2 Sekunden). Sie bleiben liegen, solange `scripts/kater-ebenen.py` sie braucht; ziehen sie um, Pfade im Skript anpassen.
- `scripts/kater-ebenen.py` baut alle Ebenen, das Video und das Website-Bild neu: `python3 scripts/kater-ebenen.py` (braucht `rsvg-convert`, `ffmpeg`, Pillow, numpy).
- Ebenen in `assets/kater/` aus den SVGs, alle auf der Fläche 1300 × 1696 (Ausschnitt wie `Cat2.svg`, ab y 294 von `Cat.svg`; Koordinaten in `KaterStage` relativ dazu): `unten.png` (Kreis, Körper), `besen.png`, `stiefel.png`, `oben.png` (Schürze aus Cat2, Kopf, Mundloch mit Fell gefüllt, an den Gläsern durchsichtig), `oben-ganz.png` (dasselbe ohne Aussparung), `mund.png` und `mund-laecheln.png` (Ausschnitt 120 × 130 ab 560/530 der Fläche, an den Gläsern beschnitten) sowie `mund-ganz.png` und `mund-laecheln-ganz.png` (unbeschnitten, für „brille“), `glaeser.png` (Gläser still), `drueber.png` (Augen und gekippte Brille mit Bügeln aus Cat2). Default-Mund an 582/561 wie in Cat2, Mundbilder 120 × 140 ab 560/530 (in `Cat.svg`-Koordinaten).
- `assets/kater/glaeser.mp4`: Ausschnitt der Gläser aus Darias Video (374 × 188 ab 430/423), vorwärts und rückwärts hintereinander, 4 Sekunden, damit die Schleife ohne Sprung läuft. Das Skript streckt das Bild in jedem Glas oben und staucht es unten (`FLECK = 1.7`), damit der grüne Lichtfleck tiefer sitzt; größerer Wert, Fleck tiefer. Das Video liegt unter `oben.png` und zeigt sich nur durch die Aussparung. Android nutzt `surfaceType="textureView"`, damit das Bild über dem Video liegt. Bis zum ersten Videobild und bei „Bewegung reduzieren“ stehen die stillen Gläser da.
- `src/components/KaterStage.tsx`: neue Ebenen; Wege der Aktionen auf die neue Fläche umgerechnet; Besen dreht um die Pfote (985/856 auf der Fläche). Bei „brille“ liegt `oben-ganz.png` über dem Video, die stillen Gläser rutschen 66 tiefer und gehen in `drueber.png` über.
- Herzen: Prop `herzen` (Zähler) an `KaterStage`. Zwei Herzen in Darias Form (`assets/icons/heart.svg`), flach in `#FF1E56` mit weißem Rand, gehen auf, pochen zweimal, blenden aus (rund 1,3 Sekunden).
- `src/app/onboarding/welcome.tsx`: Beide Knöpfe lösen die Herzen aus; die App wartet 900 ms, bevor sie weitergeht, damit man sie sieht.
- `src/components/StartKater.tsx`: wieder `KaterStage` mit Fegen, Breite höchstens 240 (auf kleinen Handys 28 % der Bildschirmhöhe).
- Entfernt: alte Ebenen `koerper.png`, `besen.png` (alt), `brille.png`, `stiefel.png` (alt) und die Komponente `KaterBrille`.
- Website: `website/kater/kater.png` vom Skript gebaut (1120 × 1461, neue Schürze, Default-Mund, Kreis tiefer), in allen Sprachen `width="560" height="731"`.
- Keine native Änderung: `expo-video` und `react-native-svg` stecken schon in der App.

## Noch alter Kater

- `website/kater/kopf.png` (Kopf, der links hereinschaut): blauer Kopf, aber schwarze Brille. Neu machen, sobald Daria den Kopf aus Figma liefert.
- `assets/illustrations/kater.svg`, `assets/illustrations/kater-logo-xs.svg`, `assets/brand/kater-*.svg`: alte Vorlagen, im Code nicht mehr verwendet.
