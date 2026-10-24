# Umbenennung in KiezKoinz

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt zum Namen der App

Daria hat festgelegt: Die App heißt überall „KiezKoinz“.

## Stand

Noch nichts umbenannt. Im Repo stehen (ohne `node_modules`, `package-lock.json`):

- „Kiez Coins“: 442 Stellen
- „kiez-coins“: 46 Stellen
- „KiezCoins“: 13 Stellen
- „kiezcoins.de“: 31 Stellen

Betroffen sind unter anderem `app.json` (`name`), `app.config.js`, `public/index.html`, `public/manifest.json`, `src/i18n/*.json`, `src/data/textSeiten.json`, `src/data/legal.ts`, `src/components/FeedHeader.tsx`, `src/components/icons/Brand.tsx` und `brandSvgs.ts` (Logo-Schriftzug), `supabase/functions/download/index.ts` und mehrere Migrationen mit App-Texten in `supabase/migrations/`.

## Nächster Schritt

1. Offene Fragen mit Daria klären.
2. Sichtbare Texte umbenennen: App-Name, i18n-Dateien, Rechtstexte, Website, Manifest.
3. Texte in der Datenbank (`app_texts`) per neuer Migration ändern. Alte Migrationen bleiben unverändert.
4. Logo-Schriftzug in `Brand.tsx` und `brandSvgs.ts` neu setzen.

## Offene Fragen an Daria

- Heißt die Währung in der App ebenfalls „Koinz“ („50 Koinz“)? Im Code stehen rund 520 Stellen mit „Coin“ oder „Coins“ in den i18n-Dateien.
- Wechselt die Domain zu einer KiezKoinz-Domain, oder bleibt kiezcoins.de?
- Technische Kennungen bleiben vorerst: `slug` `kiez-coins-app`, `bundleIdentifier` und `package` `de.kiezcoins.app`, `scheme` `kiezcoins`, Repo-Name. Eine Änderung von Bundle-ID und Paketname nach dem Store-Launch ist nicht möglich. Vor dem Launch entscheiden.
- Bleiben Übersetzungen beim Namen „KiezKoinz“ (Hebräisch, Arabisch, Ukrainisch)?
