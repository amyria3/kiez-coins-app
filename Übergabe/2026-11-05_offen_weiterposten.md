# Weiterposten auf BlueSky und Mastodon

Stand 05.11.2026: Migrationen `20261103000200_teilen.sql` und `20261105000100_weiterposten.sql` eingespielt, Edge Function `weiterposten` deployt (Version 1, mit Anmeldung). Offen: Test durch Daria.

- Datum: 2026-11-05
- Status: offen. Code auf `main` (PR #155), für alle ausgeschaltet, für Moderatorinnen zum Testen an
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Teilen“, und die Datenbank-Doku (Tabellen `crosspost_accounts`, `crosspost_posts`, Edge Function `weiterposten`)

## Entscheidungen (Daria, 05.11.2026)

- Erst kein Geld nehmen. Nur Schnittstellen, die nichts kosten: BlueSky und Mastodon.
- Weiterposten wird gebaut, aber noch nicht freigegeben (`CROSSPOST_ACTIVE` in `src/data/crosspost.ts`). Moderatorinnen sehen die echten Schalter schon.
- Ein Knopf zählt, wer die Funktion für Meta und X nutzen würde (einmal pro Gerät, `button_presses`, Knopf `weiterposten-meta-x`, Auswertung im Umfrage-Ergebnis). Bezahlen erst ab etwa 500.
- Die Auswahl steckt hinter der Zeile „Weiterposten“ mit Zahnrad im Erstellen-Blatt.

## So funktioniert es

1. **Konto verbinden** (Dein Konto › Verbundene Konten): BlueSky mit Handle und App-Passwort, Mastodon mit Instanz und Zugangsschlüssel (Einstellungen › Entwicklung › Neue Anwendung, Rechte `write:statuses`, `write:media`, `profile`). Die Edge Function meldet sich zur Probe an und speichert den Zugang in `crosspost_accounts`. Den Zugang liest nur die Edge Function mit dem Service-Schlüssel.
2. **Schalter** im Blatt „Weiterposten“: pro verbundenem Konto an oder aus, auf dem Gerät gespeichert.
3. **Nach dem Veröffentlichen** ruft die Vorschau (`src/app/challenge/create/preview.tsx`) die Edge Function im Hintergrund auf. Nur öffentliche Posts ohne 5-km-Grenze. Die Funktion gibt den Post per `share_challenge` frei (Seite `kiezcoins.de/c/<id>`) und postet Titel, Text, Foto und Link. Ergebnis und Fehler stehen in `crosspost_posts`; jeder Post geht höchstens einmal pro Plattform raus.

BlueSky nimmt Fotos bis 1 MB. Größere Fotos gehen als Linkkarte ohne Bild raus.

## Nächste Schritte

1. Daria spielt die Migration ein: [20261105000100_weiterposten.sql](https://github.com/amyria3/kiez-coins-app/blob/main/supabase/migrations/20261105000100_weiterposten.sql). Vorher muss `20261103000200_teilen.sql` eingespielt sein.
2. Daria deployt die Edge Function: `npx supabase functions deploy weiterposten` (mit Anmeldung, also ohne `--no-verify-jwt`). Keine Secrets nötig.
3. Daria testet: Konto bei BlueSky oder Mastodon verbinden, einen Kiez-Post veröffentlichen, nachsehen, ob er dort erscheint. Prüfabfrage: `select * from public.crosspost_posts order by created_at desc;`
4. Später: Anzeige nach dem Posten („Auch auf BlueSky gepostet“), Mastodon-Anmeldung per OAuth statt Zugangsschlüssel, Datenschutzerklärung ergänzen (Zugänge zu BlueSky und Mastodon werden gespeichert).
5. Meta (Instagram, Facebook): kostenlos, braucht aber eine App bei Meta for Developers, eine Prüfung durch Meta und Business- oder Creator-Konten. X kostet pro Post, bleibt außen vor.
6. Freigeben: `CROSSPOST_ACTIVE = true`.

## Betroffene Dateien

- `supabase/migrations/20261105000100_weiterposten.sql`
- `supabase/functions/weiterposten/index.ts`
- `src/data/crosspost.ts`, `src/components/compose/CrosspostRow.tsx`, `src/app/account/weiterposten.tsx`, `src/app/account/index.tsx`, `src/app/challenge/create/preview.tsx`, `src/components/Form.tsx` (`Toggle`), `src/app/account/survey/results.tsx`
