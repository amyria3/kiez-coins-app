Pflichtaufgabe (Daria): kiezcoins.de bei INWX auf Vercel umstellen.

Datum: 2026-11-08 · Status: offen · Ergebnis gehört nach Documentation `kiez-coins/BETRIEB.md` (Abschnitt „Domain“) oder an die passende Stelle nach dessen `AGENTS.md`.

## Warum

kiezcoins.de zeigt heute auf einen alten Server (A-Eintrag `185.181.104.242`, nginx, ohne gültiges HTTPS). Die Website und die Web-App laufen auf Vercel unter kiezcoins.vercel.app. Die App baut aber alle Links mit kiezcoins.de (`WEB_APP_URL` in `src/data/groups.ts`). Deshalb gehen ins Leere:

- Einladungslinks und Instant-Einladungen (QR) für Gruppen und Freundschaften
- geteilte Posts und die Seite `/finanzierung` aus der App
- der Instant-Download auf der Website (`https://kiezcoins.de/laden`) und die Codes unter `/qr`

## So stellst du die Domain um

1. Vercel › Projekt `kiez-coins-app` › Settings › Domains: `kiezcoins.de` und `www.kiezcoins.de` hinzufügen. Vercel zeigt danach für jede Adresse die DNS-Einträge, die es erwartet (für `kiezcoins.de` einen A-Eintrag, für `www` einen CNAME).
2. INWX › Domains › kiezcoins.de › DNS (Nameserver bleiben bei INWX): den alten A-Eintrag `185.181.104.242` löschen und genau die Einträge aus Schritt 1 anlegen. Gibt es für `www` einen alten Eintrag, ihn ebenfalls ersetzen.
3. Warten, bis Vercel beide Adressen als „Valid Configuration“ zeigt (meist Minuten, selten bis zu einigen Stunden). Das HTTPS-Zertifikat stellt Vercel selbst aus.
4. Prüfen: https://kiezcoins.de, https://kiezcoins.de/app und https://kiezcoins.de/finanzierung öffnen sich ohne Warnung.

## Danach (Claude)

- In `src/components/FinanceOverview.tsx` (`siteUrl`) zeigt der Link in der nativen App noch auf kiezcoins.vercel.app. Auf kiezcoins.de umstellen.
- Einladungslink und Instant-Einladung einmal am Handy testen.
