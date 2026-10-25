# Automatische Updates auf allen Plattformen

- **Datum:** 2026-10-25
- **Status:** offen. Daria hat die Regel festgelegt, die Umsetzung noch nicht beauftragt.
- **Ergebnis gehört nach:** Documentation › `kiez-coins/app/Stand_App.md`, Abschnitt „So bleiben Web, iPhone und Android auf demselben Stand“. Danach in `AGENTS.md` hier den Abschnitt „Releases“ anpassen.

## Ziel

Web, iPhone und Android laufen immer auf demselben Stand (Entscheidung 2026-10-25). Web und iPhone erledigt Vercel bei jedem Push. Android soll Code-Änderungen ohne neue APK bekommen.

## Stand

- Die App hat kein `expo-updates`. Die APK im Bucket `downloads` enthält den Code vom Zeitpunkt ihres Builds.
- Bis zur Umsetzung sagt der Agent Daria nach jeder Änderung, dass eine neue APK fällig ist.
- Am 2026-10-25 hatte der lokale Ordner `~/kiez-coins-app` auf Darias Mac den Stand vom 2026-10-23 und Änderungen an `package.json` und `package-lock.json`, die nicht committet sind. Vor einem Build dort `git pull` ausführen.

## Nächste Schritte

1. Expo-Doku zur installierten SDK lesen (`https://docs.expo.dev/versions/v<major>.0.0/`, EAS Update).
2. `npx expo install expo-updates`, dann `npx eas-cli@latest update:configure`. Das schreibt `updates.url` und `runtimeVersion` in `app.json`.
3. `runtimeVersion` mit der Richtlinie `fingerprint`. So erkennt Expo Änderungen am nativen Teil selbst, und ein Update erreicht nur APKs mit passendem nativen Stand.
4. In `eas.json` dem Profil `preview` einen Kanal geben (`"channel": "preview"`).
5. GitHub Action `.github/workflows/update.yml`, Auslöser Push auf `main`:
   - `expo/expo-github-action` mit Secret `EXPO_TOKEN`.
   - Fingerprint gleich wie in der letzten APK: `npx eas-cli@latest update --channel preview --message "<Commit>" --non-interactive`.
   - Fingerprint geändert: `npx eas-cli@latest build -p android --profile preview --non-interactive --wait`, die APK herunterladen und über die Storage-API als `downloads/kiez-coins.apk` ersetzen (Secret mit dem Service-Role-Key, `x-upsert: true`). Testerinnen installieren diese APK einmal neu.
   - `versionCode` erhöht EAS selbst, wenn `eas.json` `"appVersionSource": "remote"` und im Profil `"autoIncrement": true` hat.
6. Eine erste APK mit `expo-updates` bauen und in den Bucket laden. Alle Android-Testerinnen installieren sie einmal. Erst ab dieser APK kommen Updates automatisch an.
7. Doku in Documentation nachziehen, diese Notiz löschen.

## Offene Fragen an Daria

- Expo-Konto `kiezcoins`: Zugriffstoken anlegen (*Account settings › Access tokens*) und als `EXPO_TOKEN` in den GitHub-Secrets des Code-Repos speichern.
- Service-Role-Key von Supabase als GitHub-Secret für das Hochladen der APK, oder APK nach nativen Änderungen weiter von Hand hochladen?
- Grenzen des kostenlosen Plans für EAS Update und EAS Build vor dem Start prüfen.

## Betroffene Dateien

`package.json`, `app.json`, `eas.json`, neu `.github/workflows/update.yml`, `AGENTS.md` (Abschnitt „Releases“).
