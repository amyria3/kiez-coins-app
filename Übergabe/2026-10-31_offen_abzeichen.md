# Abzeichen am Avatar

- Datum: 2026-10-31
- Status: offen. Konzept steht, Umsetzung fehlt.
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, neuer Abschnitt „Abzeichen“; Datenbank-Doku, sobald die Migration steht; `kiez-coins/design/Icon_Regelwerk.md` für die Symbole
- Reihenfolge der Umsetzung: Doku, Datenbank, Icons, Front-End

## 1. Doku: Das Konzept

Daria hat entschieden (31.10.2026):

| Abzeichen | Bedingung | Symbol |
|---|---|---|
| Pionier:in | Die ersten 200 Personen, egal ob vor oder nach dem Launch. Die ersten 20 tragen ihre Nummer („Pionier:in #7“), die Personen 21 bis 200 keine. | Fernrohr |
| Lots:in | ab 5 aktiven Einladungen | Flaschenpost |
| Anführer:in | ab 5 aktiven Einladungen und mindestens 1 gegründeten Gruppe | Steuerrad (Vorschlag Claude) |
| Seebär:in (Arbeitstitel) | ab 50 Posts | Anker |
| Macher:in | ab 15 erledigten We-Challenges, selbst erstellt oder mitgemacht | Seemannsknoten (Vorschlag Claude) |

- Das Abzeichen sitzt farbig neben dem Avatar.
- Jede Person blendet ihre Abzeichen im eigenen Konto ein und aus (notwendige Funktion).
- Bei mehreren Abzeichen wählt die Person eins aus. Das Profil zeigt alle eingeblendeten, der Avatar beim Posten nur das ausgewählte.
- „Flaschenpost“ steht in der App nicht mehr für E-Mail (31.10.2026). Damit ist die Flaschenpost frei für die Lots:in.

Vorschläge von Claude, von Daria nicht bestätigt:

- Eine Einladung ist aktiv, sobald die eingeladene Person ihre erste Challenge oder ihren ersten Post erledigt.
- Posts: alle Arten zählen gleich, pro Tag höchstens 3, gelöschte Posts zählen nicht.
- Ohne eigene Wahl zeigt der Avatar das zuletzt erhaltene Abzeichen.
- Anführer:in ersetzt Lots:in nicht; beide bleiben im Profil.
- Ein Abzeichen bleibt, auch wenn die Bedingung später nicht mehr erfüllt ist (Post gelöscht, Person ausgetreten).

## 2. Datenbank: Vorschlag, noch keine Migration

Vorhanden:

- Einladungen: `friend_invites` (Code je Person) und `friendships.via_invite`.
- Gruppengründung: `groups.founder_id`.
- We-Challenges: `challenges`, `challenge_participants`.

Neu:

- Tabelle `badges`: `user_id`, `badge` (`pionier`, `lotse`, `anfuehrer`, `seebaer`, `macher`), `earned_at`, `number` (nur Pionier:in 1 bis 20), `visible boolean default true`. Primärschlüssel `(user_id, badge)`.
- `profile_settings.selected_badge`: das ausgewählte Abzeichen, leer heißt „zuletzt erhalten“.
- Funktion `award_badges(user_id)`: prüft alle Bedingungen und trägt neue Abzeichen ein. Trigger nach Beitritt, Post, erledigter We-Challenge, Gruppengründung und erster Aktivität einer eingeladenen Person.
- Pionier:in: Zählung über `profiles.created_at`. Die Datenbank vergibt die Nummer beim Eintrag, damit zwei gleichzeitige Anmeldungen nicht dieselbe Nummer bekommen.
- Lesen: öffentliche View oder Funktion, die nur sichtbare Abzeichen liefert.

## 3. Icons

- Fünf Symbole: Fernrohr, Flaschenpost, Steuerrad, Anker, Seemannsknoten. Vor dem Zeichnen prüfen, dass keins davon in der App bereits eine andere Bedeutung trägt.
- Runde Kachel, Farbe je Abzeichen, Symbol dunkel darauf. Im Fashionable Look mit dunklem Rand.
- Fernrohr diagonal, drei Segmente zum Okular hin dünner, Glanzpunkt auf der Linse.
- Mindestgröße 20 px; darunter zeigt die App nur einen Farbpunkt.
- Daria testet Flaschenpost, Steuerrad und Knoten bei 16 und 20 px in beiden Looks.

## 4. Front-End

- Avatar-Komponente: ausgewähltes Abzeichen unten rechts, bei Posts, Kommentaren und im Profil.
- Profil: alle eingeblendeten Abzeichen mit Name und Bedingung, Pionier:in mit Nummer.
- Konto: Liste aller erhaltenen Abzeichen mit Schalter zum Ein- und Ausblenden und Auswahl für den Avatar.
- Hinweis beim Erhalt eines neuen Abzeichens (Kater-Sprechblase).
- Texte gendern mit Doppelpunkt; alle Texte in `app_texts` und in den Übersetzungen.

## Offene Fragen an Daria

- Name für das Anker-Abzeichen (ab 50 Posts).
- Zählt eine Einladung per Gruppen-Code als Einladung, oder nur der Freundes-Code?
- Wie verträgt sich das Abzeichen mit der Ninja-Maske für Personen ohne Kiez?
