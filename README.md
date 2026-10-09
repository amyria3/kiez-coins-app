# Kiez Coins

App für Nachbarschafts-Challenges: Jemand stellt eine Aufgabe in den Kiez (zum Beispiel „Garten aufräumen“), andere erledigen sie, und wer mag, zahlt dafür eine kleine Bounty (5 bis 50 €) direkt an die Helfenden.

Dieser Stand ist ein **klickbarer Prototyp mit Beispieldaten**. Es gibt noch keine Anmeldung, keinen Server (Supabase kommt später) und keine echten Zahlungen.

## App auf dem Handy ansehen (Expo Go)

Du brauchst einen Computer mit [Node.js](https://nodejs.org) (Version 20 oder neuer) und Dein Handy im selben WLAN.

1. Auf dem Handy die App **Expo Go** installieren (App Store bzw. Google Play).
2. Auf dem Computer im Terminal:
   ```sh
   git clone https://github.com/amyria3/kiez-coins-app.git
   cd kiez-coins-app
   npm install
   npx expo start
   ```
3. Im Terminal erscheint ein QR-Code.
   - **iPhone:** mit der normalen Kamera-App scannen.
   - **Android:** in Expo Go auf „Scan QR code“ tippen.
4. Die App lädt und öffnet sich. Änderungen am Code erscheinen sofort.

Klappt die Verbindung nicht (zum Beispiel im Firmen- oder Uni-WLAN), starte stattdessen mit `npx expo start --tunnel`.

Ohne Handy geht es auch im Browser: `npx expo start --web`.

## Was Du ausprobieren kannst

- **Feed:** Challenges in der Nähe, Wave Challenges und erledigte Challenges.
- **Challenge erfüllen:** Challenge öffnen → „Challenge annehmen“ → „Erledigt melden“ mit Foto.
- **Challenge erstellen:** Kamera-Symbol oben rechts im Feed.
- **Erledigung bestätigen** und **Bounty auf Vertrauen:** Über das Demo-Menü (siehe unten) als Peter prüfen, bestätigen und bezahlen, danach als Nachbarschaftsgärtner*innen den Empfang bestätigen oder Peter melden.

### Demo-Menü

**Logo „Kiez Coins“ im Feed lange gedrückt halten.** Dort kannst Du:

- wechseln, wer Du bist (Peter J. oder die Nachbarschaftsgärtner*innen),
- Aufgaben öffnen, für die es später eine Benachrichtigung gäbe,
- die Zustände des Feeds ansehen (leer, Fehler, offline).

Das Menü gibt es nur im Prototyp, nicht in der späteren App.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/app` | Screens. Dateinamen sind die Routen aus Figma, zum Beispiel `challenge/[id]/report` |
| `src/components` | Bausteine aus Figma (Button, ChallengePost, StatusBadge, …) |
| `src/theme/tokens.ts` | Farben, Abstände, Radien und Schriften aus den Figma-Variablen |
| `src/data` | Datenmodell, Beispieldaten und Statuswechsel |
| `assets/sample` | Beispielfotos aus Figma |

Für Entwickler:innen: `npm run typecheck` prüft die Typen.

## Figma abgleichen

Grundlage ist die Figma-Datei „Kiez Coins“. Ändert sich dort etwas, wird es hier von Hand nachgezogen:

- **Farben, Abstände, Schriften:** `src/theme/tokens.ts` (Namen wie die Figma-Variablen, `color/bg/screen` → `color.bg.screen`).
- **Icons und Kater:** `src/components/icons/` (aus Figma als SVG exportiert).
- **Texte:** stehen direkt in den Screens unter `src/app`.

Bewusste Abweichungen von Figma:

- Die bewegten Farbverläufe (Shader) an Kater-Augen und Coins sind hier feste Verläufe.
- Statt der Handschrift „BROWN NOW TWO“ wird Inter verwendet, bis die Lizenz für Apps geklärt ist.
- Die Beispiel-IBAN ist eine gültige Test-IBAN, weil die App IBANs prüft.
