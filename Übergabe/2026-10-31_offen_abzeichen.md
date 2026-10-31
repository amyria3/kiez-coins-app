# Abzeichen am Avatar

- Datum: 2026-10-31
- Status: offen (Entscheidungen stehen, Details und Umsetzung fehlen)
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, neuer Abschnitt „Abzeichen“

## Daria hat entschieden

- **Pionier:in:** Wer zuerst beitritt, bekommt ein Fernrohr als Abzeichen.
- **Erfahrene Lots:in:** Wer 10 Menschen eingeladen hat, bekommt dieses Abzeichen. Symbol Flaschenpost, sofern es optisch funktioniert.
- **Anker:** Wer viel postet, bekommt einen Anker als Abzeichen.
- Das Abzeichen sitzt farbig neben dem Avatar.

## Vorschläge von Claude, von Daria nicht bestätigt

- Fernrohr diagonal auf runder Kachel in Gold, drei Segmente zum Okular hin dünner, Glanzpunkt in Akzentfarbe auf der Linse.
- Mindestgröße 20 px; darunter zeigt die App nur einen Farbpunkt.
- Am Avatar sitzt ein Abzeichen, im Profil stehen alle.
- Eine Einladung zählt erst, wenn die eingeladene Person ihre erste Challenge erledigt.

## Offene Fragen an Daria

- Bis wann gilt man als Pionier:in (Testphase, Store-Launch, erste N Personen)?
- Ab wie vielen Posts gibt es den Anker, und zählen Me-Challenges, Bilder und Vorher-Nachher-Posts gleich?
- Welches Abzeichen zeigt der Avatar, wenn eine Person mehrere hat (Rangfolge)?
- Wie verträgt sich das Abzeichen mit der Ninja-Maske für Personen ohne Kiez?

- „Flaschenpost“ steht in der App bereits für E-Mail (`src/app/onboarding/email.tsx`, `no-email.tsx`). Bleibt die Flaschenpost Symbol der Lots:in, oder bekommt eine der beiden Bedeutungen ein anderes Wort?

## Nächster Schritt

- Daria testet die Flaschenpost bei 16 und 20 px in beiden Looks.
- Prüfen, dass Fernrohr, Anker und Flasche nirgends sonst als Icon mit anderer Bedeutung vorkommen.
- Danach Datenmodell (z. B. Tabelle `badges` oder berechnete Felder) und Migration planen.
