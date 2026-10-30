# Bild-Beiträge tragen #InDiesemMoment

Datum: 2026-10-27 · Status: erledigt, gehört in die Doku · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Beiträge“ (und Stand der App)

## Entscheidung (Daria, 27.10.2026)

Jeder Beitrag vom Typ „Bild“ („Just a picture“) bekommt vorn im Text die Marke `#InDiesemMoment`.

- **Feste Marke, in allen Sprachen gleich**, wie `#vorher` und `#nachher`. Ein Hashtag bleibt nur dann ein gemeinsames Stichwort, wenn er überall gleich heißt. Im Web mit `translate="no"`.
- **Nicht gespeichert:** Die App setzt die Marke beim Anzeigen davor (`postText()` in `src/components/WithMentions.tsx`). Damit tragen auch ältere Bilder sie, ohne Migration. Erscheint auch ohne eigenen Text.
- **Erstellen und Bearbeiten:** Das Feld „Beschreibung“ zeigt die Marke fest vorn (`TagTextField`, Höchstlänge 500), wie „Erklärung zum Vorher“.

Umgesetzt in PR #87 (amyria3/kiez-coins-app).
