# Erinnerungen mit Kater-Nachrichten

Stand: 10.11.2026. Status: erste Fassung gebaut (Routine, nur für Moderatorinnen), Migration 20261110000100 offen. Daria (07.11.2026): „Noch nicht anfangen zu arbeiten, nur notieren und Rückfragen stellen.“ Ergebnis gehört später nach Documentation, `kiez-coins/ENTSCHEIDUNGEN.md`.

## Darias Wunsch (07.11.2026, wörtlich zusammengefasst)

- Erinnerungen bekommen einen eigenen Reiter, wie „Meine Gruppe“.
- Eine Erinnerung ist verknüpft mit einem möglichen Post, einem Textpost oder einer Me-Challenge.
- Das Ziel ist entweder Zeit und Tag oder flexibel x-mal pro Woche.
- Während der Woche kommen Benachrichtigungen vom Kater: „Miau! Vergiss nicht …“ und „Shshshsh, ich will, dass …“. Die Sätze passen grammatisch zum Titel der Erinnerung und spiegeln den Fortschritt.
- Ist die selbst gesetzte Aufgabe erledigt, lässt sie sich in einer Gruppe, nur für mich, im Kiez oder überall posten.
- Die Verknüpfung ist optisch offen. Ein Hashtag oder etwas Hashtag-Ähnliches liegt nahe, braucht laut Daria aber Verbesserungen.

## Was Claude im Code gefunden hat (07.11.2026)

- Push-Nachrichten gibt es heute nur als Schalter (`src/app/account/notifications.tsx`, `profile.push`). Es fehlen `expo-notifications`, gespeicherte Push-Tokens und ein Server, der zu festen Zeiten sendet (Edge Function mit `pg_cron`). Erinnerungen brauchen diese Grundlage zuerst.
- iPhone-Testerinnen nutzen die Web-App. Web-Push auf dem iPhone geht nur, wenn die Seite auf dem Home-Bildschirm liegt (iOS 16.4 oder neuer).
- Hashtags sind schon belegt: `#vorher` und `#nachher` im Text von Vorher-Nachher-Posts. `@`-Erwähnungen gibt es auch (`WithMentions.tsx`). Die Markierung für Erinnerungen muss sich davon abheben.
- Textposts kommen mit PR #192 (noch nicht gemergt, Migration offen).

## Offene Fragen an Daria

1. Benachrichtigungen: Echte Push-Nachrichten aufs Handy (großer Umbau, siehe oben) oder für den Anfang nur Kater-Hinweise in der App beim Öffnen?
2. „Möglicher Post“: Ist das ein Entwurf, oder nur ein Titel wie „Fenster putzen“, aus dem beim Erledigen ein Post wird?
3. Grammatik: Gibt die Person den Titel als Tätigkeit ein („Joggen gehen“), oder darf die App eine feste Form verlangen, etwa „Ich will …“ mit Ergänzung? Freie Titel lassen sich in sieben Sprachen nicht zuverlässig beugen.
4. Wie oft meldet sich der Kater? Zum Beispiel einmal am Tag der Erinnerung, bei „x-mal pro Woche“ höchstens einmal am Tag, mit ruhigen Stunden nachts?
5. Wer sieht Erinnerungen? Vermutlich nur die Person selbst, auch wenn der fertige Post öffentlich ist.
6. Markierung im Post: siehe Vorschläge unten.

## Vorschläge für die Markierung (Claude, 07.11.2026)

- A: Glöckchen-Tag, eine kleine Pille mit Wecker-Icon und Titel, etwa „⏰ Joggen 3/4“. Hebt sich von `#vorher` ab und zeigt den Fortschritt.
- B: Doppelkreuz mit eigenem Zeichen, etwa `~Joggen` oder `!Joggen`, tippbar wie ein Hashtag. Nah an Darias Idee, aber ein neues Zeichen muss man lernen.
- C: Kater-Pfote vor dem Titel, als Zeichen „der Kater hat Dich erinnert“. Passt zur Kater-Stimme der Nachrichten.

## To-do für später (Daria, 07.11.2026)

- Einfache Animationen für die Erinnerungen.
- Allgemein Animationen, gegebenenfalls solche, bei denen der Kater erklärt, was man machen kann oder soll. Ob es das braucht und in welcher Form, klärt der qualitative Test am 07.11.2026.

## Antworten von Daria (10.11.2026)

1. Benachrichtigungen: erst in der App. Echte Push-Nachrichten später.
2. Möglicher Post: Der Titel wird zum optionalen Post. Standard ist eine Me-Challenge, die Beschreibung (optional) steht als Vorher-Text davor.
3. Titel: „Ich will …“ mit Ergänzung.
4. Häufigkeit: zwischen 08:00 und 20:00 zwei- bis dreimal.
5. Sichtbarkeit: Antwort „Ein lustiger Text wie bei Duolingo, nicht zu sachlich“. Annahme von Claude: vorerst nur für die Person selbst, mit lustigem Hinweis („Nur Du und der Kater wissen davon. Er kann schweigen. Meistens.“). Rückfrage offen.
6. Markierung: Pille mit Zeichen, Text und Fortschritt, „%Joggen 1/4“ in der Pille. Annahme von Claude: „%“ steht für ein Zeichen, gebaut mit dem Uhr-Icon. Rückfrage offen.

## Gebaut (Claude, 10.11.2026)

- Migration `supabase/migrations/20261110000100_erinnerungen.sql`: Tabellen `reminders`, `reminder_done`, Spalte `challenges.routine_label`, Funktion `link_routine_post`.
- `/routine`: Liste mit Fortschritt der Woche, Kater oben, Beenden per Link oder langem Druck.
- `/routine/new`: „Ich will …“, Beschreibung, x-mal pro Woche oder feste Tage mit Uhrzeit.
- `/routine/[id]`: Erledigt melden, „Als Me-Challenge posten“ (Blatt mit Titel und Vorher-Text) oder „Nur abhaken“.
- Feed: Kater-Hinweis oben, zwischen 8 und 20 Uhr höchstens dreimal am Tag, mindestens 3 Stunden Abstand.
- Post: Pille `RoutinePill` mit Uhr-Icon, z. B. „Joggen gehen 2/4“.
- Kater-Sätze in `src/data/katerRoutine.ts`, Vorschläge von Claude.
- Einmalige Erinnerungen (Daria, 10.11.2026): heute, morgen oder anderer Tag, jeweils „bis“, „um“ oder „von … bis“. Migration `20261110000200_erinnerung_einmal.sql`.
- Noch offen: Übersetzungen der neuen Texte, echte Push-Nachrichten, Sichtbarkeit für die Gruppe.

## Idee: Kalendereintrag importieren (Daria, 10.11.2026, Frage)

„Planen: importieren eines Kalendereintrags, indem man einen Screenshot oder eine Kalenderdatei an die App sendet?“
- Kalenderdatei (.ics): in der App per Dateiauswahl gut machbar. Teilen aus der Kalender-App an KiezCoins braucht eine Share Extension (nur Android-App bzw. iOS-App, nicht die Web-App auf dem iPhone).
- Screenshot: braucht Texterkennung, z. B. eine Edge Function mit einem Bildmodell. Machbar, aber mit Kosten pro Bild und Datenschutzfrage.
- Status: offen, nicht gebaut.
