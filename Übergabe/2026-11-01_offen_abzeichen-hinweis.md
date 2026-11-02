# Hinweis beim neuen Abzeichen nach Darias Entwürfen

- Datum: 2026-11-01
- Status: offen. Daria hat am 2026-11-01 „Stop“ gesagt, bevor Code entstand.
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Abzeichen“, und `kiez-coins/app/Arbeitsstand_Code.md`

## Daria hat entschieden

- Beide Entwürfe kommen in die App (2026-11-01):
  - `Abzeichen-Hinweis/Entwurf Karte.png` für Lots:in und Anführer:in: Die Szene ragt über eine Karte mit Verlauf, darin „Neues Abzeichen“, der Name, die Avatare der Eingeladenen und „Jule, Peter, Lena, Mo und Ali sind dabei, weil Du sie eingeladen hast“. Darunter „Am Avatar zeigen“ und „Später“.
  - `Abzeichen-Hinweis/Entwurf Szene und Kater.png` für die übrigen: Szene, darunter die Kater-Sprechblase, dann die Knöpfe.

## Material

- Darias Szenen-Vorlagen je Abzeichen in `Animationen/Vorlagen/` (2026-11-02): `Ocular.svg` (Pionier:in), `Bottle.svg` (Lots:in), `Steuerrad.svg` (Anführer:in), `Anchor.svg` (Seebär:in), `Bitseps.svg` (Macher:in). Jede hat eigenen Himmel, eigene Farben und Wellen.
- Fertig animiert für alle fünf (2026-11-02), je zwei Fassungen in `Animationen/`, Name `<Icon> – Owning Badge.svg` und `<Icon> – Badge Received.svg`, je mit Vorschau als MP4:
  - Owning Badge: Die kleine Illustration schwimmt herein, quert das Bild, kehrt an ihre Stelle aus der Vorlage zurück und bewegt sich dann nur noch auf und ab. Bitseps schwimmt nicht: Der Arm steht an seiner Stelle, mit Lichtrand von Anfang an, schwebt ruhig und spannt alle 6,4 s kurz an.
  - Badge Received: Die kleine Illustration holt Schwung, zögert, steigt auf und wird zur großen Illustration an deren Stelle aus der Vorlage. Lichtrand in Warmweiß `#F3EEE8` mit Linie `#191716`, Strahlen in Warmweiß, am Steuerrad in Lila `#6155F5`. Tropfen fallen ab. Bitseps steigt aus dem Wasser, mit Lichtrand von Anfang an. Die Flasche schwebt senkrecht (eigene Fassung).
  - Erzeugt mit Claudes Skripten: Wellen periodisch aus der Vorlage, Bewegungen vorberechnet als CSS-Keyframes, Strahlen als SMIL, keine Scripts in der SVG.
- Claudes frühere Varianten für Fernrohr, Anker und Arm auf der Nacht-Szene sind gelöscht (2026-11-02), da Darias Vorlagen sie ersetzen. Sie liegen in der Git-Geschichte.
- Eine Szene ist 0,6 bis 2,4 MB groß, da das Himmelsbild als PNG eingebettet ist.

## Stand 2026-11-02

- Erledigt: Der Hinweis zeigt im Kiez-Look Darias Szene (`src/components/BadgeScene.tsx`, `src/app/badge/[kind].tsx`). Android spielt Videos mit `expo-video`, ausgeschnitten mit `MaskedView`, das Web die SVG. Damit ist keine WebView und keine neue APK nötig.
- Die Karte zeigt noch keine Avatare und keine Namen der Eingeladenen, nur den Kater-Text.

## Nächster Schritt

1. Eingeladene laden: neue Funktion, z. B. `my_invitees()` (security definer), die für `auth.uid()` die aktiven Einladungen mit Name und Avatar liefert, nach derselben Regel wie `badge_progress`. Migration anlegen, in `DATENBANK.md` mit „noch nicht“ eintragen, Pflichtaufgabe in `Stand_App.md`.
2. In der Karte die Avatare und „Jule, Peter, Lena, Mo und Ali sind dabei, weil Du sie eingeladen hast“ zeigen.
3. Auf Android prüfen: Übergang vom Einstieg in die Schleife, Kante der Maske.

## Offene Fragen an Daria

- Farben der Karte: aus dem Entwurf messen (oben Oliv, unten Nachtblau) oder als neue Tokens?
