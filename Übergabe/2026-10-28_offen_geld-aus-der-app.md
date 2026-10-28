# Geld steht nicht mehr in den Rechtstexten, die App zahlt weiter in Euro

Datum: 2026-10-28
Status: offen
Pflichtaufgabe: Migration `supabase/migrations/20261028000300_app_texts_ohne_geld.sql` im Supabase-SQL-Editor ausführen (nur Texte-CMS, die App läuft auch ohne).
Ergebnis gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Geld) und die Datenbank-Doku (neue Migration).

## Daria hat entschieden, Geld vorerst aus den Rechtstexten zu nehmen (27.10.2026)

- Edensteine sind die ideelle Währung und ersetzen Geld.
- Geändert in `src/data/legal.ts`, `src/i18n/<sprache>.json`, `website/datenschutz.html`, `website/nutzungsbedingungen.html`:
    - Datenschutz: Abschnitt „Zahlungsdaten gibst Du gezielt frei“ entfällt, „Zahlungsdaten“ fehlt in der Löschliste.
    - Nutzungsbedingungen 4: „Coins und Edensteine sind ideelle Anerkennung“, ohne Überweisung, PayPal und Steuern.
    - Nutzungsbedingungen 6: Haftung für „Absprachen und Aufgaben“, ohne „Zahlungen“.

## Die App widerspricht den Rechtstexten an diesen Stellen

- Challenges tragen einen Euro-Betrag (`formatEuro` in `src/data/format.ts`, Erstellen in `src/app/challenge/create/step-2.tsx`).
- Die App fragt IBAN und PayPal ab und gibt sie frei: `src/components/PaymentDetails.tsx`, `src/app/settings/payout.tsx`, `src/app/challenge/[id]/payment/`, `src/app/challenge/[id]/pay/`, `src/app/challenge/[id]/report/payout.tsx`, `src/app/challenge/[id]/review/`.
- „Konto löschen“ nennt Zahlungsdaten (`src/app/account/delete/index.tsx`).
- Solange die App Zahlungsdaten speichert, muss der Datenschutz sie nennen (Art. 13 DSGVO).

## Nächster Schritt

- Daria entscheidet: Euro-Betrag und Zahlungsdaten in der App ausblenden (Coins nur als ideelle Zahl) oder den Abschnitt „Zahlungsdaten“ im Datenschutz zurückholen.
- `website/` entsteht sonst mit `node scripts/build-download-site.mjs`. Die beiden Seiten sind hier von Hand angepasst, ein Neubau ergibt denselben Text.
