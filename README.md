# Kiez Coins

App für Nachbarschafts-Challenges: Jemand stellt eine Aufgabe in den Kiez (zum Beispiel „Garten aufräumen“), andere erledigen sie, und wer mag, zahlt dafür eine kleine Bounty (5 bis 50 €) direkt an die Helfenden.

Anmeldung und Daten laufen über **Supabase**: Du meldest Dich vorerst mit E-Mail und Passwort an, und Challenges, Kommentare, Zahlungsfreigaben und Profile sind echt und auf allen Geräten gleich. Standort und Push-Nachrichten sind noch gespielt, Geld fließt nie über die App. Beispieldaten gibt es weiter über das Demo-Menü.

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

- **Onboarding:** Die App startet mit „Anheuern“. Du legst ein Konto mit E-Mail und Passwort an. Nach dem Onboarding bleibst Du angemeldet, auch nach dem Neustart. „Ich hab schon ein Konto“ meldet ein bestehendes Konto an und springt direkt in den Feed.
- **Feed:** Segmente „In der Nähe“, „Wave“ und „Pleasure“ (erledigte Challenges, ohne Story-Kreise). Logo und Begrüßung stehen nur bis zur ersten Interaktion oben; nach einem Tipp auf ein Segment oder dem Wegscrollen bleibt die Ziel-Ansicht mit den Segmenten oben. Jede Challenge ist eine Fotokarte mit Bounty oben rechts. Am Anfang ist der Feed leer, bis jemand die erste Challenge erstellt. Nach unten ziehen lädt neu.
- **Wave (geplant):** Der Reiter ist gedimmt und zeigt beim Öffnen den Hinweis „Wave Challenges kommen später“, darunter vorhandene Wave-Challenges aus der Datenbank. An- und abschalten in `src/data/features.ts` (`active`).
- **Tab-Leiste unten:** Stecknadel = Feed, Kater = Deine Reise (oranger Punkt: Du bist dran), Burger = Dein Konto.
- **Challenge erfüllen:** Challenge öffnen → „Challenge annehmen“ → Operation taufen (freiwillig), Fragen in den Kommentaren stellen → „Erledigt melden“ mit Foto → Zahlungsdaten für die Bounty freigeben.
- **Challenge erstellen:** Kamera oben rechts im Feed. Sie bleibt beim Scrollen stehen.
- **Challenge-Detail:** Foto oben, darunter ein Blatt mit Status, Titel, Bounty und Frist. Der Griff oben im Blatt klappt die Details ein. Bei eigenen Challenges öffnet das Zahnrad rechts neben dem Status Bearbeiten, Schließen und Alle verwalten.
- **Kommentare:** öffentlich unter jeder veröffentlichten Challenge. „Antworten“ unter einem Kommentar antwortet gezielt darauf; Antworten stehen eingerückt darunter.
- **Erledigung bestätigen** und **Bounty auf Vertrauen:** Dafür braucht es zwei Konten, zum Beispiel Deins auf dem Handy und ein zweites im Browser mit einer anderen E-Mail-Adresse. Konto A erstellt eine Challenge mit Bounty, Konto B nimmt sie an und meldet sie erledigt, A bestätigt und sieht dann die Zahlungsdaten, B bestätigt den Empfang. Ohne zweites Konto geht es mit Beispieldaten über das Demo-Menü.
- **Deine Reise:** Kater in der Tab-Leiste (oder „Deine Reise“ im Konto). Oben der Kater mit einer Stimmung, die zum Geschehen passt, darunter Karten „Du bist dran“, die Bilanz (erstellt, angenommen, verdient) und der Verlauf.
- **Dein Konto:** Burger in der Tab-Leiste. Große Profilkarte → „Persönliche Angaben“ (Deckname, Ansprache, Kiez). Unter „Einstellungen“ Benachrichtigungen, Zahlungsdaten und Support als eigene Seiten. Darunter Abmelden, Pausieren, Löschen.

### Demo-Menü

**Logo „Kiez Coins“ im Feed oder den Kater in der Tab-Leiste lange gedrückt halten.** Dort kannst Du:

- zwischen echten Daten und Beispieldaten wechseln (Beispieldaten bleiben auf dem Gerät),
- mit Beispieldaten wechseln, wer Du bist (Peter J. oder die Nachbarschaftsgärtner*innen),
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
- Anmeldung vorerst mit Passwort: `signUp` bzw. `signInWithPassword` (`src/data/auth.tsx`). Der Code-Login (`signInWithOtp`/`verifyOtp`, Screen `onboarding/code`) bleibt im Code und kommt zurück, sobald es eine eigene Domain mit Mailversand gibt. Die Sitzung liegt im Gerät (AsyncStorage).
- Profil und Daten liegen in Tabellen (siehe unten).

