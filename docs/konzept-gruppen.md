# Konzept „Gruppen“

Stand 20.10.2026, mit Daria abgestimmt. Noch nicht umgesetzt.

## So funktionieren Gruppen

Eine Gruppe hat 2 bis 13 Mitglieder. Ihre Aufgaben sehen nur die Mitglieder, und die Bounty ist ideell: Edensteine statt Euro.

- Eine Person gründet eine Gruppe mit Namen und optional Bild. Sie ist die Gründerin.
- Die App erzeugt einen Einladungscode mit 6 Zeichen. Die Gründerin teilt ihn über das Teilen-Menü.
- Wer den Code unter „Gruppe beitreten“ eingibt, tritt bei. Bei 13 Mitgliedern ist die Gruppe voll.
- Eine Person kann in höchstens 10 Gruppen sein.
- Eine Gruppe braucht keinen Kiez (Familie, WG, Verein).

## So läuft eine Gruppenaufgabe

Annehmen, erledigt melden mit Foto und bestätigen laufen wie bei Challenges. Der Zahlungsschritt entfällt. Nach der Bestätigung schreibt die Datenbank der erledigenden Person die Edensteine gut.

## Edensteine

- Die Erstellerin legt pro Aufgabe eine Menge fest (Vorschlag: 1 bis 10).
- Edensteine gelten nur in ihrer Gruppe. Jedes Mitglied hat pro Gruppe einen eigenen Bestand.
- Aus den Beständen entsteht eine Rangliste der Gruppe.
- Edensteine haben keinen Geldwert und lassen sich nicht auszahlen oder übertragen.

## Verlassen und Rollen

- Mitglieder können eine Gruppe verlassen. Erworbene Edensteine bleiben im Verlauf erhalten.
- Die Gründerin kann Mitglieder entfernen und die Rolle an ein anderes Mitglied übertragen.
- Verlässt die Gründerin die Gruppe, überträgt sie die Rolle vorher.

## Datenbank

| Tabelle | Inhalt |
| --- | --- |
| `groups` | Name, Bild, Gründerin, Einladungscode |
| `group_members` | Gruppe, Person, Rolle (`founder`, `member`), Beitrittsdatum |
| `challenges` | neu: `group_id` (leer bei Kiez-Challenges), `edensteine` |

- Gruppenaufgaben sieht nur, wer Mitglied der Gruppe ist (Row Level Security).
- Beitreten über die Funktion `join_group(code)`. Sie prüft 13 Mitglieder pro Gruppe und 10 Gruppen pro Person.
- Gutschrift der Edensteine in der Bestätigungsfunktion; der Bestand ergibt sich aus den bestätigten Gruppenaufgaben.

## Platz in der App

- Reiter „Gruppen“ in den Segmenten des Feeds. Bei mehreren Gruppen wählt eine Leiste darüber die Gruppe.
- Gruppenseite mit Mitgliedern, Rangliste, Einladungscode, Gründen und Beitreten. Erreichbar über den Reiter und über Dein Konto.

## Später

- Einladung per Link (braucht eine eigene Domain, etwa kiezcoins.de, für Universal Links).
