# Text auf dem Foto

Datum: 2026-10-29 · Status: umgesetzt, Migration am 29.10.2026 eingespielt (von Claude geprüft), PR #114 gemergt; noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Beiträge“), Datenbank-Doku (`challenges.photo_text`, `photo_text_x`, `photo_text_y`)

## Entscheidung von Daria (29.10.2026)

- Text über das Foto legen, nur bei „Nur ein Bild“ (auch privat). Nicht bei We-Challenges, Me-Challenges und Gruppenaufgaben.
- Beim Posten einen kurzen Text tippen und mit dem Finger auf dem Foto verschieben, wie bei Stories. Er erscheint im Feed, im Detail und in der Vorschau.

## Umsetzung

- Datenbank: Migration `supabase/migrations/20261029000200_bild_text.sql`. Spalten `photo_text` (höchstens 80 Zeichen), `photo_text_x`, `photo_text_y` (Mitte des Texts als Anteil der Bildfläche, 0 bis 1). Entwürfe dürfen sie ändern. Lokal mit Postgres 16 getestet; das Skript läuft zweimal ohne Fehler, zu lange Texte und Werte über 1 werden abgelehnt.
- Das Foto selbst bleibt unverändert. Die App legt den Text darüber: weiße Schrift auf halbdurchsichtigem dunklem Feld.
- App: `src/components/PhotoText.tsx` (Eingabe mit Vorschau zum Verschieben, Anzeige), Erstellen-Blatt (`compose/PublicComposeForm.tsx`), Entwürfe (`challenge/create/step-1.tsx`), Vorschau, Feed (beide Looks, `ChallengePost.tsx`), Detail (`HeroScreen` in `Screen.tsx`).
- Ohne Migration: Bilder ohne Text gehen wie bisher. Die App schickt die Spalten nur mit, wenn Text da ist (oder ein gespeicherter Text gelöscht wird).
- Beispieldaten: Das private Bild „Mein Balkon im Herbst“ trägt den Text „Herbst auf dem Balkon“ (Text von Claude).

## Offene Punkte

- Die Lage ist ein Anteil der Fläche. Feed (Kiez: fast quadratisch, Fashionable: 4:5) und Detail (hoch) schneiden das Foto unterschiedlich zu, deshalb sitzt der Text dort leicht anders auf dem Motiv.
- Im Kiez-Look kann die Glasleiste unten auf der Karte einen Text ganz unten verdecken.
- Keine Wahl von Schriftgröße oder Farbe.
