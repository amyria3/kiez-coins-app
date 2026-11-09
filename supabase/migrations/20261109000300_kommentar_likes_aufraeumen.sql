-- Aufräumen nach Kommentar-Likes (2026-11-09). Am 2026-11-09 lief im SQL Editor versehentlich die Migration
-- 20261108000300_kommentar_likes.sql aus der ersten Fassung von PR #226, die nie auf main kam. Sie hat
-- comment_likes angelegt, aber nur mit „eigene Likes lesen“, und drei Funktionen, die die App nicht nutzt.
-- Gültig ist 20261109000100: erst die ausführen, dann diese Datei.
drop policy if exists "Eigene Kommentar-Likes lesen" on public.comment_likes;
drop function if exists public.comment_likers(uuid);
drop function if exists public.comment_like_counts(uuid[]);
drop function if exists public.can_see_challenge(uuid);