## Datenbank (Supabase)

Das Schema steht in `supabase/migrations` und ist im Projekt „Kiez Coins Data“ eingespielt.

| Tabelle | Inhalt | Wer sieht es |
| --- | --- | --- |
| `profiles` | Deckname (einmalig), Kiez, Bild, Sperren | alle Angemeldeten; ändern nur Deckname, Kiez, Bild am eigenen Profil |
| `profile_settings` | Ansprache, Push, Pause, Kodex-Zustimmung, Onboarding fertig | nur man selbst |
| `payout_details` | gespeicherte IBAN/PayPal im Konto | nur man selbst |
| `challenges` | Challenges mit Status, Fotos, Meldung | alle Angemeldeten |
| `operation_names` | privater Operationsname | nur die annehmende Person |
| `comments`, `likes` | öffentliche Fragen, eigene Likes | Kommentare alle, Likes nur man selbst |
| `payout_shares` | Freigabe der Zahlungsdaten für eine Challenge | annehmende Person; Ersteller:in erst nach der Bestätigung |
| `user_reports`, `support_requests` | Meldungen und Support-Anfragen | nur die eigenen; ausgewertet im Supabase-Dashboard |

- **Statuswechsel** (annehmen, erledigt melden, bestätigen, ablehnen, bezahlt markieren, Erhalt bestätigen, abgeben) und das **Bearbeiten** einer offenen eigenen Challenge (`edit_open_challenge`) gehen nur über Datenbankfunktionen, die Rolle und Status prüfen. Direkt ändern kann die App eine Challenge nicht.
- **Antworten auf Kommentare:** Spalte `comments.reply_to_id` (Migration `20261020000300_comment_replies.sql`). Ein zusammengesetzter Fremdschlüssel sorgt dafür, dass eine Antwort zur selben Challenge gehört.
- Ohne Kiez, mit Pause oder Sperre kann man nur lesen. Bounties anbieten geht nicht mehr, wenn `profiles.can_offer_bounties` auf `false` steht (setzt die Moderation).
- **Fotos** liegen im öffentlichen Storage-Bucket `photos`, jede Person lädt nur in ihren eigenen Ordner hoch.
- **Test:** `supabase/tests/challenge_flow.sql` im SQL-Editor ausführen. Er spielt eine Bounty-Challenge einmal durch und rollt am Ende alles zurück.
- **Einmalig in Supabase nötig:** Unter *Authentication › Sign In / Providers › Email* den Schalter „Confirm email“ ausschalten. Sonst verlangt Supabase eine Bestätigungsmail, und die kommt ohne eigenen Mailserver nicht an.
- **Später, mit eigener Domain:** SMTP einrichten (z. B. Proton-SMTP-Übermittlung), die Vorlagen „Confirm signup“ und „Magic Link“ mit `{{ .Token }}` versehen und wieder auf den Code-Login umstellen.
- Der eingebaute Mailversand von Supabase schafft nur wenige Mails pro Stunde. Für mehr Tester*innen braucht es einen eigenen SMTP-Dienst.

## Figma abgleichen

Grundlage ist die Figma-Datei „Kiez Coins“. Ändert sich dort etwas, wird es hier von Hand nachgezogen:

- **Farben, Abstände, Schriften:** `src/theme/tokens.ts` (Namen wie die Figma-Variablen, `color/bg/screen` → `color.bg.screen`). Neu mit dem Upgrade „Nachtschicht“: `color.bg.glass`, `color.line.hairline`, Radien `xl`, `card`, `sheet`, `size.icon` (18 pt für Icons in Leisten), Schrift Inter Tight (`font.display`) mit den Text Styles `display`, `headline`, `cardTitle`, `metric`. Diese Werte fehlen noch in Figma.
- **Icons und Kater:** `src/components/icons/` (aus Figma als SVG exportiert). Das Zahnrad `settings` ist noch kein Figma-Icon.
- **Texte:** stehen direkt in den Screens unter `src/app`.

Bewusste Abweichungen von Figma:

- Die bewegten Farbverläufe (Shader) an Kater-Augen und Coins sind hier feste Verläufe.
- Statt der Handschrift „BROWN NOW TWO“ wird Inter verwendet, bis die Lizenz für Apps geklärt ist.
- Die Beispiel-IBAN ist eine gültige Test-IBAN, weil die App IBANs prüft.
- Standort und Push-Nachrichten sind nur gespielt.
- Solibeitrag gibt es im MVP nicht. Die Sperr-Regel ist in der Datenbank vorbereitet, gesetzt wird sie von Hand.
