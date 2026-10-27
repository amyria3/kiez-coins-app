# Russisch in der App, alle Sprachen auf der Website

- Datum: 2026-10-26
- Status: offen (Prüfung der Übersetzungen durch Muttersprachler:innen, Übernahme in Documentation)
- Gehört in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Sprachen“, und die Datenbank-Doku (Tabelle `app_texts`, neue Spalte `ru`)

## Stand

- Daria wünscht Ukrainisch und Russisch in App und Website (26.10.2026). Ukrainisch hatte die App schon.
- App: `src/i18n/ru.json` (alle 1065 Texte), `ru.er.json`, `ru.sie.json`. Sprachauswahl „Русский“ nach Ukrainisch, Mehrzahlregeln wie Ukrainisch (`one`, `few`, `many`), Datumsformat `ru-RU`.
- Die App liest `app_texts` jetzt mit `select('*')`. Fehlt eine Sprachspalte, gelten die übrigen Übersetzungen trotzdem (vorher fiel dann alles auf Deutsch zurück).
- Website: Startseite jetzt in allen App-Sprachen unter `/`, `/en/`, `/fr/`, `/uk/`, `/ru/`, `/ar/`, `/he/`. Auswahlmenü oben rechts statt „DE | EN“. Arabisch und Hebräisch mit `dir="rtl"`, auch der Prototyp im Telefon.
- Website-Übersetzungen: `scripts/site/sprachen/<code>.json`, Schlüssel ist der deutsche Text aus `t('Deutsch', 'English')` bzw. `T(…)` im Prototyp. Fehlt ein Text, steht dort Englisch; der Build meldet das („Texte ohne Übersetzung“). Wer einen deutschen Text ändert, ergänzt den neuen Schlüssel in diesen Dateien.
- Spenden-, Kater-, Einladungs- und Rechtsseiten bleiben deutsch. Die Links dazu tragen den Hinweis „(auf Deutsch)“ in der jeweiligen Sprache.
- Übersetzt von Claude, noch von keiner Muttersprachlerin geprüft. Grundfassung spricht mit „(а)“-Endungen geschlechtsneutral an, `er`/`sie` ersetzen sie.

## Nächster Schritt

- Migration `20261026000200_app_texts_russian.sql` hat Daria am 27.10.2026 im SQL-Editor ausgeführt. Erledigt.
- Reihenfolge der Sprachen in App und Website nach Alter (Daria, 26.10.2026): Hebräisch, Arabisch, Englisch, Deutsch, Französisch, Ukrainisch, Russisch.
- Neue Texte aus anderen Pull Requests (z. B. Umfrage, PR #49) brauchen auch einen Eintrag in `ru.json`. `node scripts/i18n.mjs` zeigt, was fehlt.
