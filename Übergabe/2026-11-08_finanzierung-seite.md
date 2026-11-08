# Seite /finanzierung mit Finanzierungsmodell und Ist-Zustand

Datum: 2026-11-08 · Status: erledigt · Gehört in Documentation: `kiez-coins/website/Website.md`, Datenbank-Doku (Migrationen und Funktionen) und `kiez-coins/briefing/09_Monetarisierung.md`.

Pflichtaufgabe: Migration `supabase/migrations/20261108000100_finanzierung_ist.sql` im SQL-Editor einspielen. Ohne sie zeigt der Ist-Zustand „nicht erreichbar“.

## Entscheidungen (Daria, 08.11.2026)

- Eigene Seite `kiezcoins.de/finanzierung` (`website/finanzierung.html`, von Hand geschrieben, nicht vom Build-Skript). Kein Link auf der Startseite, `noindex, nofollow`.
- Fixkosten zuerst. Vom Rest bekommt die Entwicklerin 30 %, die Community 70 % (Stock).
- Modelle: Schwalbe = Crossposting-Feature (10,99 € im Jahr über die Webseite), Dachs = Partnerläden, Storch = Community-Sponsorin.
- Fixkosten ohne Buchhaltung und ohne Rechtstexte: Steuer macht Daria über Check24, Belege sammelt sie mit Claude.
- Umschalter Modell / Ist-Zustand. Ist-Zustand: echte Zahlen aus der Datenbank, keine Abos, Fixkosten der Testphase.
- Punkte: 1 Punkt = 1 Person, als Scheibe. In der Mitte die bezahlten Accounts in drei Gruppen, darum aktive, außen inaktive Nutzer:innen.
- Darunter Zeitleiste M0 bis M4 mit derselben Komponente und festen Werten. Kein Fortschritt zum Ziel von 3.000 €.

## Datenbank

`public.finanzierung_ist()` gibt `{ registriert, aktiv, stand }` zurück, security definer, darf ohne Anmeldung laufen (wie `tester_count`).
Registriert: Profile ohne Testkonten (`is_test`), Gruppenprofile (`is_group`) und gesperrte Konten. Aktiv: davon alle mit Anmeldung, Aufruf (`challenge_views`), Post, Kommentar, Like oder Gruppenbeitritt in den letzten 30 Tagen.

## Annahmen im Modell

Stehen oben im Script von `website/finanzierung.html` (Objekte `A` und `FIX`) und auf der Seite unter „Mit diesen Annahmen rechnet das Modell“.
