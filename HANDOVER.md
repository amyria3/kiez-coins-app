# Übergabe – Stand 20.10.2026

Für die nächste Claude-Sitzung (auch auf Darias Mac). Daria schreibt Deutsch und wird mit „Du“ angesprochen.

## Wo was liegt

- Repo `amyria3/kiez-coins-app`, Branch `main`. Auf dem Mac: `~/kiez-coins-app`.
- Expo SDK 57, Expo Router (`src/app`), Supabase-Client in `src/lib/supabase.ts`.
- Supabase-Projekt „Kiez Coins Data“ (Ref `aqxzxpxrshizlaqyjplw`, Free-Plan). Migrationen in `supabase/migrations`, eingespielt bis `20261020000200` (`20261020000300_comment_replies` steht noch aus). Test: `supabase/tests/challenge_flow.sql` (rollt zurück).
- Konzept und Briefing: `/mnt/project-files/kiez-coins/` (nur in Cloud-Sitzungen erreichbar).
- Expo-Konto: Benutzer `kiezcoins`. Das Repo ist noch **nicht** mit EAS verknüpft (keine `projectId`, keine `eas.json`). Der Slug `kiez-coins-app` ist im Konto wohl schon vergeben, also mit `npx eas-cli@latest init` das vorhandene Projekt verknüpfen.

## Was heute passiert ist

- PR #2 (Login) und #3 (Challenge-Daten in Supabase, „Deine Reise“) auf `main` gemergt.
- Code-Mails gehen nicht: Ohne eigenen SMTP schickt Supabase nur an Team-Mitglieder, Vorlagen lassen sich nicht bearbeiten.
- Deshalb **PR #4: Anmeldung vorerst mit E-Mail und Passwort** (gemergt). In Supabase ist „Confirm email“ **aus**. Code-Login (`sendCode`/`verifyCode`, `onboarding/code.tsx`) bleibt im Code für später.
- Auf dem Mac: `git pull` und `npm install` erledigt, git sauber. `@expo/ngrok` liegt nur in `node_modules` (`--no-save`).
- Tunnel für Tests außer Haus: `CI=1 npx expo start --tunnel --port 8082` läuft (2026-10-20, 15:15). Vorher brach ngrok zweimal mit `TypeError: Cannot read properties of undefined (reading 'body')` ab, ohne Änderung am Setup; vermutlich eine ngrok-Störung. Tritt der Fehler wieder auf: status.ngrok.com prüfen. Im CI-Modus gibt es kein Hot Reload. Daria hat den Tunnel erlaubt; die Auto-Modus-Prüfung auf dem Mac kann ihn trotzdem als „External Ingress Tunnel“ blockieren.
- `@expo/ngrok` global installieren geht nicht (`/opt/homebrew/…` braucht Admin-Rechte). Ein späteres `npm install` kann das `--no-save`-Paket wieder entfernen.
- Port 8081 gehört zu Darias Blog-Server (`/Users/arkadieff/CODE/bl`), nicht anfassen. Kiez Coins auf Port 8082 starten.

## Challenges verwalten (PR #7)

- Migrationen `20261020000100_edit_open_challenge` und `20261020000200_drafts_close_comments` sind in Supabase eingespielt (20.10.2026).
- Neue Status `draft` (nur für die Ersteller:in sichtbar) und `closed` (bleibt in der Timeline). Löschen nur noch für Entwürfe.
- Kommentare für alle aktiven Personen unter veröffentlichten, nicht geschlossenen Challenges.
- Ansicht „Deine Challenges“ (`/manage`): „Verwalten“ am eigenen Post im Feed, „Alle verwalten“ im Detail, Konto.
- Test: `supabase/tests/drafts_close_comments.sql`.
- Supabase-MCP: `drop policy` und `delete` lösen eine Rückfrage aus, die in Thread-Sitzungen nach 60 s abbricht. Policies deshalb mit `alter policy` ändern.

## Optisches Upgrade „Nachtschicht“ und Feed (20.10.2026)

Daria hat aus drei Richtungen (Kiez-Quest, Nachtschicht, Kiez-Aushang) „Nachtschicht“ gewählt: dunkler Stil, Fotokarten mit Glasleiste, Inter Tight für Überschriften und Zahlen, Figma-Icons auf 18 pt. Entwürfe als Design-Canvas „Kiez Coins – Upgrade“ in claude.ai (öffnet sich auf Darias iPhone nicht, dort als Bilder geschickt).

