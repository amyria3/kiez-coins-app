# We-Challenge im Kiez: Coins für mehrere Personen

Pflichtaufgabe: Migration `supabase/migrations/20261028000400_we_challenge_coins_geteilt.sql` im Supabase-SQL-Editor ausführen, nach `20261028000200_kiez_edensteine.sql` und `20261028000300_we_challenge_teilnehmende.sql`.

Datum: 28.10.2026. Status: offen, Code im PR, Migration noch nicht ausgeführt. Gehört nach: Documentation, App-Stand und Entscheidungen, Abschnitt „We-Challenge“ und „Coins“; Datenbank-Doku (Tabelle `challenge_payouts`, Funktionen).

## Daria hat am 28.10.2026 entschieden

- Manche We-Challenges im Kiez können mehrere Menschen annehmen. Die Erstellerin legt die Zahl fest.
- Eine We-Challenge im Kiez hat als Belohnung Edensteine oder Coins (Versprechen von echtem Geld). Umschalter in der App: „Das ist mir bares Geld wert“.
- Coins gibt es nur im Kiez. Gruppenaufgaben bleiben bei Edensteinen.
- „Offen“ oder „Auf Anfrage“ hängt nicht von der Belohnung ab.
- Mit Coins machen höchstens 10 Personen mit, pro Person mindestens 5 €. Die bisherige Obergrenze von 50 € gilt pro Platz (bis 500 € bei 10 Plätzen).
- Der Betrag wird geteilt, unter allen, die beim Bestätigen ausgewählt sind. Gerundet auf Cent, übrige Cent an die Ersten (20 € für 3: 6,67 €, 6,67 €, 6,66 €).
- Bestätigen je Person: Beim „Erledigung prüfen“ sind alle Teilnehmenden vorausgewählt. Die Erstellerin wählt einzelne ab. Abgewählte bekommen weder Coins noch Edensteine (Status `unconfirmed`). „Rückgängig machen“ wählt wieder alle aus.

## So ist es gebaut

- Regel in der Datenbank: `challenges_participants_reward` (Betrag zwischen 5 × und 50 × `max_participants`, höchstens 10 Plätze mit Coins). Die alte Spaltenregel „5 bis 50“ fällt weg.
- `payout_shares`: eine Freigabe je Person (Primärschlüssel `challenge_id, user_id`). Alle Teilnehmenden dürfen freigeben.
- Neue Tabelle `challenge_payouts`: Anteil je Person in Cent, `paid_marked_at`, `paid_at`. Entsteht in `confirm_challenge`. Bestehende Bounties im Zahlungsschritt übernimmt die Migration.
- `confirm_challenge(id, user_ids)`: Auswahl, Teilen. `mark_participant_paid(id, user, paid)`: je Person. `confirm_bounty_received`: jede Person für sich. Status der Challenge: `paid_marked`, wenn alle markiert sind, `paid`, wenn alle bestätigt haben.
- App: `src/data/coins.ts`, `src/components/compose/RewardField.tsx`, Bildschirme `challenge/create/step-2`, `challenge/[id]/edit`, `review`, `pay`, `payment`, `report/payout?nur=1` (Zahlungsdaten freigeben ohne Erledigt-Melden).
- Lokal mit Postgres 16 geprüft: Grenzen, Freigabe weiterer Personen, Teilen mit Rundung, Abwählen, Rückgängig, Bezahlen und Bestätigen je Person.

## Offene Punkte

- Nicht im Browser geprüft (ohne Testkonto keine Anmeldung möglich). Nach dem Ausführen der Migration einmal durchspielen: Erstellen mit Coins für 3 Personen, drei Konten treten bei, Erledigt melden, eine Person abwählen, je Person bezahlen und bestätigen.
- Push-Nachrichten an weitere Teilnehmende (Anteil bezahlt) gibt es noch nicht.
