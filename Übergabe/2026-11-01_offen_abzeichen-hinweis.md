# Hinweis beim neuen Abzeichen nach Darias Entwürfen

- Datum: 2026-11-01
- Status: offen. Daria hat am 2026-11-01 „Stop“ gesagt, bevor Code entstand.
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Abzeichen“, und `kiez-coins/app/Arbeitsstand_Code.md`

## Daria hat entschieden

- Beide Entwürfe kommen in die App (2026-11-01):
  - `Abzeichen-Hinweis/Entwurf Karte.png` für Lots:in und Anführer:in: Die Szene ragt über eine Karte mit Verlauf, darin „Neues Abzeichen“, der Name, die Avatare der Eingeladenen und „Jule, Peter, Lena, Mo und Ali sind dabei, weil Du sie eingeladen hast“. Darunter „Am Avatar zeigen“ und „Später“.
  - `Abzeichen-Hinweis/Entwurf Szene und Kater.png` für die übrigen: Szene, darunter die Kater-Sprechblase, dann die Knöpfe.

## Material

- Szenen in `Animationen/`: Lots:in `Bottle Reward endlos.svg`, Pionier:in `Pionier Reward endlos.svg`, Seebär:in `Seebaer Reward endlos.svg`, Macher:in `Macher Reward endlos.svg`, je mit Vorschau als MP4. Für Anführer:in gibt es noch keine Szene.
- Darias Vorlage: `Animationen/Vorlage Darias Szene.svg`. Erzeugt mit den Skripten von Claude (Wellen periodisch, Bewegungen vorberechnet als CSS-Keyframes, keine Scripts in der SVG).
- Jede Szene ist etwa 930 KB groß, da das Himmelsbild als PNG eingebettet ist.

## Nächster Schritt

1. Szenen ausliefern: SVGs nach `public/animations/` legen. Im Web zeigt ein `<img>` die SVG mit laufender CSS-Animation. Auf iOS und Android braucht es eine WebView (`npx expo install react-native-webview`). Das ist eine native Abhängigkeit: Danach baut der EAS-Workflow eine neue APK, und die Tester:innen sehen den Update-Hinweis. Vorher mit Daria klären.
2. Eingeladene laden: neue Funktion, z. B. `my_invitees()` (security definer), die für `auth.uid()` die aktiven Einladungen mit Name und Avatar liefert, nach derselben Regel wie `badge_progress`. Migration anlegen, in `DATENBANK.md` mit „noch nicht“ eintragen, Pflichtaufgabe in `Stand_App.md`.
3. `src/app/badge/[kind].tsx` nach den Entwürfen umbauen. Ohne Migration zeigt die Karte den Satz ohne Namen.

## Offene Fragen an Daria

- WebView in der App, also eine neue APK?
- Szene für Anführer:in?
- Farben der Karte: aus dem Entwurf messen (oben Oliv, unten Nachtblau) oder als neue Tokens?
