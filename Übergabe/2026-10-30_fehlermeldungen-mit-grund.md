# Fehlermeldungen zeigen den Grund

Datum: 2026-10-30 · Status: umgesetzt, noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/app/Anleitung_App.md` (neuer Abschnitt „Fehlermeldungen“) oder `kiez-coins/design/UX_UI_Regeln.md`

## Entscheidung von Daria (30.10.2026)

Alle Fehlermeldungen durchgehen: Keine Meldung verschluckt den Grund. Anlass war „Keine Berechtigung zum Ändern der Texte.“ im Texte-Editor, obwohl die Migration eingespielt war.

## Umsetzung

- `errorText` (`src/data/remote.ts`): Unter dem Satz steht klein der technische Grund (Code, Meldung, Details der Datenbank). Ausnahmen: eigene Meldungen der Datenbank (P0001), „Jemand war schneller“, doppelter Deckname, kein Netz.
- Fehlende Rechte (42501): „Das darfst Du gerade nicht.“ mit Grund. Die Frage nach dem Kiez nur bei Challenges.
- `ShownError`: Fehler, die der Store schon als Satz formuliert hat. `errorText` packt sie nicht noch einmal ein.
- Texte-Editor (`saveAppText`): gibt den echten Fehler beim Anlegen weiter.
- Feed: „Das hat nicht geklappt“ zeigt den Grund klein darunter (`FeedStateMessage`, `feedError` im Store).
- Chats: „Datenbank braucht ein Update“ nur noch, wenn die Tabelle fehlt. Sonst „Chats nicht geladen.“ mit Grund.
- Freund:innen: Lädt die eigene Einladung nicht, steht ein Hinweis mit Grund da. Bisher fehlte der Abschnitt einfach.
- Kiez finden (Onboarding): Grund hinter „Wir haben hier ein technisches Problem …“.
- Profil speichern: scheiterte bisher still. Jetzt kommt „Profil nicht gespeichert“ mit Grund, ohne Netz weiter still.
- Still bleiben absichtlich: Speichern auf dem Gerät (AsyncStorage), „Bewegung reduzieren“, Aufrufe zählen, Teilen-Fallbacks.
