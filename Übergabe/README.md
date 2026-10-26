# Übergabe

Ablage für alles, was ein anderer Account braucht, um unfertige Arbeit zu übernehmen. Die Doku selbst liegt nur im privaten Repo [amyria3/Documentation](https://github.com/amyria3/Documentation).

## Was hierher gehört

Daria hat am 2026-10-24 festgelegt:

- **In die Doku (Documentation):** abgeschlossene Aufgaben und Entscheidungen.
- **Hierher:** unklare Punkte, abgebrochene Prozesse und offene Aufgaben, mit allem, was ein anderer Account braucht, um sie zu übernehmen. Der andere Account erreicht nur dieses Repo.

Dazu kommen Notizen von Sitzungen ohne Zugriff auf Documentation: Erledigtes und Entscheidungen, die noch in die Doku müssen.

## So legst Du eine Notiz ab

- Eine Datei pro Thema, Datum vorn.
    - Offene Aufgabe: `JJJJ-MM-TT_offen_thema.md`, zum Beispiel `2026-10-24_offen_vorher-nachher-app.md`.
    - Notiz für die Doku: `JJJJ-MM-TT_thema.md`, zum Beispiel `2026-10-21_push-nachrichten.md`.
- Oben in der Datei: Datum, Status (offen, abgebrochen, unklar) und wohin das Ergebnis in Documentation gehört, zum Beispiel `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“.
- Eine offene Aufgabe enthält: Stand, nächster Schritt, offene Fragen an Daria, betroffene Dateien, SQL-Skript oder Pfad zur Migration, Code-Vorschläge. Nach dem Lesen kann ein anderer Account weitermachen, ohne nachzufragen.
- Braucht die Aufgabe eine Migration oder eine Einstellung, steht ganz oben eine Zeile „Pflichtaufgabe: …“.
- Keine Geheimnisse (Passwörter, Tokens, Service-Role-Keys, IBANs). Dieses Repo ist öffentlich.

## So arbeitest Du die Übergabe ab

**Vor jeder Änderung an Documentation** hier nachsehen:

1. Notizen für die Doku: Inhalt an die richtige Stelle in Documentation übernehmen (nach dessen `AGENTS.md`) und die Datei hier im selben Arbeitsgang löschen.
2. Offene Aufgaben: liegen lassen, bis sie erledigt sind. Wer eine erledigt, schreibt das Ergebnis in die Doku und löscht die Notiz im selben Arbeitsgang. Wer sie nur teilweise schafft, aktualisiert Stand und nächsten Schritt.

Diese `README.md` bleibt immer liegen.

## Offene Aufgaben in diesem Ordner

- `2026-10-23_offen_texte-druck-nummern.json`: ordnet jeder Nummer im Ausdruck („S-022“) den Text im Code zu. Bleibt liegen, bis Darias Papierkorrekturen eingetragen sind, dann löschen. Nicht nach Documentation übernehmen.
- Alle anderen `_offen_`-Dateien beschreiben sich selbst.
- `2026-10-24_offen_gender-uebersetzungen-pruefen.json`: alle neuen Übersetzungen nach Geschlecht, ungeprüft, für Muttersprachler:innen.
- `2026-10-24_offen_gendern.md`: konsistentes Gendern, alle Stellen mit grammatischem Geschlecht und offene Fragen an Daria.
- `2026-10-24_offen_features-aus-textkorrektur.md`: Features, Bugs und offene Fragen, die Daria am 24.10.2026 an den Rand des Text-Ausdrucks geschrieben hat.
- `2026-10-24_offen_umbenennung-kiezkoinz.md`, `2026-10-24_offen_funktionen-sperre.md` und `2026-10-24_offen_coin-animation-me-challenge.md`: Darias To-do-Liste vom 24.10.2026.
- `2026-10-24_offen_email-code-5-minuten.md`: Anmeldung per E-Mail-Code, jeder Code der letzten 5 Minuten gilt. Pflichtaufgabe: Migration für `login_codes`, zwei Edge Functions, Secrets und `pg_cron`-Job.
- `2026-10-24_offen_gruppen.md` und `2026-10-24_offen_gruppen-titelbild.md`: offene Punkte zum Feature „Gruppen“ und zum Gruppen-Titelbild.
- `2026-10-24_offen_look-auf-allen-geraeten.md` und `2026-10-24_offen_web-und-mobile.md`: Abweichungen im Look und zwischen Web-App und Mobile.
- `2026-10-24_offen_figma-abgleich.md`: Figma an den Stand der App anpassen.
- `2026-10-24_offen_typescript-strict.md`: TypeScript auf die neuen React-Native-Typen umstellen.
- `2026-10-25_offen_fehlerberichte.md`: Fehler-Screen mit Fehlerbericht. Pflichtaufgabe: Migration `20261025000200_error_reports.sql` ausführen.
- `2026-10-25_offen_konsistenz.md`: Konsistenzprüfung vom 25.10.2026, Korrekturen auf `main`, offene Entscheidungen und neue Textschlüssel.
- `2026-10-25_offen_gruppe-beim-erstellen.md`: Beim Erstellen zeigt die App, in welcher Gruppe die Person ist (To-do, Daria).
- `2026-10-25_offen_kopf-grosse-bildschirme.md`: Der Feed-Kopf verschwindet auf großen Bildschirmen scheinbar zufällig (To-do, Daria).
- `2026-10-26_offen_umfrage-kommentar.md`: Kommentarfeld in der Umfrage. Pflichtaufgabe: Migration `20261026000100_survey_comment.sql` ausführen.
