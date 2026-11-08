# Seite /finanzierung mit Finanzierungsmodell und Ist-Zustand

Datum: 2026-11-08 · Status: erledigt · Gehört in Documentation: `kiez-coins/website/Website.md`, Datenbank-Doku (Migrationen und Funktionen) und `kiez-coins/briefing/09_Monetarisierung.md`.

Pflichtaufgabe: Migrationen `supabase/migrations/20261108000100_finanzierung_ist.sql` und `20261108000200_finanzierung_mein_punkt.sql` im SQL-Editor einspielen. Ohne sie zeigt der Ist-Zustand „nicht erreichbar“, und der Link aus der App zeigt keinen eigenen Punkt.

## Entscheidungen (Daria, 08.11.2026)

- Eigene Seite `kiezcoins.de/finanzierung` (`website/finanzierung.html`, von Hand geschrieben, nicht vom Build-Skript). Kein Link auf der Startseite, `noindex, nofollow`.
- Fixkosten zuerst. Vom Rest bekommt die Entwicklerin 30 %, die Community 70 % (Stock).
- Modelle: Schwalbe = Crossposting-Feature (10,99 € im Jahr über die Webseite), Dachs = Partnerläden, Storch = Community-Sponsorin.
- Fixkosten ohne Buchhaltung und ohne Rechtstexte: Steuer macht Daria über Check24, Belege sammelt sie mit Claude.
- Umschalter Modell / Ist-Zustand. Ist-Zustand: echte Zahlen aus der Datenbank, keine Abos, Fixkosten der Testphase.
- Punkte: 1 Punkt = 1 Person, als Scheibe. In der Mitte die bezahlten Accounts in drei Gruppen, darum aktive, außen inaktive Nutzer:innen.
- Darunter Zeitleiste M0 bis M4 mit derselben Komponente und festen Werten. Kein Fortschritt zum Ziel von 3.000 €.
- Zeitleiste spricht von Nachbarschaften, nicht von Kiezen: KiezCoins wächst vor allem dort, wo viele Familien leben, und dort, wo sich die Nachbar:innen schon kennen. M2: „So stabil wären wir mit 15 Nachbarschaften in Leipzig“.
- Interne Hinweise (zum Beispiel zur Förderbewerbung) stehen nicht auf der Seite.
- Eigener Punkt: Nur ich sehe meinen Punkt, und nur über einen Link aus der App. Der Link steht in „Dein Konto“ direkt unter „Me“: Karte „Finanzierung“, Text „Dein Punkt in der Community“, Phosphor-Icon `chart-pie-slice` (`PH.finance`). Das Icon fehlt noch im Icon-Regelwerk.

## Datenbank

`public.finanzierung_ist()` gibt `{ registriert, aktiv, stand }` zurück, security definer, darf ohne Anmeldung laufen (wie `tester_count`).
Registriert: Profile ohne Testkonten (`is_test`), Gruppenprofile (`is_group`) und gesperrte Konten. Aktiv: davon alle mit Anmeldung, Aufruf (`challenge_views`), Post, Kommentar, Like oder Gruppenbeitritt in den letzten 30 Tagen.

`public.finanzierung_link()` (nur angemeldet) legt einen Code in `public.finanzierung_links` an (RLS ohne Policies, nur über die Funktionen). Die App öffnet `kiezcoins.de/finanzierung#ich=<code>`.
`public.finanzierung_mein_punkt(p_code text)` (auch ohne Anmeldung) löst den Code ein: gilt 10 Minuten und nur einmal. Gibt die Zahlen wie `finanzierung_ist` plus `kategorie` (aktiv, inaktiv; Testkonten null) und `rang` (Reihenfolge der Anmeldung in der Gruppe, ab 0) zurück. Die Seite markiert damit den k-ten Punkt der Gruppe mit „Du“.
Tests: `supabase/tests/finanzierung.sql`. Die lokale Ersatzdatei kennt jetzt `auth.users.last_sign_in_at` und `is_anonymous`, `pruefen.sh` überspringt pgaudit.

## Code

- `src/app/account/index.tsx`: Karte „Finanzierung“, `openFinance` (Web im selben Tab, sonst `Linking.openURL`)
- `src/data/remote.ts`: `financeLinkCode()`
- `src/components/icons/fashionableSvgs.ts`, `phosphorSvgs.ts`, `scripts/phosphor-icons.mjs`: Icon `chart-pie-slice`
- `src/i18n/*.json`: „Finanzierung“, „Dein Punkt in der Community“

## Annahmen im Modell

Stehen oben im Script von `website/finanzierung.html` (Objekte `A` und `FIX`) und auf der Seite unter „Mit diesen Annahmen rechnet das Modell“.
