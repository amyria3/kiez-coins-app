# Status-Badges nennen die handelnde Person

Stand: 27.10.2026. Status: erledigt (PR #77). Gehört in Documentation nach `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“, und in `kiez-coins/design/Designsystem.md` zum StatusBadge.

## Entscheidung

Daria hat am 27.10.2026 entschieden: Status-Badges mit handelnder Person lesen sich als Satz, **„@Sof » hat angenommen“**. Der Deckname steht vorn wie eine Erwähnung, der Doppelpfeil » zeigt in Leserichtung zum Status.

- Annehmende: „hat angenommen“, „hat's erledigt!“
- Ersteller:innen: „hat bestätigt“, „hat abgelehnt“, „hat als bezahlt markiert“, „hat bezahlt“
- Ohne Person bleibt das bisherige Badge: Entwurf, Offen, Zahlung offen, Geschlossen, Gelöscht und die Erfolgsseiten nach der eigenen Aktion.
- Russisch, Ukrainisch, Hebräisch und Arabisch richten das Verb nach dem Geschlecht der handelnden Person (`tAbout`).
- Auf Arabisch und Hebräisch spiegelt die Schrift den Doppelpfeil; der Deckname ist links nach rechts isoliert, damit das @ vor dem Namen bleibt.

Verworfene Varianten: Mittelpunkt „·“, „@“ hinter dem Status, Personen-Icon, Tilde „~“ und weitere tippbare Zeichen. Das Zeichen muss sich auf der Tastatur tippen lassen.

## Arbeitsteilung

Daria hat Zeichen und Satzform gewählt. Claude hat Varianten als Screenshots gebaut, umgesetzt und übersetzt.

## Dateien

- `src/components/Badges.tsx` (`statusActor`, `StatusBadge` mit Prop `challenge`)
- `src/i18n/*.json` und die Geschlechtsdateien `*.er.json`, `*.sie.json`, `*.person.json`

## Offene Punkte

- Die neuen Übersetzungen nach Geschlecht sind ungeprüft und gehören zu `2026-10-24_offen_gender-uebersetzungen-pruefen.json`.
