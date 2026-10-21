# Workflow-Korrekturen aus der To-do-Liste

Stand: 21.10.2026. Gehört in Documentation nach `kiez-coins/app` (Screens „Deine Challenges“, „Challenge erstellen“, „YourPleasure“) und `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“. Die erledigten Punkte in `kiez-coins/TODO.md` (Projektordner) abhaken.

## Deine Challenges (`manage`)

- Ein Switch „Gelöschte und geschlossene“ schaltet zwischen laufenden Challenges und dem Archiv um. Im Archiv fehlt „Neue Challenge“.
- Geschlossene Challenges haben als ersten Button „Kopie erstellen“, danach „Ansehen“ und „Löschen“. Die Kopie startet „Challenge erstellen“ mit Fotos, Titel, Text, Ort und Bounty; die Fotos werden neu hochgeladen. Gruppenaufgaben kopiert „Aufgabe erstellen“ der Gruppe.
- Gelöschte Challenges haben „Bearbeiten“ statt „Wieder veröffentlichen“. Erst im Bearbeiten-Screen wählt die Person „Veröffentlichen“ oder „Nicht veröffentlichen, Entwurf“.
- Ohne Datenbankänderung: `edit_open_challenge` ändert nur offene Challenges. „Nicht veröffentlichen, Entwurf“ mit Änderungen holt die Challenge deshalb kurz zurück (`restore_challenge`), speichert und löscht sie wieder (`delete_challenge`). Sauberer wäre eine Funktion, die auch gelöschte Challenges ändert ([offen: Migration, nach Rücksprache mit Daria]).

## Challenge erstellen

- Schritt 2 endet mit „Vorschau“. Die Vorschau (`challenge/create/preview`) zeigt die Challenge wie im Detail, der Rand ist ausgeblurrt. Unten ein langer Button „Veröffentlichen“, links daneben ein kleiner „Bearbeiten“ zurück zu Schritt 2.

## YourPleasure (früher „Deine Reise“, Route `reise`)

- Neuer Name in Titel, Konto, Tab-Leiste und Kater-Text.
- Neuer Block „Deine Gruppe“ bzw. „Deine Gruppen“ mit Link zur Gruppe, selbst gegründete zuerst.
- Verlauf getrennt: „Verlauf öffentlich“ und „Verlauf Gruppen“ (mit Gruppenname).

## Kleinere Punkte

- „Frist“ heißt im Detail „Noch“, im Bearbeiten-Screen heißt die Auswahl „Zeitraum“ wie beim Erstellen.
- Passwortfelder nutzen `current-password` statt `new-password`. Damit legt iOS keinen automatischen Passwort-Vorschlag mehr über die Tastatur.
- Felder mit Fehler bekommen eine helle Fläche. Vom Browser ausgefüllte Felder bleiben dunkel mit hellem Text (`public/index.html`).

## Offene Punkte

- [offen: Funktion in Supabase, die gelöschte Challenges direkt ändert, statt zurückholen, ändern, löschen]
