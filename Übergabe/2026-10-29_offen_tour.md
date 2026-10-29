# Tour: neue Seiten und Rückmeldung

Datum: 2026-10-29 · Status: umgesetzt im PR #115, Migration noch nicht eingespielt · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Tour“), Datenbank-Doku (`tour_feedback`, `tour_feedback_results`)

## Entscheidungen von Daria (29.10.2026)

- Der Erklärungstext war auf dem iPhone abgeschnitten. Text bleibt jetzt ganz sichtbar; die Vorschau oben verkleinert sich.
- Seite „Coins“: neuer Text von Daria („Wer beim Erstellen einer Challenge „Das ist mir bares Geld wert“ anklickt …“). Claude hat „beim Erstellen der App“ zu „einer Challenge“ und „KiezCoins“ zu „Kiez Coins“ geändert.
- Neue Seiten nach „Gruppen“: einfach ein Bild posten (Text von Daria), Sichtbarkeit begrenzen (Titel von Daria), Modus „Privat“.
- Letzte Seite: „Wie fandest Du diese Erklärung?“ mit Mehrfachauswahl („Hilfreich“, „Hat mir Lust auf die App gemacht“, „Umständlich“, „Hätte ich nicht gebraucht“) und freiem Feld „Anderes“. Danach „Danke, dass Du uns unterstützt! Denn ohne Dein Feedback tappen wir im Dunklen.“ Cat The Käptn gibt der Antwort ein Herz.

## Umsetzung

- Texte und Reihenfolge: `src/data/tour.ts`. Seiten: Posten, Annehmen, Coins, Gruppen, Bild, Sichtbarkeit, Privat, Rückmeldung.
- Vorschau je Seite mit echten Elementen und Beispieldaten (`src/app/tour.tsx`, `PREVIEW`): Bild ohne Text „Nur für mich“, Schalter „Auf einen Umkreis von 5 km begrenzen“ über einem Beitrag, Umschalter mit „Privat“ und Hinweis über dem privaten Bild.
- Datenbank: Migration `supabase/migrations/20261029000300_tour_feedback.sql`. Tabelle `tour_feedback`, eine Antwort pro Person, erneutes Absenden ändert sie. Lokal mit Postgres 16 getestet (zweimal ohne Fehler, fremde Antworten und leere Antworten werden abgelehnt, Auswertung nur für die Moderation).
- Auswertung: Dein Konto › Umfrage-Ergebnis, Karte „Tour“ (nur Moderation).
- Ohne Konto (Beispieldaten): Antwort wird ohne Person gespeichert (Daria, 29.10.2026: alle sollen testen und Rückmeldung geben können). Migration `20261029000400_tour_feedback_ohne_konto.sql`, PR #116. Jede Antwort ohne Konto ist eine neue Zeile; mit Konto bleibt es bei einer Antwort pro Person.

## Offene Punkte

- Ohne Konto kann dieselbe Person beliebig oft absenden. Eine Sperre gegen Massen-Einträge gibt es nicht.

- Texte von Claude prüfen: Titel „Einfach ein schönes Bild“, Text zur Sichtbarkeit, Titel und Text „Privat: nur für Dich“.
- Die Seite „Gruppen“ erscheint auch, wenn Gruppen ausgeschaltet sind.
