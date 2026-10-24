# Funktionen freischalten

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“

## Stand

Die Schalter in „Dein Konto › Funktionen“ sind fertig, ohne Sperre (Entscheidung in Documentation, `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“). Jede Funktion lässt sich jederzeit anschalten.

## Vorschlag aus dem Gespräch vom 24.10.2026, noch nicht entschieden

- We-Challenge schaltet sich frei, sobald die Person eine Me-Challenge abgeschlossen hat (Vorher und Nachher gepostet).
- Gruppen bleiben ohne Sperre, da eine Einladung sie ohnehin anschaltet.
- Gesperrte Funktion: Zeile mit Schloss, darunter die Bedingung, z. B. „Schließ eine Me-Challenge ab“. Der Schalter bleibt aus, bis die Bedingung erfüllt ist.
- Eine freigeschaltete Funktion bleibt freigeschaltet, auch wenn die Person sie abschaltet.

## Offene Fragen an Daria

- Welche Funktion bekommt eine Sperre, mit welcher Bedingung?
- Gilt die Sperre auch für Testerinnen, die We-Challenges schon nutzen?
- Speicherort: Die Bedingung lässt sich aus `challenges` ablesen (eigene `before_after` mit Status abgeschlossen). Ein eigenes Feld ist nicht nötig.

## Betroffene Dateien

- `src/data/features.ts` (`useFeatures`, `setFeature`): Sperre als zusätzliches Feld je Funktion, z. B. `unlocked: boolean` aus den Challenges berechnet.
- `src/app/account/funktionen.tsx`: Zeile mit Schloss und Bedingung. `SwitchRow` in `src/components/Form.tsx` braucht dafür einen gesperrten Zustand.
- Icon für „gesperrt“ nach Icon-Regelwerk wählen (Phosphor `lock`, noch nicht im Skript `scripts/phosphor-icons.mjs`).
