# Look auf allen Geräten und Plattformen

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/design/Designsystem.md`

## Offen

- iOS und Android zeigen immer den Kiez-Look. Sie brauchen einen Speicher, der beim Start synchron liest (z. B. `expo-sqlite/kv-store`). Etwa 14 feste `rgba(31, 33, 35, …)`-Flächen über Fotos bleiben im Kiez-Grau. Schrift, Logo und Kater ändern sich nicht. Den Edenstein zeichnet der Fashionable Look eigens (`InstaGem`).
- Der Kater im Startbild (`KaterStage`, PNG-Teile) bleibt braun. Nur die SVG-Kater nehmen die Signaturfarbe an.

## Vorschlag aus Darias To-do-Liste (2026-10-23)

Den gewählten Look im Profil speichern, damit er auf allen Geräten und in der Home-Bildschirm-App gilt:

- Migration: Spalte `profiles.look` (`kiez` oder `instagram`, Standard `kiez`). Pflichtaufgabe: Daria führt sie im SQL-Editor aus.
- Nach der Anmeldung übernimmt die App den Look aus dem Profil und lädt einmal neu.
- `?look=…` schreibt die Wahl ins Profil, sobald jemand angemeldet ist.
- iOS und Android brauchen einen Speicher, der beim Start synchron liest (zum Beispiel `expo-sqlite/kv-store`), da `src/theme/look.ts` den Look nur einmal beim Start liest.

Umsetzen erst nach Darias Auftrag.
