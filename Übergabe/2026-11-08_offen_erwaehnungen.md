# @-Erwähnungen in Kommentaren

Stand: 08.11.2026. Status: teilweise erledigt, Benachrichtigung offen. Ergebnis gehört nach Documentation, `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Kommentare“.

## Darias Wunsch (08.11.2026)

„Leute markieren“: Im Kommentarfeld `@Simon the Cat` tippen, und die Person ist richtig markiert.

## Erledigt (PR „Kommentare: Leute mit @ markieren“)

- Beim Tippen von `@` zeigt das Kommentarfeld bis zu fünf Personen über der Eingabe. Die Suche passt auf den Anfang des Namens oder eines seiner Wörter („the“ findet „Simon the Cat“). Ein Tipp setzt `@Name ` ein.
- Reihenfolge: zuerst die Person, der man antwortet, dann Erstellerin, Annehmende und Mitmachende, dann wer zuletzt kommentiert hat, dann alle anderen bekannten Personen. Nicht vorgeschlagen: man selbst, Gruppenkonten, blockierte Personen.
- Im Kommentar erscheint `@Name` in `color/accent/signal` wie in Beiträgen. Namen mit Leerzeichen gehen, weil die App mit den bekannten Namen vergleicht, nicht mit einem Muster. Ein Tipp auf den Namen öffnet das Profil.
- Code: `src/lib/mentions.ts`, `src/components/Comments.tsx`, `src/app/challenge/[id]/index.tsx`.
- Gespeichert wird nur der Text. Benennt sich jemand um, ist eine alte Erwähnung nicht mehr hervorgehoben.

## Offen: Benachrichtigung der erwähnten Person

Push-Nachrichten gibt es in der App noch nicht (nur der Schalter `profile.push`, siehe `2026-11-07_offen_erinnerungen.md`). Für Erwähnungen braucht es:

1. Push-Grundlage: `expo-notifications`, Tabelle für Push-Tokens, Edge Function zum Senden.
2. Tabelle `comment_mentions (comment_id, user_id)` oder ein Trigger auf `comments`, der die erwähnten Ids aus dem Text liest. Besser: die App schickt die Ids mit (`mentionSuggestions` kennt sie beim Einsetzen), der Server prüft, dass die Person den Beitrag sehen darf (Gruppenbeiträge nur für die Gruppe).
3. Nachricht etwa „{name} hat Dich in einem Kommentar erwähnt“.

Frage an Daria: Push zuerst als Grundlage bauen (zusammen mit den Erinnerungen), oder vorerst ein Hinweis in der App beim Öffnen?
