# Prüfung von Code-Qualität und Sicherheit

Datum: 2026-11-15 · Status: offen, Aufräumen und Content-Security-Policy erledigt, Rest wartet auf Darias Entscheidung · Ergebnis gehört nach Documentation: `kiez-coins/app/Arbeitsstand_Code.md` (Qualität) und `kiez-coins/cra/Technische_Dokumentation.md`, Punkt 3 und 5 (Sicherheit).

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

## Erledigt am 15.11.

- Aufräumen (Commit 9e46df3a): die toten Funktionen oben, das Paket `@fortawesome/free-regular-svg-icons` und die zwei ESLint-Warnungen entfernt. ESLint 0 Warnungen, `tsc` ohne Fehler. `expo-system-ui` und `npm audit fix` bleiben für den nächsten nativen Build.
- Content-Security-Policy für `/app` (Commits a083167c und 34414b7c): Startskript aus `public/index.html` nach `public/start.js` verschoben, damit keine Inline-Skripte nötig sind. Erlaubt sind nur die eigene Domain, Supabase (https und wss) und nominatim.openstreetmap.org. Zuerst im Beobachtungsmodus live: keine Verstöße (abgemeldet geprüft: Start, Anmeldung, Schaufenster). Danach scharf geschaltet, gilt jetzt auch für `/app/` mit Schrägstrich. Die Policy schützt die Web-App selbst. Eine Lücke auf einer Website-Seite kann die Anmeldung weiter erreichen, dafür bleibt Vorschlag (b) `app.kiezcoins.de`.
- Falls angemeldet etwas nicht lädt: in der Browser-Konsole nach „Content Security Policy“ suchen, die blockierte Adresse in `vercel.json` ergänzen.

## Zweite Prüfung am 15.11. (abends)

- TypeScript und ESLint ohne Fehler und Warnungen. knip: keine toten Funktionen; 43 Exporte werden nur in ihrer Datei genutzt (harmlos). `expo-system-ui` und `npm audit fix` warten auf den nächsten nativen Build.
- Sicherheits-Header auf kiezcoins.de und app.kiezcoins.de vollständig, HSTS aktiv. `kiezcoins.de/app-uebergabe` nur in app.kiezcoins.de einbettbar, ohne fremde Quellen. In den Commits des Tages nur der öffentliche Supabase-Schlüssel. `security.txt` jetzt auch auf app.kiezcoins.de (vorher lieferte die Web-App dort ihre Startseite aus).
- Entfernt: `assets/Vector.svg`, `assets/splash-icon.png`, `scripts/site/fatcat.svg`, `Übergabe/Frame 10.svg`, `Übergabe/KiezKatz Portrait Logo.svg`. Arbeitsdateien außerhalb des Repos liegen in `KiezCoins-Fotos/_zum_loeschen`.
- Offen bleibt: private Fotos im öffentlichen Speicher (Entscheidung Daria), Migrationen und Funktionen vom 14.11. einspielen (Daria), Tastatur in der Web-App auf dem Home-Bildschirm (Test nach dem Deploy).

## Aufgeräumt am 15.11. (Daria: „Korrigiere alles davon“)

- Farben und Abstände: neue Rollen in `tokens.ts`, Komponenten ohne feste UI-Farben. Ausnahmen: Inhalte (Abzeichen, Schaufenster-Designs, Plattform-Marken, QR-Code, Visitenkarte, Farbrad).
- Namen: Englisch mit deutschen Fachbegriffen (Daria), 280 Bezeichner und 8 Dateien mit dem TypeScript-Sprachdienst umbenannt. URL-Parameter und gespeicherte Schlüssel unverändert.
- Aufgeteilt: `remote.ts`, `store.tsx`, `RoutineList.tsx`, Teile von `feed.tsx`. Offen: `FeedScreen` selbst (rund 1 100 Zeilen), nur mit Test auf dem Gerät.
- Tests: 26 Tests für Datum, Dringlichkeit, Text und @-Namen (`node scripts/test.mjs`).
- Kommentare: 37 Verlaufsangaben entfernt.
- Gefunden und behoben: Ein neues Skript in `package.json` (Umzug, ed2ee1c5) hatte den Fingerprint geändert. Die Android-Updates seit 14:07 Uhr kamen deshalb nicht bei den vorhandenen APKs an. Seit 9972254e wieder `67b211e8…`, das nächste Update erreicht sie wieder.
- Geprüft: TypeScript, ESLint, Tests, Web-Export mit Rauchtest im Browser (Start, Anheuern mit Fokus, Feed, Routine, Me, Erstellen, Rechtstexte, Demo; keine Fehler), Android-Bundle.
