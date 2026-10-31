# Abzeichen am Avatar

- Datum: 2026-10-31
- Status: offen (Entscheidungen stehen, Details und Umsetzung fehlen)
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, neuer Abschnitt „Abzeichen“

## Daria hat entschieden

- **Pionier:in:** Wer zuerst beitritt, bekommt ein Fernrohr als Abzeichen.
- **Erfahrene Lots:in:** Wer 10 Menschen eingeladen hat, bekommt dieses Abzeichen. Symbol Flaschenpost, sofern es optisch funktioniert.
- **Anker:** Wer viel postet, bekommt einen Anker als Abzeichen.
- Das Abzeichen sitzt farbig neben dem Avatar.
- Jede Person blendet ihre Abzeichen im eigenen Konto ein und aus (notwendige Funktion).
- Bei mehreren Abzeichen wählt die Person eins aus. Das Profil zeigt alle eingeblendeten, der Avatar beim Posten nur das ausgewählte.

## Vorschläge von Claude, von Daria nicht bestätigt

- Fernrohr diagonal auf runder Kachel in Gold, drei Segmente zum Okular hin dünner, Glanzpunkt in Akzentfarbe auf der Linse.
- Mindestgröße 20 px; darunter zeigt die App nur einen Farbpunkt.
- Eine Einladung zählt erst, wenn die eingeladene Person ihre erste Challenge erledigt.

## Zahlen, Vorschlag von Claude

- **Pionier:in:** alle, die vor dem Store-Launch beitreten, höchstens die ersten 100 Personen. Das Abzeichen trägt die Beitrittsnummer („Pionier:in #17“).
- **Erfahrene Lots:in:** 10 Eingeladene (steht). Eine Einladung zählt, sobald die eingeladene Person ihre erste Challenge oder ihren ersten Post erledigt.
- **Anker:** 30 Posts. Alle Arten zählen gleich (Me-Challenge, We-Challenge, Bild, Vorher-Nachher). Pro Tag zählen höchstens 3 Posts. Gelöschte Posts zählen nicht.
- Ausgewähltes Abzeichen ohne eigene Wahl: das zuletzt erhaltene.

## Offene Fragen an Daria

- Zahlen: Claude hat Vorschläge gemacht (unten), Daria bestätigt sie noch.
- Wie verträgt sich das Abzeichen mit der Ninja-Maske für Personen ohne Kiez?

- „Flaschenpost“ steht in der App bereits für E-Mail (`src/app/onboarding/email.tsx`, `no-email.tsx`). Bleibt die Flaschenpost Symbol der Lots:in, oder bekommt eine der beiden Bedeutungen ein anderes Wort?

## Nächster Schritt

- Daria testet die Flaschenpost bei 16 und 20 px in beiden Looks.
- Prüfen, dass Fernrohr, Anker und Flasche nirgends sonst als Icon mit anderer Bedeutung vorkommen.
- Danach Datenmodell (z. B. Tabelle `badges` oder berechnete Felder) und Migration planen.
