# Kamera auch in der Leiste, Knöpfe zählen

Datum: 2026-10-31 · Status: offen, bis die Migration eingespielt ist · Ziel in Documentation: `kiez-coins/design/UX_UI_Regeln.md` (Leiste), `kiez-coins/DATENBANK.md` (`button_presses`)

Pflichtaufgabe: Migration `20261031000100_knopf_zaehler.sql` in Supabase einspielen. Ohne sie zählt die App nicht (stört aber nichts).

## Entscheidungen von Daria (30.10.2026)

- Kiez-Look: Der Kamera-Knopf (Challenge erstellen) sitzt zusätzlich unten in der Leiste zwischen Chats und Menü. Oben rechts bleibt er auch.
- Zählen, welcher Knopf häufiger gedrückt wird.

## Umsetzung

- `src/components/TabBar.tsx`: blaue Pille in der Leiste (`itemCamera`, 64 breit). Auf anderen Seiten (Chats, Me) öffnet sie den Feed mit dem Erstellen-Blatt.
- Zählen: `countButton` in `src/data/remote.ts` schreibt Knopf (`kamera-oben`, `kamera-leiste`), Look und Zeitpunkt in `button_presses`. Ohne Person, ohne Gerät. Der Fashionable Look zählt seine Kamera in der Leiste als `kamera-leiste`.
- Auswertung: „Dein Konto › Umfrage-Ergebnis“ (nur Moderatorinnen), Karte „Kamera-Knopf: oben oder in der Leiste?“ mit Zahl und Anteil.

## Offene Punkte

- [ ] Migration einspielen.
- [ ] Datenschutzerklärung: Braucht die anonyme Zählung von Knopfdrücken einen Satz? Frage an Daria.
