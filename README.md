# Kiez Coins

App für Nachbarschafts-Challenges: Jemand stellt eine Aufgabe in den Kiez (zum Beispiel „Garten aufräumen“), andere erledigen sie, und wer mag, zahlt dafür eine kleine Bounty (5 bis 50 €) direkt an die Helfenden.

Dieser Stand ist ein **klickbarer Prototyp mit Beispieldaten**. Die **Anmeldung ist echt**: Sie läuft über Supabase mit einem Code per E-Mail. Challenges, Feed und Konto-Inhalte sind noch Beispieldaten, Standort und Push-Nachrichten nur gespielt. Es gibt keine echten Zahlungen.

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

**Neuen Stand holen:** Hast Du die App schon einmal geladen, reicht im Ordner `kiez-coins-app`:

```sh
git pull
npm install
npx expo start
```

Klappt die Verbindung nicht (zum Beispiel im Firmen- oder Uni-WLAN), starte stattdessen mit `npx expo start --tunnel`.

Ohne Handy geht es auch im Browser: `npx expo start --web`.

## Was Du ausprobieren kannst

- **Onboarding:** Die App startet mit „Anheuern“. Du bekommst einen echten Code an Deine E-Mail-Adresse. Nach dem Onboarding bleibst Du angemeldet, auch nach dem Neustart. „Ich hab schon ein Konto“ meldet ein bestehendes Konto an und springt direkt in den Feed.
- **Feed:** Challenges in der Nähe, Wave Challenges und erledigte Challenges.
- **Challenge erfüllen:** Challenge öffnen → „Challenge annehmen“ → Operation taufen (freiwillig), Fragen in den Kommentaren stellen → „Erledigt melden“ mit Foto → Zahlungsdaten für die Bounty freigeben.
- **Challenge erstellen:** Kamera-Symbol oben rechts im Feed.
- **Erledigung bestätigen** und **Bounty auf Vertrauen:** Über das Demo-Menü (siehe unten) als Peter prüfen und bestätigen. Danach siehst Du sofort die Zahlungsdaten und markierst als bezahlt. Als Nachbarschaftsgärtner*innen bestätigst Du den Empfang oder meldest Peter.
- **Konto und Einstellungen:** Menü-Symbol oben links im Feed. Deckname und Ansprache ändern, Zahlungsdaten und Freigaben verwalten, Konto pausieren oder löschen.

### Demo-Menü

**Logo „Kiez Coins“ im Feed lange gedrückt halten.** Dort kannst Du:

- wechseln, wer Du bist (Peter J. oder die Nachbarschaftsgärtner*innen),
- Aufgaben öffnen, für die es später eine Benachrichtigung gäbe,
- die Zustände des Feeds ansehen (lädt, leer, Fehler, offline),
- das Onboarding noch einmal ansehen.

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

## Anmeldung (Supabase)

- Projekt „Kiez Coins Data“. URL und Publishable Key stehen in `src/lib/supabase.ts`. Sie sind öffentlich und dürfen in die App. Für ein anderes Projekt setzt Du `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in einer Datei `.env.local`.
- Anmeldung ohne Passwort: `signInWithOtp` schickt den Code, `verifyOtp` prüft ihn (`src/data/auth.tsx`). Die Sitzung liegt im Gerät (AsyncStorage).
- Deckname, Ansprache, Kiez, Push und „Onboarding fertig“ liegen vorerst in den `user_metadata` des Kontos, bis es eine Tabelle `profiles` gibt.
- **Einmalig in Supabase nötig:** Unter *Authentication › Emails › Templates* müssen die Vorlagen „Confirm signup“ und „Magic Link“ den Code `{{ .Token }}` enthalten. Die Standardvorlagen schicken nur einen Link.
- Der eingebaute Mailversand von Supabase schafft nur wenige Mails pro Stunde. Für mehr Tester*innen braucht es einen eigenen SMTP-Dienst.

## Figma abgleichen

Grundlage ist die Figma-Datei „Kiez Coins“. Ändert sich dort etwas, wird es hier von Hand nachgezogen:

- **Farben, Abstände, Schriften:** `src/theme/tokens.ts` (Namen wie die Figma-Variablen, `color/bg/screen` → `color.bg.screen`).
- **Icons und Kater:** `src/components/icons/` (aus Figma als SVG exportiert).
- **Texte:** stehen direkt in den Screens unter `src/app`.

Bewusste Abweichungen von Figma:

- Die bewegten Farbverläufe (Shader) an Kater-Augen und Coins sind hier feste Verläufe.
- Statt der Handschrift „BROWN NOW TWO“ wird Inter verwendet, bis die Lizenz für Apps geklärt ist.
- Die Beispiel-IBAN ist eine gültige Test-IBAN, weil die App IBANs prüft.
- Standort und Push-Nachrichten sind nur gespielt. „Konto löschen“ meldet nur ab, das Konto bei Supabase bleibt noch bestehen.
- Solibeitrag und Sperr-Regel sind noch nicht eingebaut.
