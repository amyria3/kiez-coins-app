# Download-Seite mit Passwort und Rechtstexte

- **Stand:** 21.10.2026
- **Zweck:** Testversion ohne App Store und Play Store verteilen, Rechtstexte in App und Web.
- **Gehört nach:** Documentation › `kiez-coins/app/Stand_App.md` (Launch-Schritte) und `kiez-coins/ENTSCHEIDUNGEN.md`.
- **Arbeitsteilung:** Claude hat Code, Seite, Bucket und Edge Function gebaut. Daria setzt das Passwort, baut die APK, lädt sie hoch und stellt die Seite online.

## So funktioniert der Schutz

- Die Seite `website/index.html` ist eine statische Seite mit Passwortfeld. Sie schickt das Formular an die Edge Function `download` bei Supabase.
- Die Funktion prüft das Passwort auf dem Server (Secret `DOWNLOAD_PASSWORD`, ohne Secret der Hash in der Tabelle `download_settings`, siehe `2026-10-20_migrationen.md` Nr. 12 und 13). Stimmt es, leitet sie auf einen 10 Minuten gültigen Link zur APK weiter. Sonst zurück zur Seite mit Fehlermeldung.
- Die APK liegt im privaten Bucket `downloads`. Ohne Passwort kommt niemand an die Datei. Das Passwort steht nirgends im Code.
- Wer das Passwort kennt, kann den 10-Minuten-Link weitergeben. Für eine Testgruppe reicht das.

## Das macht Daria einmalig

1. **Passwort setzen:** Supabase › Edge Functions › Secrets › „Add new secret“. Name `DOWNLOAD_PASSWORD`, Wert das Passwort.
2. **Expo-Projekt anlegen und APK bauen** (Mac, Terminal im Ordner `kiez-coins-app`):
   ```sh
   git pull
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest init
   npx eas-cli@latest build -p android --profile preview
   ```
   `init` schreibt die Projekt-ID in `app.json`. Diese Änderung committen. Der Build läuft in der Expo-Cloud, etwa 15 Minuten. Am Ende steht ein Link zur `.apk`.
3. **APK hochladen:** Datei herunterladen, in `kiez-coins.apk` umbenennen, Supabase › Storage › `downloads` › „Upload file“. Grenze: 50 MB. Die APK enthält nur arm64 (alle Android-Handys seit etwa 2017) und bleibt deshalb klein.
4. **Seite online stellen:** Das Vercel-Projekt `kiezcoins` ist mit dem GitHub-Repo verknüpft. Jeder Push auf einen Branch erzeugt eine Vorschau, `main` geht live. Im Vercel-Projekt unter „Domains“ `kiezcoins.de` eintragen und die angezeigten DNS-Einträge bei INWX anlegen.
5. **Testen:** Falsches Passwort zeigt „Das Passwort stimmt nicht.“ Richtiges Passwort startet den Download.

Liegt die Seite unter einer anderen Adresse als `https://kiezcoins.de/`, das Secret `DOWNLOAD_PAGE` mit der Adresse anlegen.

## Update der App

`versionCode` in `app.json` um 1 erhöhen, neu bauen (Schritt 2, letzte Zeile), APK im Bucket ersetzen. Testerinnen installieren über die alte Version, Daten bleiben.

## iPhone

Bis zum TestFlight-Link nutzen iPhone-Testerinnen die Web-App unter `kiezcoins.de/app/` (siehe `2026-10-21_web-app.md`). Die Download-Seite verlinkt sie. Für TestFlight später:

iOS installiert Apps nur aus dem App Store, über TestFlight oder auf registrierten Geräten. Der Weg: Apple Developer Program (99 € im Jahr), `npx eas-cli@latest build -p ios --profile production`, `npx eas-cli@latest submit -p ios`, in App Store Connect eine externe Testgruppe mit öffentlichem Link anlegen. Apple prüft die erste Testversion (Beta-Review, meist 1 bis 2 Tage). Den Link trägt Daria in `scripts/download-site.config.json` bei `testflightUrl` ein und baut die Seite neu.

## Rechtstexte

- Impressum, Datenschutzerklärung und Nutzungsbedingungen stehen in `src/data/legal.ts`. App und Seite lesen dieselbe Datei.
- In der App: Links auf `onboarding/welcome` und `onboarding/email`, lesbar verlinkt im Kodex, Abschnitt „Rechtliches“ unter „Dein Konto“. Route `rechtliches/[doc]`.
- „AGB“ heißt jetzt „Nutzungsbedingungen“.
- Seite neu bauen nach jeder Textänderung: `node scripts/build-download-site.mjs`, danach `website/` neu hochladen.

## Technisch geändert

- `app.json`: Bundle-ID und Paketname `de.kiezcoins.app`, `versionCode` 1, `ITSAppUsesNonExemptEncryption: false`, Plugin `expo-build-properties` (nur arm64).
- Neu: `eas.json` mit Profil `preview` (APK).
- Neu: `supabase/functions/download/index.ts` (bei Supabase deployt, ohne JWT-Prüfung, prüft selbst das Passwort).
- Neu: `supabase/migrations/20261021000500_downloads_bucket.sql` (Bucket `downloads`, privat). Claude hat sie am 21.10.2026 im Projekt ausgeführt.

## Offene Punkte

- Anschrift im Impressum: Im Testbetrieb steht keine Anschrift im Impressum, sie gibt es auf Anfrage per E-Mail (Daria, 21.10.2026). Eine ladungsfähige c/o-Adresse kommt, sobald Kiez Coins offiziell frei zugänglich ist und ein Finanzierungskonzept steht. Eintragen in `src/data/legal.ts`, `OPERATOR`, Felder `street` und `city`.
- Das App-Icon (`assets/icon.png`) ist noch das Expo-Platzhaltericon. Es erscheint auf dem Handy nach der Installation.
- Auftragsverarbeitungsverträge: Supabase (Dashboard › Organization › Legal Documents) und Brevo (Konto › Sicherheit) abschließen.
