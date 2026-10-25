# Neue handgezeichnete Icons (hallo, this-way, friends, look, switch, settings)

Datum: 2026-10-25
Status: erledigt, gehört in die Doku
Ergebnis gehört nach Documentation: `kiez-coins/app/Anleitung_App.md` (Abschnitte „Dein Konto“, „Tour“, „Kater“) und die Icon-Übersicht

Daria, 25.10.2026: neue Icons in `assets/icons/`, übernommen mit `scripts/icons-import.mjs` nach `src/components/icons/svgs.ts`.

| Icon | Bild | Kiez-Look | Fashionable Look (Phosphor) |
|:---|:---|:---|:---|
| `hallo` | winkende Hand | Button „Hallo sagen“ auf der Kater-Seite (vorher `wir-schaffen-das`) | `hand-waving` |
| `this-way` | zeigende Hand | Button „Weiter“/„Los geht’s“ in der Tour, Button „Anheuern“ auf der Willkommensseite; in Arabisch und Hebräisch gespiegelt | `arrow-right` |
| `friends` | zwei Gesichter | Karte „Freundschaften“ in „Dein Konto“, Buttons „Einladung teilen“ (Freundschaften, Gruppe) | `handshake` |
| `look` | Farbpalette | Karte „Look“ in „Dein Konto“ | `palette` |
| `switch` | Schalter | Karte „Funktionen“ in „Dein Konto“ | `toggle-right` |
| `questionmark` | Fragezeichen | Karte „Grammatisches Geschlecht“ in „Dein Konto“ | `question` |
| `settings` | Zahnrad | neue Fassung ersetzt die alte | `gear` (unverändert) |

Sprache behält Phosphor, da es dafür noch kein handgezeichnetes Icon gibt.
`assets/swsitch.svg` war identisch mit `wsitch.svg` und ist entfernt. `assets/Vector.svg` (einzelner Bogen) ist nicht eingebunden.

Nachtrag 25.10.2026: `friends` 15 % größer, `switch` 20 % kleiner (OPTICAL in `src/components/icons/Icon.tsx`, nur Kiez-Look).
