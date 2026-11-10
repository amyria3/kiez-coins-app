# Funktionen und Kalender überarbeitet

Datum: 2026-11-10 · Status: umgesetzt, Notiz für die Doku · Gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitte „Funktionen“ und „Routine“), Design-Teil nach `kiez-coins/design/Designsystem.md`.

Pflichtaufgabe: Migration `supabase/migrations/20261110001200_feature_kalender.sql` im Supabase SQL Editor einspielen (nach 20261110001100). Ohne sie gilt der Kalender trotzdem als an.

## Entscheidungen (Daria, 2026-11-10)

- Dein Konto › Funktionen: Abschnitt „Modi“ heißt „Feeds & Modi anzeigen oder ausblenden“, „Erinnerungen“ (Routine) ist dort der erste Punkt. „Bilder und Textposts“ heißt „Arten von Content anzeigen oder ausblenden“.
- Routine lässt sich als Standard wählen. Dann öffnet die App beim Start die Routine; zurück geht es in den Feed mit dem zuletzt gewählten Modus als Standard-Reiter.
- Abschnittsüberschriften auf Einstellungsseiten: neuer Stil `text.settingsHeading` (Inter SemiBold 20/26) und `FieldGroup heading` mit 20 mehr Abstand darüber (60 statt 40, also 50 % mehr). `FieldGroup large` bleibt unverändert. Genutzt auf Funktionen und Kalender.
- Kalender liegt seit 2026-11-10 abends unter Dein Konto › Funktionen, als Abschnitt wie Weiterposten (Daria: „Kalender Einstellungen wie die anderen Features unter Features“). Oben der Schalter „Kalender verbinden“, darunter die Einrichtung (`src/components/CalendarSettings.tsx`). Die Route `account/kalender` leitet für alte Links auf `account/features` weiter. Routine verlinkt dorthin. Vorher lag der Kalender unter Einstellungen, davor unter `routine/kalender`.
- Kalender hat einen eigenen Schalter, unabhängig von der Einrichtung. Aus: Routine zeigt keine Termine aus Deinen Kalendern, die Knöpfe zum Kalender verschwinden, die Einrichtung (Abo-Link, verknüpfte Kalender) bleibt erhalten. Dazu die Freischaltung `kalender` (für alle an).
- Anleitung zum Abonnieren nach den Regeln vom Weiterposten: erste Nachricht nennt Anzahl der Schritte und Voraussetzungen, dann jeder Schritt einzeln (Komponente `SetupSteps`).

## Offen

- Der Abo-Link liefert auch bei ausgeschaltetem Kalender weiter Termine. Soll er dann leer bleiben, braucht die Edge Function `kalender` eine Prüfung.
- „In meinen Kalender“ an einzelnen Schaufenster-Terminen bleibt immer sichtbar.
- `CrosspostSwitches` hat die Schrittlogik noch selbst; kann auf `SetupSteps` umgestellt werden.
