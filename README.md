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
- **Feed:** Reiter für Challenges in der Nähe, Wave Challenges (noch geplant, der Kater erklärt es) und „Pleasure“ (erledigte Challenges). Logo und Begrüßung scrollen weg, die Reiter bleiben oben. Am Anfang ist der Feed leer, bis jemand die erste Challenge erstellt. Nach unten ziehen lädt neu.
- **Challenge erfüllen:** Challenge öffnen → „Challenge annehmen“ → Operation taufen (freiwillig), Fragen in den Kommentaren stellen → „Erledigt melden“ mit Foto → Zahlungsdaten für die Bounty freigeben.
- **Challenge erstellen:** Kamera-Symbol im Feed. „Als Entwurf speichern“ geht in beiden Schritten; Entwürfe sieht nur man selbst.
- **Deine Challenges verwalten:** „Verwalten“ am eigenen Post, im Detail oder im Konto. Solange niemand angenommen hat, lässt sich eine Challenge bearbeiten oder schließen. Geschlossene bleiben mit Etikett „Geschlossen“ im Feed. Löschen geht nur bei Entwürfen.
- **Kommentare:** Alle können unter veröffentlichten Challenges kommentieren, bei geschlossenen nur noch lesen.
- **Erledigung bestätigen** und **Bounty auf Vertrauen:** Dafür braucht es zwei Konten, zum Beispiel Deins auf dem Handy und ein zweites im Browser mit einer anderen E-Mail-Adresse. Konto A erstellt eine Challenge mit Bounty, Konto B nimmt sie an und meldet sie erledigt, A bestätigt und sieht dann die Zahlungsdaten, B bestätigt den Empfang. Ohne zweites Konto geht es mit Beispieldaten über das Demo-Menü.
- **Deine Reise:** Tipp auf Logo und Kater oben im Feed (oder „Deine Reise“ im Konto). Alle Challenges, die Du erstellt oder angenommen hast, als Kacheln mit Etikett. Ein oranger Punkt zeigt, wo Du dran bist; derselbe Punkt sitzt dann auch am Kater im Feed. Der Kater oben zeigt eine Stimmung, die zum Geschehen passt.
- **Konto und Einstellungen:** Menü in der Tab-Leiste unten. Profilkarte mit Deckname und Bild (Bearbeiten unter `account/profile`), Ansprache ändern, Zahlungsdaten und Freigaben verwalten, Konto pausieren oder löschen.

### Demo-Menü

**Logo „Kiez Coins“ im Feed lange gedrückt halten.** Dort kannst Du:

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
| `challenges` | Challenges mit Status (auch `draft` und `closed`), Fotos, Meldung | alle Angemeldeten; Entwürfe nur die Ersteller:in |
| `operation_names` | privater Operationsname | nur die annehmende Person |
| `comments`, `likes` | öffentliche Fragen, eigene Likes | Kommentare alle, Likes nur man selbst |
| `payout_shares` | Freigabe der Zahlungsdaten für eine Challenge | annehmende Person; Ersteller:in erst nach der Bestätigung |
| `user_reports`, `support_requests` | Meldungen und Support-Anfragen | nur die eigenen; ausgewertet im Supabase-Dashboard |

- **Statuswechsel** (veröffentlichen, bearbeiten, schließen, annehmen, erledigt melden, bestätigen, ablehnen, bezahlt markieren, Erhalt bestätigen, abgeben) gehen nur über Datenbankfunktionen, die Rolle und Status prüfen. Direkt ändern kann die App eine Challenge nicht.
- Ohne Kiez, mit Pause oder Sperre kann man nur lesen. Bounties anbieten geht nicht mehr, wenn `profiles.can_offer_bounties` auf `false` steht (setzt die Moderation).
- **Fotos** liegen im öffentlichen Storage-Bucket `photos`, jede Person lädt nur in ihren eigenen Ordner hoch.
- **Tests:** `supabase/tests/challenge_flow.sql` (Bounty-Ablauf) und `supabase/tests/drafts_close_comments.sql` (Entwürfe, Schließen, Kommentare) im SQL-Editor ausführen. Beide rollen am Ende alles zurück.
- **Einmalig in Supabase nötig:** Unter *Authentication › Sign In / Providers › Email* den Schalter „Confirm email“ ausschalten. Sonst verlangt Supabase eine Bestätigungsmail, und die kommt ohne eigenen Mailserver nicht an.
- **Später, mit eigener Domain:** SMTP einrichten (z. B. Proton-SMTP-Übermittlung), die Vorlagen „Confirm signup“ und „Magic Link“ mit `{{ .Token }}` versehen und wieder auf den Code-Login umstellen.
- Der eingebaute Mailversand von Supabase schafft nur wenige Mails pro Stunde. Für mehr Tester*innen braucht es einen eigenen SMTP-Dienst.

## Doku

Konzept, Entscheidungen und Stand der App liegen in den Projektdateien unter `kiez-coins/` (Übersicht: `README.md`, Entscheidungen: `ENTSCHEIDUNGEN.md`, Stand: `app/Stand_App.md`).

## Figma abgleichen

Grundlage ist die Figma-Datei „Kiez Coins“. Ändert sich dort etwas, wird es hier von Hand nachgezogen:

- **Farben, Abstände, Schriften:** `src/theme/tokens.ts` (Namen wie die Figma-Variablen, `color/bg/screen` → `color.bg.screen`).
- **Icons und Kater:** `src/components/icons/` (aus Figma als SVG exportiert).
- **Texte:** stehen direkt in den Screens unter `src/app`.

Bewusste Abweichungen von Figma:

- Die bewegten Farbverläufe (Shader) an Kater-Augen und Coins sind hier feste Verläufe.
- Statt der Handschrift „BROWN NOW TWO“ wird Inter verwendet, bis die Lizenz für Apps geklärt ist.
- Die Beispiel-IBAN ist eine gültige Test-IBAN, weil die App IBANs prüft.
- Standort und Push-Nachrichten sind nur gespielt.
- Solibeitrag gibt es im MVP nicht. Die Sperr-Regel ist in der Datenbank vorbereitet, gesetzt wird sie von Hand.
