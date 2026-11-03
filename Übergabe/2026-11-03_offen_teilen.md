# Geteilte Posts mit öffentlicher Seite

Pflichtaufgabe: Migration `supabase/migrations/20261103000200_teilen.sql` einspielen.

- Datum: 2026-11-03
- Status: offen, Bausteine 1, 2 und 4 auf `main`, Baustein 3 wartet auf Darias Entwurf
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, neuer Abschnitt „Teilen“, und die Datenbank-Doku (Tabellen `challenge_shares`, `share_visits`, Funktionen `can_have_share_page`, `share_challenge`, `shared_post`)

## So funktioniert das Teilen

Daria will über geteilte Posts Menschen ohne KiezCoins auf die App aufmerksam machen (03.11.2026).

1. **Öffentliche Seite.** `kiezcoins.de/c/<id>` zeigt Foto, Deckname, Kiez, Titel und Text ohne Anmeldung, darunter „KiezCoins kennenlernen“. Vorher-Nachher-Posts zeigen beide Fotos. Die Vercel-Funktion `api/c.mjs` füllt die Vorlage `/teilen-vorlage` (erzeugt in `scripts/build-download-site.mjs`) und setzt Open-Graph-Tags. So zeigen WhatsApp, Signal, Telegram, X, Bluesky und Mastodon den Link mit Foto.
2. **Link im Teilen-Knopf.** Der Knopf an eigenen Posts gibt den Post per `share_challenge` frei und teilt Titel plus `kiezcoins.de/c/<id>?von=teilen` (`src/data/shareChallenge.ts`). Fremde Posts und die Demo teilen wie bisher nur den Titel. Ohne Migration teilt der Knopf ebenfalls nur den Titel.
3. **Bildkarte für Instagram.** Offen, siehe unten.
4. **Zählung.** Jeder Seitenbesuch landet in `share_visits`, Vorschau-Abrufe der Messenger zählen nicht. Freigaben stehen in `challenge_shares`.

Regeln (Daria, 03.11.2026): Eine öffentliche Seite bekommen nur eigene, öffentliche Posts ohne Gruppe und ohne 5-km-Grenze, nicht im Entwurf und nicht gelöscht. Wird ein Post später privat oder gelöscht oder die Person gesperrt, zeigt die Seite sofort „Dieser Post ist nicht mehr öffentlich.“

Auswertung im SQL-Editor:

```sql
select c.title, count(v.*) as besuche
  from public.share_visits v join public.challenges c on c.id = v.challenge_id
 group by c.title order by besuche desc;
```

## Nächste Schritte

1. Daria spielt die Migration ein: [20261103000200_teilen.sql](https://github.com/amyria3/kiez-coins-app/blob/main/supabase/migrations/20261103000200_teilen.sql)
2. Daria ergänzt die Datenschutzerklärung: Geteilte Posts stehen mit Foto, Deckname und Kiez öffentlich im Web, solange der Post öffentlich ist.
3. Daria entwirft die Bildkarte für Instagram in Figma: Foto, Logo, `kiezcoins.de`. Danach baut Claude sie mit `react-native-view-shot` und `expo-sharing`. Das ändert den nativen Fingerabdruck, also entsteht eine neue APK.
4. Später: Anmeldungen über `?von=teilen` zählen. Die App liest den Parameter heute nicht aus.
5. Später: Schalter im Konto „Andere dürfen meine Posts teilen“, damit auch fremde Posts eine Seite bekommen.

## Betroffene Dateien

- `supabase/migrations/20261103000200_teilen.sql`
- `api/c.mjs`, `vercel.json`, `scripts/build-download-site.mjs` (Vorlage und Weiterleitung `/c/:id`)
- `src/data/shareChallenge.ts`, `src/data/remote.ts` (`shareChallengePublicly`)
- `src/components/ChallengePost.tsx`, `src/components/BeforeAfterPost.tsx`, `src/app/challenge/[id]/index.tsx`
