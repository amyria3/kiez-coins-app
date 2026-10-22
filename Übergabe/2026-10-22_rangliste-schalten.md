# Rangliste in den Gruppeneinstellungen ein- und ausschalten

- **Datum:** 22.10.2026
- **Gehört nach:** `kiez-coins` Konzept Gruppen, Datenbank-Doku (Migration 20261022000500), Feature-Liste.
- **Code:** noch nicht auf `main`. Migration `20261022000500_group_leaderboard_toggle` noch nicht ausgeführt.

## So ist es umgesetzt

- **Datenbank:** Spalte `groups.show_leaderboard` (Standard an). Nur die Gründerin schaltet über `set_group_leaderboard(p_group_id, p_show)` um.
- **Gruppenseite:** Die Gründerin sieht den Bereich „Gruppeneinstellungen“ mit dem Schalter „Rangliste anzeigen“.
- **Rangliste an:** wie bisher, Platz, Edensteine und erledigte Aufgaben aller Mitglieder.
- **Rangliste aus:** Der Bereich heißt „Mitglieder“ und listet nach Beitritt ohne Platz. Jede Person sieht nur ihre eigenen Edensteine und erledigten Aufgaben. Die Gründerin entfernt Mitglieder und überträgt ihre Rolle weiterhin per Antippen.
- **Gruppenkarte im Feed:** zeigt weiter den eigenen Bestand. Der Hinweis lautet ohne Rangliste „Mitglieder · Einladen“.
- **Ohne Migration:** Die App behandelt die Rangliste als an. Der Schalter meldet einen Fehler.
