# Abzeichen am Avatar

- Datum: 2026-10-31
- Status: offen (Entscheidungen stehen, Details und Umsetzung fehlen)
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, neuer Abschnitt „Abzeichen“

## Daria hat entschieden

- Das Abzeichen sitzt farbig neben dem Avatar.
- Jede Person blendet ihre Abzeichen im eigenen Konto ein und aus (notwendige Funktion).
- Bei mehreren Abzeichen wählt die Person eins aus. Das Profil zeigt alle eingeblendeten, der Avatar beim Posten nur das ausgewählte.
- Eine Einladung ist aktiv, sobald die eingeladene Person ihre erste Challenge oder ihren ersten Post erledigt (Vorschlag Claude, Daria spricht von „aktiven Einladungen“).

## Die Abzeichen

| Abzeichen | Bedingung | Symbol |
|---|---|---|
| Pionier:in | Die ersten 200 Personen, egal ob vor oder nach dem Launch. Die ersten 20 tragen ihre Nummer („Pionier:in #7“), die Personen 21 bis 200 keine. | Fernrohr |
| Lots:in | ab 5 aktiven Einladungen | Flaschenpost, Optik offen |
| Anführer:in | ab 5 aktiven Einladungen und mindestens 1 gegründeten Gruppe | Vorschlag Claude: Steuerrad |
| Seebär:in (Arbeitstitel, Daria sucht Ersatz für „Migrant:in“) | ab 50 Posts | Anker |
| Macher:in | ab 15 We-Challenges | Vorschlag Claude: Seemannsknoten |

## Vorschläge von Claude, von Daria nicht bestätigt

- Fernrohr diagonal auf runder Kachel in Gold, drei Segmente zum Okular hin dünner, Glanzpunkt in Akzentfarbe auf der Linse.
- Mindestgröße 20 px; darunter zeigt die App nur einen Farbpunkt.
- Posts: alle Arten zählen gleich, pro Tag höchstens 3, gelöschte Posts zählen nicht.
- We-Challenges für Macher:in: zählt die erledigte We-Challenge, egal ob selbst erstellt oder mitgemacht (offen).
- Ausgewähltes Abzeichen ohne eigene Wahl: das zuletzt erhaltene.
- Anführer:in ersetzt Lots:in nicht; beide bleiben im Profil.

## Offene Fragen an Daria

- Name für das Anker-Abzeichen (ab 50 Posts).
- Zählt für Macher:in die erstellte oder die erledigte We-Challenge?
- Wie verträgt sich das Abzeichen mit der Ninja-Maske für Personen ohne Kiez?

- „Flaschenpost“ steht in der App bereits für E-Mail (`src/app/onboarding/email.tsx`, `no-email.tsx`). Bleibt die Flaschenpost Symbol der Lots:in, oder bekommt eine der beiden Bedeutungen ein anderes Wort?

## Nächster Schritt

- Daria testet die Flaschenpost bei 16 und 20 px in beiden Looks.
- Prüfen, dass Fernrohr, Flasche, Steuerrad, Anker und Knoten nirgends sonst als Icon mit anderer Bedeutung vorkommen.
- Danach Datenmodell (z. B. Tabelle `badges` oder berechnete Felder) und Migration planen.
