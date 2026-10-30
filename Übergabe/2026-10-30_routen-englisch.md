# Routen auf Englisch, Look-Namen einheitlich

Datum: 2026-10-30 · Status: umgesetzt, PR #124 gemergt (30.10.2026); Umleitungen auf Vercel geprüft; noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/app/Arbeitsstand_Code.md` (Struktur, Routen), `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Code“)

## Entscheidung von Daria (30.10.2026)

Alle Ordner unter `src/app` auf Englisch. Die Befunde „Routen“ und „Look-Namen“ aus der Konsistenzprüfung (`2026-10-25_offen_konsistenz.md`) sind damit behoben.

## Neue Pfade

| vorher | jetzt |
| --- | --- |
| `challenge/[id]/report` (Erledigung melden) | `challenge/[id]/complete` |
| `challenge/[id]/flag` (Verstoß melden) | `challenge/[id]/report`, wie `user/[id]/report` |
| `challenge/[id]/payment` (Empfang der Coins bestätigen) | `challenge/[id]/received`; `pay` (Coins bezahlen) bleibt |
| `settings/notifications`, `settings/payout` | `account/notifications`, `account/payout` |
| `account/datenabrufe`, `freunde`, `funktionen`, `geschlecht`, `sprache`, `umfrage/ergebnis` | `account/data-access`, `friends`, `features`, `gender`, `language`, `survey/results` |
| `freunde/einladen` | `friends/invite` |
| `gruppen`, `gruppen/neu`, `gruppen/beitreten`, `gruppen/[id]/aufgabe` | `groups`, `groups/new`, `groups/join`, `groups/[id]/task` |
| `reise` | `me` (wie „Me“ im Konto) |
| `kater`, `texte`, `rechtliches/[doc]`, `vorher-nachher/[id]` | `cat`, `texts`, `legal/[doc]`, `before-after/[id]` |
| `onboarding/deckname`, `funktionen`, `kodex`, `ohne-mail` | `onboarding/handle`, `features`, `code-of-conduct`, `no-email` |

- Alte Links der Web-App leitet Vercel um (`vercel.json`, `redirects`), auch die geteilten Einladungslinks `…/app/gruppen/beitreten?code=…` und `…/app/freunde/einladen?code=…`. Ausnahme: Das alte `challenge/[id]/report` (Erledigung) heißt jetzt wie das neue „Melden“ und wird nicht umgeleitet; es kam nur aus der App selbst.
- Bleiben deutsch: die Werte in Links (`?modus=`, `?reiter=gruppen`, `?gruppe=`, `?nur=1`) und die Namen der Rechtstexte (`legal/impressum`, `datenschutz`, `bedingungen`, `regeln`), da sie in Rechtstexten, auf der Website und in gespeicherten Zustimmungen vorkommen.
- `scripts/text-pages.mjs` ordnet die Texte über die neuen Pfade den Seiten zu.

## Look-Namen

`wrapFlat`, `cameraFlat` (TabBar) und `speechCatMono` (Kater-Sprechblase) heißen jetzt `…Fashionable`. `barFlat` entfällt; es stand nur in einem Zweig der Kiez-Leiste, der im Fashionable-Look nie läuft.

## Offene Punkte

- Figma-Frames tragen noch die alten Namen (`challenge/report`, `challenge/payment`, `settings/payout`, `onboarding/kodex` …). Gehört zu `2026-10-24_offen_figma-abgleich.md`.
