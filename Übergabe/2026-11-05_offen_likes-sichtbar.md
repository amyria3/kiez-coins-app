# Offen: Wer hat geliked (Migration ausführen)

**Stand 2026-11-05.** Daria hat entschieden: Alle, die einen Post sehen, sehen auch, wer ihn geliked hat.

- App: Tipp auf die Like-Zahl im Feed (oder aufs Herz in „Meine Posts“) öffnet `challenge/[id]/likes`.
- Datenbank: neue Funktion `challenge_likers(p_challenge_id)` in
  `supabase/migrations/20261105000300_likes_sichtbar.sql`. Die Tabelle `likes` bleibt privat; die Funktion
  gibt Personen nur für Challenges heraus, die man sehen darf (Regel wie `like_counts`), ohne selbst blockierte Personen.

**Nächster Schritt:** Daria führt die Migration im Supabase SQL Editor aus. Ohne sie zeigt die Liste den Hinweis
„Die Liste der Likes ist gleich da“. Danach die Datenbank-Doku in Documentation um die Funktion ergänzen
und diese Notiz löschen.
