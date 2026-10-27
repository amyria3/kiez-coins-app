# Formulare: Fertig und Enter springen zum nächsten Feld

Datum: 2026-10-27 · Status: Notiz für die Doku · Gehört nach: Documentation, `kiez-coins/design/UX_UI_Regeln.md`, Abschnitt Formulare.

## Anlass

Daria, 27.10.2026: In allen Formularen schließt „Fertig“ (iPhone), „Weiter“ (Android) oder Enter (Computer) die Eingabe ab. Danach scrollt der Screen animiert zum nächsten Element und setzt dort den Fokus.

## Regel

- Einzeilige Felder: Enter fokussiert das nächste Feld darunter und scrollt es animiert ins Bild. Die Tastatur bleibt offen und zeigt „Weiter“.
- Nach dem letzten Feld folgt der Absende-Button: Die Tastatur geht zu, der Screen scrollt zum Button, im Browser bekommt er den Fokus. Ein zweites Enter schickt ab. Auf iPhone und Android springt der Screenreader zum Button.
- Zielbutton: zuerst ein Button im Formular unterhalb des Felds, sonst der Haupt-Button der ActionBar. Ghost-Buttons zählen nicht.
- Mehrzeilige Felder (Beschreibung, Begründung, Me-Challenge-Texte): Enter schreibt einen Zeilenumbruch. Längere Texte brauchen Absätze, deshalb springt hier nichts. Weiter geht es per Tippen ins nächste Feld oder mit Tab im Browser.
- Der Fototitel ist mehrzeilig nur zum Umbrechen. Enter springt dort zum nächsten Feld.
- Felder mit eigener Aktion (Code bestätigen, Anmelden, Passwort speichern) schicken mit Enter direkt ab.

## Umsetzung

- `src/components/Nudge.tsx`: Registry pro Screen für Felder und Buttons, `useNextField`, `useSubmitTarget`, `FixedBarContext`.
- `src/components/Form.tsx`: `TextField` und der Titel im `PhotoPicker` melden sich an.
- `src/components/Button.tsx`: meldet sich als Ziel an. `src/components/ActionBar.tsx` kennzeichnet seine Buttons als fest.
- `src/components/Screen.tsx`, `src/components/compose/ComposeSheet.tsx`: Die ActionBar liegt im selben Kontext wie die Felder.
