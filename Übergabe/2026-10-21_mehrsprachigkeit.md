# Mehrsprachigkeit

- **Stand:** 21.10.2026
- **Gehört nach:** Documentation › `kiez-coins/app/Stand_App.md` und `kiez-coins/ENTSCHEIDUNGEN.md`.
- **Sprachen:** Deutsch (Original), Englisch, Französisch, Ukrainisch, Arabisch, Hebräisch. Arabisch und Hebräisch laufen von rechts nach links.

## So funktioniert es

- Die App übernimmt die Sprache des Handys, sofern sie sie kann, sonst Deutsch. Dein Konto › Sprache ändert sie.
- Alle Texte stehen weiter auf Deutsch im Code. `t()` in `src/data/texts.ts` sucht die Übersetzung:
  1. Spalte der Sprache in `app_texts` (z. B. `en`), von Daria im Editor geändert
  2. mitgelieferte Übersetzung in `src/i18n/<sprache>.json`
  3. deutsches Original
- `Text` aus `src/components/T.tsx` übersetzt reine Textstücke automatisch. Alle Screens importieren `Text` von dort.
- Texte mit Werten darin schreiben sich als `t('Noch {n} Tage', { n })`. Übersetzungen können Mehrzahlformen enthalten,
  z. B. Ukrainisch `{n, plural, one {# день} few {# дні} many {# днів} other {# дня}}`.
- Rückfragen (`Alert.alert`) übersetzt die App automatisch. Datum und Zahlen folgen der Sprache.
- Rechtstexte zeigen in anderen Sprachen den Hinweis „Verbindlich ist die deutsche Fassung“.

## Rechts nach links

- Web: `dir="rtl"` am Dokument, wirkt sofort.
- iOS und Android: `I18nManager.forceRTL`, wirkt erst nach einem Neustart. Die App fragt nach dem Sprachwechsel danach.
  In Expo Go startet „Jetzt neu starten“ die App neu, in einer gebauten App schließt man sie von Hand.
- Pfeile und das Senden-Icon spiegeln sich.

## Neue Texte übersetzen

1. `node scripts/i18n.mjs` zeigt je Sprache, was fehlt. `--missing` schreibt die Liste nach `scripts/.i18n-missing.json`.
2. Übersetzungen in `src/i18n/<sprache>.json` eintragen (Schlüssel ist der deutsche Text).
3. `node scripts/i18n.mjs --prune` entfernt Übersetzungen, deren deutscher Text nicht mehr im Code steht.
4. `node scripts/app-texts.mjs` erzeugt SQL, damit neue Texte im Editor erscheinen.

## Editor

Dein Konto › Texte hat oben eine Sprachauswahl. In einer anderen Sprache zeigt jede Karte die Übersetzung und darunter
klein das Deutsche. „Speichern“ schreibt in die Spalte der Sprache, „Original wiederherstellen“ leert sie.

## Offen

- Die Übersetzungen hat Claude gemacht. Muttersprachler sollten sie prüfen, vor allem Arabisch, Hebräisch und Ukrainisch
  (Ansprache ist dort teils männlich formuliert).
- Inhalte der Leute (Titel, Kommentare) bleiben, wie sie geschrieben wurden.
- Fehlermeldungen aus der Datenbank (`raise exception`) bleiben deutsch, solange sie nicht in `src/i18n` stehen.
