Pflichtaufgabe: Daria führt `supabase/migrations/20261109000100_comment_likes.sql` im Supabase SQL Editor aus.

# Kommentare liken, Melden hinter drei Punkten

**Stand 2026-11-09, offen bis zur Migration.** Ziel in Documentation: `kiez-coins/DATENBANK.md` (Migrationen, Tabellen) und `kiez-coins/design/Icon_Regelwerk.md`.

Daria hat am 2026-11-09 entschieden:

- Melden steht an Kommentaren hinter drei senkrechten Punkten statt hinter der Fahne. Ein Tipp öffnet ein Menü mit „Melden“, wie „Weitere Aktionen“ an der Challenge.
- Kommentare lassen sich liken. Unter dem Kommentar stehen Herz, Anzahl und „Antworten“.

## Datenbank

- Neue Tabelle `comment_likes` (`comment_id`, `user_id`, `created_at`, Schlüssel aus beiden). Wer den Kommentar lesen darf, liest auch seine Likes; liken nur aktive Personen, zurücknehmen nur das eigene Like.
- Zeile für `DATENBANK.md`, Tabellen: `comment_likes` | Likes an Kommentaren | alle, die den Kommentar sehen; schreiben und löschen nur das eigene.
- Ohne Migration zeigen die Kommentare kein Herz. Sonst läuft die App unverändert.

## App

- `src/components/Comments.tsx`: `CommentMenu` (Punkte, Menü in einem Modal an der Stelle des Knopfs), Herz mit Anzahl im Fuß des Kommentars.
- `src/data/remote.ts`: `loadCommentLikes`, `withCommentLikes`, `setCommentLike`. `src/data/store.tsx`: Aktion `toggleCommentLike`.
- Icon `more-vertical`: Darias drei Punkte (`more`), senkrecht gestellt. Fashionable Look: Phosphor `dots-three-vertical`.

## Für das Icon-Regelwerk

- Neue Zeile: dots-three-vertical | Weitere Aktionen am Kommentar (Melden) | `more-vertical` | Kommentare.
- Zeile heart, Spalte „Wo“: zusätzlich „Kommentare“.
- Offene Frage an Daria: Die Challenge zeigt „Weitere Aktionen“ weiter mit waagerechten Punkten. Laut Grundregel hat jede Bedeutung genau ein Icon. Sollen beide senkrecht werden?

## Nächster Schritt

Nach der Migration im Supabase SQL Editor prüfen: `select count(*) from public.comment_likes;` läuft ohne Fehler. Dann ein Kommentar-Like in der App setzen und zurücknehmen, Inhalt in Documentation übernehmen und diese Datei löschen.

## Nachtrag 2026-11-09: Wer hat geliked, Aufräumen

- Tipp auf die Zahl neben dem Herz öffnet `challenge/[id]/likes?kommentar=<id>`: wer den Kommentar geliked hat,
  neueste zuerst, ohne blockierte Personen (`loadCommentLikers` in `src/data/remote.ts`, liest `comment_likes` direkt).
- Im SQL Editor lief am 2026-11-09 versehentlich `20261108000300_kommentar_likes.sql` aus PR #226 statt 20261109000100.
  Folge: Jede Person sieht nur ihre eigenen Kommentar-Likes. Abhilfe: erst `20261109000100_comment_likes.sql`, dann
  `20261109000300_kommentar_likes_aufraeumen.sql` ausführen.
