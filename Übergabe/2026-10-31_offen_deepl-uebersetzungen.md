# Übersetzungen automatisch mit DeepL

Datum: 2026-10-31 · Status: offen, Umsetzung geplant für 2026-11-01 · Ziel in Documentation: `kiez-coins/app/Anleitung_App.md` (Abschnitt „Sprachen und Übersetzungen“)

Pflichtaufgabe (Daria): Konto bei DeepL API Free anlegen (500.000 Zeichen pro Monat kostenlos), Schlüssel in GitHub unter `amyria3/kiez-coins-app` › Settings › Secrets and variables › Actions als `DEEPL_API_KEY` speichern.

## Entscheidungen von Daria (31.10.2026)

- Neue Texte sollen bei jedem PR automatisch übersetzt werden, mit DeepL. DeepL kann alle sechs Sprachen, auch Hebräisch (laut DeepL-API-Doku, Hebräisch ohne Tag-Handling).
- Die Umstellung soll wenig destruktiv sein. Daria hat den Plan unten bestätigt.

## Plan

1. **Nur Lücken füllen, eigene Dateien.** DeepL überschreibt keine bestehende Übersetzung und löscht nichts (`--prune` bleibt aus). Ergebnisse landen in `src/i18n/auto/<sprache>.json` (App) und `scripts/site/sprachen/auto/<sprache>.json` (Website). Reihenfolge in `t()`: `app_texts` → `src/i18n/<sprache>.json` (geprüft) → `src/i18n/auto/<sprache>.json` (DeepL) → Deutsch. Website analog in `scripts/build-download-site.mjs`. Rückweg: Ordner `auto/` löschen.
2. **Probelauf mit dem Altbestand.** Skript `scripts/i18n-auto.mjs` von Hand für die rund 160 fehlenden App-Texte (`node scripts/i18n.mjs --missing`), Ergebnis als eigener PR zur Prüfung durch Daria.
3. **Danach GitHub Action bei jedem PR** (nicht bei Pushes auf `main`): übersetzt nur neue Texte und hängt einen Commit „Übersetzungen (DeepL)“ an den PR. Gemergt wird weiter nur auf Darias Wort.

## Schutzregeln im Skript

- Platzhalter wie `{name}` vor dem Übersetzen durch neutrale Zeichen ersetzen und danach zurücksetzen (Hebräisch kann kein Tag-Handling).
- Texte mit Mehrzahlformen (`{n, plural, …}`) nicht an DeepL geben, sondern im PR auflisten; Claude übersetzt sie.
- DeepL-Glossar für feste Begriffe: KiezCoins, Me-Challenge, We-Challenge, Edensteine, Coins.
- `formality=less` (Du-Form), wo DeepL es kann (fr, ru, uk).
- Zeichenlimit pro Lauf, damit das Gratiskontingent reicht.
- Texte, die gleich bleiben sollen (technische Strings, Namen, Deckname-Vorschläge), in einer Ausnahmeliste.

## Hinweise für die Umsetzung

- Der Schlüssel des Me-Challenge-Texts der Tour steht in den Sprachdateien noch mit Zeilenumbruch (`\n`), der Code liefert ein Leerzeichen. Deshalb zählt er als fehlend. Beim Probelauf mit korrigieren.
- `ru.json` fehlen 15 Texte mehr als den anderen Sprachen (Umfrage, Ergebnis-Seite).

## Stand 2026-11-07

- Englisch ist vollständig (PR „Englisch vervollständigen“): 277 fehlende Texte von Claude übersetzt, auch der Tour-Text zur Me-Challenge. Was `node scripts/i18n.mjs` für `en` noch als fehlend zählt (rund 30), sind keine sichtbaren Texte: SVG, CSS, Schriftnamen, Markennamen, interne Stimmungsnamen.
- Französisch, Ukrainisch, Russisch, Arabisch und Hebräisch fehlen weiter rund 280 Texte (bei `ru` etwas mehr). Der DeepL-Probelauf aus Schritt 2 deckt sie ab.
- Neu übersetzt `t()` jetzt auch Platzhalter in Eingabefeldern (`TextField`, Textblätter, Fehlerseite) und mehrere Vorleser-Texte (`accessibilityLabel`), die vorher immer Deutsch blieben.
