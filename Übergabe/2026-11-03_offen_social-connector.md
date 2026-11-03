# KiezCoins-Connector für offizielle Posts

Pflichtaufgabe: Migration `supabase/migrations/20261103000100_offizielle_posts.sql` einspielen, Edge Function `kiezcoins-social` deployen, Secrets setzen.

- Datum: 2026-11-03
- Status: offen, Code fertig auf Branch `social-connector`, noch nicht eingerichtet
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, neuer Abschnitt „Offizielle Posts“, und die Datenbank-Doku (Tabellen `social_posts`, `social_tokens`, Spalte `profiles.is_official`, Funktion `claim_social_posts`, Cron-Job `kiezcoins-social-publish`)

## So funktioniert der Connector

Daria will mit beiden Claude-Accounts einmal am Tag einen Post zu gesellschaftspolitischen und anthropologischen Themen veröffentlichen, mit minimalem Aufwand. Ein Aufruf bringt den Post auf vier Kanäle: KiezCoins, X, Bluesky und Instagram. Metricool fällt weg.

- Die Edge Function `kiezcoins-social` ist ein MCP-Server. Beide Claude-Accounts fügen dieselbe URL als eigenen Connector hinzu: `https://<projekt>.supabase.co/functions/v1/kiezcoins-social/mcp/<SOCIAL_MCP_KEY>`.
- Werkzeuge: `post` (sofort oder geplant), `list_posts`, `cancel_post`.
- Auf KiezCoins erscheint der Post als Bild-Beitrag (`type 'photo'`) des offiziellen Kontos, 30 Tage offen, ohne Punkt. So zeigt ihn die App in „Kiez“ und „Überall“.
- Geplante Posts liegen in `social_posts`. Ein Cron-Job ruft alle 5 Minuten `…/kiezcoins-social/publish` auf.
- Jeder Kanal läuft für sich. Scheitert einer, erscheinen die anderen, und der nächste Lauf versucht den gescheiterten erneut, höchstens 3 Versuche.
- Bild: JPEG bis 950 KB, da Bluesky höchstens 1 MB nimmt und Instagram nur JPEG. Es liegt in `photos/<id des offiziellen Kontos>/social/`.
- Grenzen: Titel 60 Zeichen, Text 500 (KiezCoins), X 280 (`text_x`), Bluesky 300 (`text_bluesky`).
- Kosten: X 0,015 $ pro Post, 0,20 $ mit Link. Bluesky und Instagram kostenlos.

## Nächste Schritte für Daria

1. **Offizielles Konto anlegen.** In der App ein Konto mit dem Decknamen `KiezCoins` anlegen und den Kiez setzen. Danach im SQL-Editor:
   ```sql
   update public.profiles set is_official = true where lower(handle) = 'kiezcoins';
   ```
2. **Migration einspielen:** [20261103000100_offizielle_posts.sql](https://github.com/amyria3/kiez-coins-app/blob/social-connector/supabase/migrations/20261103000100_offizielle_posts.sql)
3. **X:** Im [X Developer Portal](https://developer.x.com) eine App anlegen, unter „User authentication settings“ Read and Write einstellen, danach Access Token und Access Token Secret erzeugen und Guthaben aufladen.
4. **Bluesky:** In Bluesky unter Einstellungen › Datenschutz und Sicherheit › App-Passwörter ein App-Passwort anlegen.
5. **Instagram:** Das Instagram-Konto auf Creator oder Business umstellen. Auf [developers.facebook.com](https://developers.facebook.com) eine App mit dem Anwendungsfall „Instagram API mit Instagram-Login“ anlegen, das eigene Instagram-Konto als Tester hinzufügen und die Einladung in Instagram annehmen. Dann im Abschnitt „Zugriffsschlüssel generieren“ den Token für das Konto erzeugen, mit der Berechtigung `instagram_business_content_publish`.
6. **Secrets setzen** (Terminal im Ordner `~/kiez-coins-app`). Zwei Schlüssel erzeugt `openssl rand -hex 24`:
   ```bash
   npx supabase secrets set SOCIAL_MCP_KEY=<schlüssel 1> SOCIAL_CRON_KEY=<schlüssel 2> \
     X_API_KEY=… X_API_SECRET=… X_ACCESS_TOKEN=… X_ACCESS_TOKEN_SECRET=… \
     BLUESKY_HANDLE=kiezkatz.bsky.social BLUESKY_APP_PASSWORD=… \
     IG_ACCESS_TOKEN=…
   ```
7. **Deployen:**
   ```bash
   npx supabase functions deploy kiezcoins-social --no-verify-jwt
   ```
8. **Cron-Job freischalten** im SQL-Editor, mit der Projekt-Referenz und Schlüssel 2:
   ```sql
   select vault.create_secret('https://<projekt>.supabase.co/functions/v1/kiezcoins-social', 'kiezcoins_social_url');
   select vault.create_secret('<schlüssel 2>', 'kiezcoins_social_cron_key');
   ```
9. **Connector hinzufügen** in beiden Claude-Accounts: Einstellungen › Connectors › eigenen Connector hinzufügen, URL aus „So funktioniert der Connector“ mit Schlüssel 1.
10. **Testen:** Claude postet einen Testpost nur auf KiezCoins (`channels: ["kiezcoins"]`), danach einen auf alle vier Kanäle.

## Offene Fragen an Daria

- Offizielle Posts haben noch kein eigenes Abzeichen in der App. Ein Abzeichen braucht ein neues Icon nach dem Icon-Regelwerk.

## Betroffene Dateien

- `supabase/migrations/20261103000100_offizielle_posts.sql`
- `supabase/functions/kiezcoins-social/` (`index.ts`, `publish.ts`, `x.ts`, `bluesky.ts`, `instagram.ts`)
