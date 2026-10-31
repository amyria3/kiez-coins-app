# Erledigt aus der To-do-Liste am 31.10.2026

- Datum: 2026-10-31
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/APP_STAND.md` (Abschnitte Entwicklung, Tour, Was Du so machst, Fashionable Look) und `kiez-coins/ENTSCHEIDUNGEN.md`

## Entwicklung

- `scripts/text-keys.mjs` erfasst die Sprüche aus `src/data/kater-sprueche.json` und jeden Text in `label` (auch „er“, „sie“). `node scripts/i18n.mjs --prune` löscht damit keine genutzten Übersetzungen mehr. Prune lief am 31.10.2026 und entfernte nicht mehr genutzte Übersetzungen.
- ESLint: `eslint.config.js` mit `eslint-config-expo` 58 und ESLint 9 (ESLint 10 bricht in `eslint-plugin-react` ab). Die Regeln für den React Compiler sind aus, da die App ihn nicht nutzt. `npx expo lint` oder `npm run lint`: 0 Fehler, 31 Warnungen.
- Fehler behoben: `src/app/challenge/[id]/complete/payout.tsx` rief `useNudge()` nach einem frühen `return` auf.

## Tour

- Beispiel „Bild“: Der lila Ring liegt nur um das Herz. `ChallengePost` nimmt dafür `wrapLike`.
- Die Seiten „Gruppen“ und „Privat“ erscheinen nur, wenn der Modus sichtbar ist (`mode` in `src/data/tour.ts`).

## Was Du so machst und Fashionable Look

- Ohne Gruppe zeigt die App Cat The Käptn mit Titel „Cat The Käptn wartet“, Text „Erstelle Deine erste Gruppe“ und den Knöpfen „Gruppe gründen“ und „Mit Beitrittscode beitreten“, wie der leere Reiter im Feed. Gilt in „Was Du so machst“, im Profil des Fashionable Look und im Erstellen-Blatt.
- Geschafft liegt in `src/components/Geschafft.tsx` und gilt in beiden Looks. Im Fashionable Look entfallen die Reiter Erstellt und Angenommen: Über dem Raster stehen Zahlen und Dank, das Raster zeigt nur Geschafftes.

## Challenge

- Challenge ohne Bild, z. B. eine Gruppenaufgabe: Ein Tipp außerhalb schließt das Zahnrad- und das Drei-Punkte-Menü.
