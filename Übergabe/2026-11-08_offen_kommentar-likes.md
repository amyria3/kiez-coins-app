# Kommentare liken

**Stand 2026-11-08.** Daria: „Kommentare liken, sehen, wer geliked hat (auch wenn nicht mein Post).“

- „Wer hat geliked“ gab es für Posts schon (2026-11-05, für alle, die den Post sehen). Neu: dasselbe für Kommentare.
- App: Unter jedem Kommentar steht neben „Antworten“ ein kleines Herz. Tipp aufs Herz liked, Tipp auf die Zahl
  öffnet `challenge/[id]/likes?kommentar=<id>` mit der Liste der Personen.
- Datenbank: Migration `supabase/migrations/20261108000300_kommentar_likes.sql`
  - Tabelle `comment_likes` (privat, jede Person liest nur ihre eigenen Likes)
  - `can_see_challenge(id)`: gleiche Regel wie die Policy „Challenges lesen“
  - `comment_like_counts(challenge_ids)`: Zahl je Kommentar und ob ich geliked habe
  - `comment_likers(comment_id)`: wer geliked hat, ohne Personen, die ich blockiert habe
- Ohne die Migration zeigt die App unter Kommentaren kein Herz, sonst ändert sich nichts.

**Offen:**
1. Daria führt die Migration im Supabase SQL Editor aus.
2. Datenbank-Doku in Documentation um `comment_likes`, `can_see_challenge`, `comment_like_counts`, `comment_likers` ergänzen.