- **Feed:** Logo und Begrüßung nur bis zur ersten Interaktion (`headerGone` in `src/app/feed.tsx`), Segmente kleben oben (`stickyHeaderIndices`), Story-Kreise unter den Segmenten, nicht in „Pleasure“ (früher „Erledigt“). Kamera schwebt oben rechts (`CameraButton`), Menü in der Tab-Leiste (`TabBar`: Stecknadel, Kater, Burger).
- **Challenge-Typen:** `src/data/features.ts`. Wave ist aus: Reiter gedimmt, zeigt `PlannedHint`, vorhandene Wave-Challenges bleiben sichtbar.
- **Detail:** `HeroScreen` in `src/components/Screen.tsx` mit einklappbarem Blatt. Eigentümer-Aktionen im Zahnrad-Menü. Bounty und Frist in einer Zeile.
- **Kommentare:** Antworten eine Ebene tief (`reply_to_id`), UI in `src/components/Comments.tsx`. Kommentare werden mit `comments(*)` geladen, damit die App vor und nach der Migration läuft.
- **Konto:** Profilkarte → `account/profile`; Benachrichtigungen (`settings/notifications`), Zahlungsdaten und Support (`account/support`) als eigene Seiten.
- **Offen:** Migration `20261020000300_comment_replies.sql` ist **noch nicht** in Supabase eingespielt. Bis dahin scheitern nur Antworten, normale Kommentare gehen.
- **Offen:** Figma an den Stand der App anpassen. Der Figma-Connector war abgelaufen („neu verbinden“).
- Web-Vorschau zum Prüfen: `CI=1 EXPO_OFFLINE=1 npx expo start --web --port 8090`, Beispieldaten über das Demo-Menü. Metro lädt Änderungen in der Cloud-Sitzung nicht immer nach; dann den Server neu starten.

## Nächster Schritt mit Daria

1. Am Mac: `cd ~/kiez-coins-app && npx expo start --port 8082`, Handy im selben WLAN, QR-Code scannen.
2. „Anheuern“ → E-Mail + Passwort (mind. 8 Zeichen) → Onboarding. **Noch nie mit echtem Konto getestet.**
3. Danach mit zweitem Konto den Challenge-Ablauf durchspielen.
4. Bei Fehlern: Supabase-Logs (`auth_logs`, `postgrest_logs`) prüfen.

## Bis zum Launch

**Technik (Claude):**
- Feature „Gruppen“ mit Edensteinen umsetzen, Konzept in `docs/konzept-gruppen.md`. Einladung per Link erst mit eigener Domain.
- App-IDs (`ios.bundleIdentifier`, `android.package`), Icon, Splash, `eas init`, `eas.json`, erster Build.
- Push-Nachrichten echt machen (braucht Development Build statt Expo Go).
- Standort für Kiez echt machen (bisher gespielt).
- Personen blockieren (Apple-Pflicht bei Inhalten von Nutzer:innen; Melden gibt es schon).
- Demo-Menü und Beispieldaten aus der Store-Version entfernen.
- Fotos gelöschter Konten im Storage aufräumen.
- Fehler-Tracking (z. B. Sentry).
- Supabase: Tarif mit Backups und die Advisors prüfen. Meldungen werden bisher nur von Hand im Dashboard ausgewertet.

**Daria:**
- Domain kaufen (z. B. kiezcoins.de). Mailversand über Proton: Ihr Tarif „Mail Essentials“ hat SMTP-Übermittlung (Domain in Proton hinzufügen, Adresse anlegen, Token erzeugen, in Supabase *SMTP Settings*: `smtp.protonmail.ch`, Port 587). Danach „Confirm email“ wieder an, Vorlagen mit `{{ .Token }}`, Code-Login zurück, „Passwort vergessen“.
- Impressum, Datenschutzerklärung, Nutzungsbedingungen (Bounties laufen nicht über die App).
- Apple Developer (99 $/Jahr), Google Play (25 $ einmalig; neue private Konten: 14 Tage Test mit 12 Personen).
- Store-Texte, Screenshots, Altersfreigabe (18+), Datenschutz-Angaben.
- Lizenz Schrift „BROWN NOW TWO“ klären.

Reihenfolge-Vorschlag: zuerst EAS und App-IDs (Store-Weg dauert am längsten), parallel Domain und Rechtstexte, dann Push und Standort.

## Regeln

- Nichts committen oder pushen ohne Darias OK.
- Pakete mit `npx expo install` hinzufügen (siehe `AGENTS.md`).
- Vor dem Abschluss Lint und Typecheck (`npx tsc --noEmit`).
