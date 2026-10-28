# Android-Updates: Expo-Minuten aufgebraucht

Stand: 28.10.2026. Status: offen, bis Android wieder auf dem Stand von `main` ist. Gehört nach: Documentation, `app/Stand_App.md`, Abschnitt „So bleiben Web, iPhone und Android auf demselben Stand“.

## Der Workflow „Android-Updates“ startet nicht mehr

Der EAS-Workflow `.eas/workflows/android.yml` schlägt bei jedem Push auf `main` fehl, spätestens seit 28.10.2026, 08:38 Uhr. Expo meldet:

> Failed to start job: Free plan CI/CD and Simulator 60 minute limit reached. CI/CD and Simulator minutes reset on November 1, 2026 at 12:0…

Der kostenlose Expo-Plan hat 60 CI/CD-Minuten im Monat. Sie sind aufgebraucht. So bekommt die Android-App keine Updates, bis die Minuten am 01.11.2026 zurückgesetzt werden.

Web und iPhone sind nicht betroffen. Vercel baut bei jedem Push auf `main` weiter neu, zuletzt erfolgreich für den Merge von PR #106.

## So bringst Du Android von Hand auf den Stand von `main`

Die Änderungen seit dem 28.10.2026 betreffen nur JavaScript, Texte und SQL, keinen nativen Teil. Deshalb reicht ein Update im Kanal `preview`, das vom Mac aus läuft und keine CI-Minuten braucht. Jede Zeile einzeln ausführen:

```bash
cd ~/kiez-coins-app
git checkout main && git pull
npx eas-cli@latest update --channel preview --message "Stand main"
```

Die App lädt das Update beim nächsten Start und zeigt es beim Start danach. Ändert sich der native Teil (neues Paket mit nativem Code, `app.json`, Icons, Plugins), braucht es stattdessen eine neue APK, siehe „So bringst Du eine APK von Hand heraus“ in `Stand_App.md`.

## Offene Entscheidung (Daria)

- [ ] Bis zum 01.11.2026 jedes Update von Hand veröffentlichen, oder den Expo-Plan umstellen.
- [ ] Prüfen, ob der Workflow nach dem 01.11.2026 wieder startet. Ein Build einer neuen APK verbraucht deutlich mehr Minuten als ein reines Update.
