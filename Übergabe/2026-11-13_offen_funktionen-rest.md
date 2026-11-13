# Offene Punkte zu Freischaltung und Kalender

Datum: 2026-11-13 · Status: offen · Aus den eingearbeiteten Notizen `2026-11-10_feature-freischaltung.md` und `2026-11-10_funktionen-und-kalender.md`. Ergebnis gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Funktionen und Freischaltung“.

- Weitere Funktionen außerhalb des Kerns bekommen einen Schlüssel, sobald Daria sie benennt (Kandidaten: Nachrichten, Wave).
- Die Datenbank prüft die Freischaltung noch nicht selbst, z. B. beim Anlegen eines Schaufensters. Nötig, sobald etwas wirklich nur für Freigeschaltete gelten soll.
- Der Abo-Link des Kalenders liefert auch bei ausgeschaltetem Kalender weiter Termine. Soll er dann leer bleiben, braucht die Edge Function `kalender` eine Prüfung (`routine_feed_paused`).
- „In meine anderen Kalender“ an einzelnen Schaufenster-Terminen bleibt immer sichtbar, auch bei ausgeschaltetem Kalender. Frage an Daria: soll der Button dann verschwinden?
- `CrosspostSwitches` hat die Schrittlogik noch selbst; kann auf `SetupSteps` umgestellt werden.
