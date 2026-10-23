# Wählbarer Look „Kiez“ und „Instagram“

- Datum: 2026-10-23
- Gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Gestaltung“, und `kiez-coins/APP-STAND.md`

## So funktioniert der Look

- Daria hat entschieden, dass Nutzer:innen den Look der App wählen. „Kiez“ ist das eigene Design. „Instagram“ nutzt Schwarz, Instagram-Blau (#0095F6), ein rotes Herz (#FF3040) und kleinere Radien.
- `src/theme/look.ts` liest den Look einmal beim Start. `src/theme/tokens.ts` baut daraus Palette, Glas, Haarlinie und Radien. Ein Wechsel lädt die App neu, da StyleSheet.create die Farben beim Laden festschreibt.
- Neues Token `color.text.onAccent`: Schrift auf der Akzentfläche (Primary-Button, eigene Chatblase). Im Kiez-Look bleibt sie dunkel, im Instagram-Look ist sie weiß.
- Dein Konto › Einstellungen › Look wechselt den Look. Der Eintrag erscheint nur in der Web-App.

## So landet jemand direkt im Instagram-Look

Der Link `https://kiezcoins.vercel.app/app/?look=instagram` öffnet die App im Instagram-Look. Der Browser merkt sich die Wahl. `?look=kiez` stellt zurück.

## Offen

- iOS und Android zeigen immer den Kiez-Look. Für den Wechsel braucht die native App einen Speicher, der beim Start synchron liest (z. B. `expo-sqlite/kv-store`).
- Die Schrift bleibt Inter. Logo, Kater und Edensteine behalten ihre Farben.
- Etwa 14 fest eingetragene `rgba(31, 33, 35, …)`-Flächen über Fotos bleiben im Kiez-Grau.
