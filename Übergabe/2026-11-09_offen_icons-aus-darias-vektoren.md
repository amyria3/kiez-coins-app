# Icons im Kiez-Look nur aus Darias Vektoren

**Stand 2026-11-09, offen bis zur Übernahme in Documentation.** Ziel: `kiez-coins/design/Icon_Regelwerk.md`, Abschnitt „Kiez-Look“.

Daria hat am 2026-11-09 entschieden:

- Die alten Linien-Icons Auge (`eye`), Info (`info`) und Uhr (`clock`) sind gelöscht. Es gelten nur noch die Flächen `eye-filled`, `info-filled` und `clock-filled`.
- Alle Icons im Kiez-Look, die nicht von Daria kommen, sind aus ihren Vektoren neu gebaut. Phosphor erscheint im Kiez-Look nicht mehr.

## So sind die Icons gebaut

| Icon | Code | Aus Darias Vektoren |
|---|---|---|
| Minus | `minus` | mittlerer Balken des Menüs (`burger`) |
| Plus | `plus` | zwei Menü-Balken, einer senkrecht |
| Schließen | `close` | zwei Menü-Balken über Kreuz |
| Erledigt | `check` | Zeiger der Uhr, gedreht: kurzer Arm links, langer rechts |
| Zurück, Weiter | `chevron-left`, `chevron-right` | Zeiger der Uhr mit gleich langen Armen, gedreht |
| Weitere Aktionen | `more`, `more-vertical` | drei kleine Uhrkreise, jeder anders gedreht |
| Kopieren | `copy` | zwei Blätter aus dem Brief (`message`) mit geschlossener Klappe, hinten versetzt, mit Spalt |
| Webseite | `link` | zwei Kettenglieder aus dem Rahmen des Schalters (`switch`) |
| Sprache | `language` | zwei Sprechblasen aus der Kommentar-Blase (`comment`), die hintere gespiegelt |

## Für das Icon-Regelwerk

- Satz im Abschnitt „Kiez-Look“ ersetzen: „Wo es keins gibt, steht das Phosphor-Icon …“ wird zu „Fehlt ein Icon, entsteht es aus Vektoren von Darias Icons (2026-11-09).“
- „Sprache behält Phosphor, bis es ein handgezeichnetes Icon gibt.“ streichen. Neue Zeile: `language` (zwei Sprechblasen) | Sprache | Dein Konto | `translate`.
- Fashionable Look: Zeilen `clock`, `info`, `eye` und `flag` zeigen auf `clock-filled`, `info-filled`, `eye-filled`. `flag` und `eye-off` sind gelöscht, da die App sie nicht nutzt.

## Code

- `src/components/icons/svgs.ts`: neue Pfade, gelöscht `eye`, `info`, `clock`, `eye-off`, `flag` und der ungenutzte `CIRCLE_PATH`.
- `src/components/icons/Icon.tsx`: `KIEZ_PHOSPHOR` und `PhIcon` gelöscht.
- `scripts/build-download-site.mjs`: Uhr der Website ist `clock-filled`.

## Nächster Schritt

Inhalt ins Icon-Regelwerk übernehmen und diese Datei löschen.
