# Kritik: Lila wirkt ungemütlich

- Datum: 2026-10-26
- Status: offen, Kritik und To-do von Daria
- Gehört in Documentation: `kiez-coins/app/Offene_Punkte.md`, nach der Entscheidung `kiez-coins/design/Designsystem.md` (Farben)

## Kritik (Daria, 26.10.2026)

„Farbe Lila, ungemütlich“

## Stand

Annahme von Claude, nicht mit Daria geklärt: Gemeint ist das Lila der App im Look „Kiez“ (Standard auf iOS und Android, im Web wählbar). Es steht in `src/theme/tokens.ts`:

- `kiezPalette.purple: '#7E94FF'` (ein bläuliches Lila). Daraus werden `color.accent.primary` (Knöpfe, Aktionen) und `color.signature` (Logo und Kater).
- Die Beschreibung des Looks in `src/theme/look.ts` lautet „Lila, rund, KiezCoins pur“.
- Grund ist dunkel: `black: '#1F2123'`, `graphite: '#2B2D31'`.

Der Look „Fashionable“ nutzt kein Lila (Blau `#0095F6`, Signatur Schwarz). Ein Violett `#7B2FF7` hat Daria dort schon am 23.10.2026 verworfen.

Parallel bekommt die Landingpage ein helles Lila-Konzept (Farbkonzepte in den Projektdateien unter `landingpage/farbkonzepte/`, zum Beispiel `lilabuehne-oben.webp`). Die Kritik kann auch dieses betreffen.

## Offene Fragen an Daria

- Betrifft die Kritik die App (Look „Kiez“), die Landingpage oder beides?
- Was ist ungemütlich: der Farbton selbst, die Menge (Knöpfe, Logo, Kater) oder die Kombination mit dem dunklen Grund?
- Richtung für den Ersatz: wärmer (zum Beispiel Orange `#FFAD7E` oder Pink `#FFB2E5` aus derselben Palette), gedämpfter, oder ein ganz neues Farbkonzept?

## Nächste Schritte

- Daria beantwortet die Fragen.
- Zwei oder drei Varianten als Vorschau zeigen (Feed und Erstellen-Blatt), dann `kiezPalette.purple` in `src/theme/tokens.ts` und in Figma (Variable `color/accent/primary`) gleichzeitig ändern. Texte wie „Lila, rund, KiezCoins pur“ in `src/theme/look.ts` anpassen.
