# Prüfung von Code-Qualität und Sicherheit

Datum: 2026-11-15 · Status: offen, Vorschläge warten auf Darias Entscheidung · Ergebnis gehört nach Documentation: `kiez-coins/app/Arbeitsstand_Code.md` (Qualität) und `kiez-coins/cra/Technische_Dokumentation.md`, Punkt 3 und 5 (Sicherheit).

## So wurde geprüft

- TypeScript (`tsc`, strict) und ESLint über das ganze Repo
- knip (tote Dateien, Exporte, Abhängigkeiten), jscpd (doppelter Code)
- gitleaks über alle 1.610 Commits aller Branches
- Semgrep mit 209 Regeln für JavaScript und TypeScript aus `github.com/semgrep/semgrep-rules` (die Registry semgrep.dev ist aus der Cloud-Sitzung gesperrt)
- `npm audit --omit=dev`, Durchsicht der Filter an die Datenbank (`.or(…)`)

## Qualität

- TypeScript strict ohne Fehler, kein `any`, kein `@ts-ignore`. ESLint: 0 Fehler, 2 Warnungen in Skripten (`scripts/build-download-site.mjs:112` Variable `figuren` unbenutzt, `scripts/text-keys.mjs:47` Ausdruck ohne Wirkung).
- Doppelter Code: 0,13 % (2 Stellen).
- Tote Funktionen, nirgends benutzt: `catSvg` (icons/brandSvgs.ts), `modeLink` (features.ts), `formatRemaining`, `maskIban` (format.ts), `forgetFeatures` (freischaltung.ts), `openLegalFields` (legal.ts), `DEFAULT_SHEET_FONT` (sheetFonts.ts), `getGender` (texts.ts).
- Abhängigkeiten: `@fortawesome/free-regular-svg-icons` wird nicht benutzt. `app.json` setzt `userInterfaceStyle: dark`, ohne `expo-system-ui` wirkt das auf Android nicht.
- Sehr große Dateien: `src/data/remote.ts` (1.894 Zeilen), `src/components/RoutineList.tsx` (1.676), `src/app/feed.tsx` (1.280), `src/data/store.tsx` (1.071). Vorschlag: RoutineList in Karten, Kalender und Liste aufteilen; remote.ts nach Themen.
- Tests: Die Datenbank hat SQL-Tests (alle grün). Für die App-Logik gibt es keine Tests. Vorschlag: Jest für reine Funktionen (Dringlichkeit, Sortierung, Datumslogik in reminders.ts und RoutineList.tsx, richText, mentions).

## Sicherheit

- gitleaks: keine Geheimnisse. Die 14 Treffer sind der öffentliche Supabase-Schlüssel (`sb_publishable_…`) und der IndexNow-Schlüssel, beide gewollt öffentlich.
- Semgrep: keine echten Befunde in `src`, `api` und den Edge Functions. Die Treffer zu `innerHTML` liegen im Prototyp der Startseite (Beispieldaten, maskiert mit `esc`), die übrigen sind Hinweise zu Übersetzungen und Stil.
- Filter an die Datenbank: Die Schaufenster-Suche maskiert Sonderzeichen, die übrigen `.or(…)` nutzen nur Kennungen. Unkritisch.
- `npm audit`: 3 hohe Lücken (`node-forge`, `zod`, `@expo/cli`), alle in Werkzeugen für Build und Entwicklung, nicht im Code der App. `npm audit fix` behebt sie, aktualisiert aber 91 Pakete, darunter native Expo-Module. Wegen `runtimeVersion: fingerprint` bekämen vorhandene APKs danach keine Updates mehr. Vorschlag: zusammen mit dem nächsten nativen Build (Store-Build) ausführen.
- Web: Website und Web-App teilen sich die Domain kiezcoins.de. Die Anmeldung der Web-App liegt im Browser-Speicher dieser Domain. Jede Lücke auf einer Website-Seite trifft damit auch die Anmeldung (so beim Fund vom 14.11. auf der Finanzierungsseite). Vorschläge: (a) Content-Security-Policy für `/app`, (b) mittelfristig Web-App auf `app.kiezcoins.de`.
- Weiter offen aus der Prüfung vom 14.11.: private Fotos im öffentlichen Speicher (Weg A, B oder C).
- Die Gmail-Adresse steht nach dem Umschreiben der Historie nur noch in den alten PR-Verweisen (`refs/pull/*`), die nur der GitHub-Support entfernen kann.
