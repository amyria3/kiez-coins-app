# We-Challenge: Vorher und Nachher wie bei der Me-Challenge

Datum: 2026-10-27 · Status: Notiz für die Doku · Gehört nach: Documentation, App-Stand und Entscheidungen, Abschnitt „We-Challenge“.

Keine Migration. Alle Daten gibt es schon: Das Foto der Aufgabe ist das Vorher, das Erledigungsfoto (`report_photo_path`) das Nachher.

## Entscheidung

Daria, 27.10.2026: We-Challenges (Kiez und Gruppe) bekommen Vorher und Nachher. #vorher markiert die Beschreibung, #nachher die Notiz zur Erledigung. Eine Dauer wie bei der Me-Challenge zeigt die We-Challenge nicht.

## Was sich ändert

- Erstellen und Bearbeiten (Erstellen-Blatt, `challenge/create/step-1`, Gruppenaufgabe, `challenge/[id]/edit`): Die Beschreibung trägt vorn die feste Marke #vorher, Platzhalter „Was ist hier zu tun?“, höchstens 500 Zeichen. Bild-Beiträge behalten das normale Feld.
- Erledigt melden (`challenge/[id]/report`): Die Notiz trägt vorn die Marke #nachher, Platzhalter „Was hast Du gemacht?“, höchstens 280 Zeichen.
- Gespeichert sind die Texte ohne Marke. Die App setzt die Marken in der Anzeige davor (`src/data/weChallenge.ts`), so tragen auch ältere We-Challenges sie. Eine Marke steht nur, wenn es den Text dazu gibt.
- Feed (beide Looks, `ChallengePost.tsx`): Eine bestätigte We-Challenge mit Aufgabenfoto zeigt das Bildpaar der Me-Challenge (`BeforeAfterPair`), Vorher oben, Nachher unten. Im Look „Kiez“ bleiben Glasleiste, Bounty und Edensteine erhalten. Darunter stehen #vorher-Beschreibung und #nachher-Notiz.
- Detailansicht: Das Erledigungsfoto folgt in der Galerie direkt auf das Aufgabenfoto, der Text zeigt beide Marken.
- „Erledigung prüfen“: Die Notiz steht mit #nachher.
- Das Nachher erscheint erst nach dem Bestätigen (Status `confirmed`, `payment_open`, `paid_marked`, `paid`).
