Pflichtaufgabe: Migration `supabase/migrations/20261025000200_error_reports.sql` im Supabase-Projekt „Kiez Coins Data“ ausführen (SQL-Editor). Ohne sie meldet der Fehler-Screen „nicht angekommen“ und bietet nur die E-Mail an.

# Fehler-Screen mit Fehlerbericht

- Datum: 2026-10-25
- Status: offen (Code auf `main`, Migration noch nicht im Projekt)
- Gehört in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt Fehler und Support), Datenbank-Doku (neue Tabelle `error_reports`), App-Stand.

## Entscheidung

Daria hat am 25.10.2026 einen Fehler-Screen verlangt, über den Nutzer:innen den Fehlerbericht an das Team schicken.

## Was gebaut ist

- `src/components/ErrorScreen.tsx`: Fehler-Screen. Expo Router zeigt ihn über `ErrorBoundary` in `src/app/_layout.tsx`, wenn ein Screen beim Rendern abstürzt. Er nutzt nur React-Native-Bausteine und Tokens, damit er auch steht, wenn der Fehler aus einer App-Komponente kommt.
  - Freiwilliges Feld „Was hast Du gerade gemacht?“
  - „Fehlerbericht senden“ schreibt in `error_reports`. Klappt das nicht, erscheint „Per E-Mail senden“ (mailto an `OPERATOR.email` aus `src/data/legal.ts`).
  - „Nochmal versuchen“, „Zurück zum Kiez-Look“ (nur im Fashionable Look), „Details anzeigen“ mit dem Stacktrace.
- `src/lib/errorReport.ts`: baut den Bericht (Meldung, Stack, Kommentar, Screen, Gerät, Version, Look, Startstand) und sendet ihn. Der Screen kommt aus `usePathname` in `RootStack`, im Web aus der Adresse.
- `public/index.html`: Die Startfehler-Anzeige der Web-App hat jetzt auch „Fehlerbericht senden“ (direkter REST-Aufruf mit dem Publishable Key) und als Rückfall den E-Mail-Link.
- Tabelle `error_reports`: Anlegen dürfen alle, auch ohne Anmeldung; `user_id` setzt die Datenbank aus `auth.uid()`. Lesen und `status` (`new`, `done`) setzen dürfen nur Moderator:innen. Test: `supabase/tests/error_reports.sql` (läuft lokal grün).

## Nächster Schritt

1. Migration ausführen (siehe oben).
2. Berichte lesen: im Supabase-Table-Editor, Tabelle `error_reports`, neueste zuerst.

## Offene Fragen an Daria

- Sollen die Fehlerberichte auch im Moderationsbereich der App (`manage.tsx`) erscheinen?
- Soll eine Benachrichtigung (E-Mail über Brevo) bei jedem neuen Bericht kommen?
- Anlegen ohne Anmeldung ist nur durch Längenbegrenzungen geschützt. Bei Spam: Rate-Limit über eine Datenbankfunktion ergänzen.
- Der Fehler-Screen ist noch nicht übersetzt (feste deutsche Texte, wie zuvor), da er bewusst ohne Textsystem läuft.
