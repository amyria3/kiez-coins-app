# Erinnerungen mit Kater-Nachrichten

Stand: 07.11.2026. Status: offen, noch nicht begonnen. Daria (07.11.2026): „Noch nicht anfangen zu arbeiten, nur notieren und Rückfragen stellen.“ Ergebnis gehört später nach Documentation, `kiez-coins/ENTSCHEIDUNGEN.md`.

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
