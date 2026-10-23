# Kiez Coins

App für Nachbarschafts-Challenges: Jemand stellt eine Aufgabe in den Kiez (zum Beispiel „Garten aufräumen“), andere erledigen sie, und wer mag, zahlt dafür eine kleine Bounty (5 bis 50 €) direkt an die Helfenden.

Konzept, Entscheidungen, Aufbau, Datenbank und Stand der App stehen im privaten Repo [amyria3/Documentation](https://github.com/amyria3/Documentation).

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

## Testversion verteilen

Die Download-Seite mit Passwort liegt in `website/` und entsteht mit `node scripts/build-download-site.mjs`. Ablauf und Einrichtung stehen im privaten Repo Documentation unter `kiez-coins/app/Stand_App.md`, Abschnitt „Website kiezcoins.de“.

## Übergabe

Neue Doku aus Arbeiten am Code kommt in den Ordner [`Übergabe/`](Übergabe/README.md), nicht in dieses README. Von dort wird sie ins Repo Documentation übernommen.
