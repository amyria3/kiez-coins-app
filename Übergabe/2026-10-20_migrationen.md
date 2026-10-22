# Migrationen für Supabase vom 20.10.2026

**Status:** Daria hat die Migrationen 1 bis 7 am 20. und 21.10.2026 im SQL-Editor ausgeführt. Offen sind Migration 8 und 9 und der Eintrag in Documentation.

- **Datum:** 20.10.2026
- **Gehört nach:** Datenbank-Doku in Documentation (Liste der Migrationen, Tabellen `comments` und `challenges`).
- **Wer:** Daria. Claude hat aus der Code-Sitzung keinen Zugang zu Supabase.

## So führst Du die Migrationen aus

1. Öffne das Supabase-Projekt `aqxzxpxrshizlaqyjplw` und dort den SQL-Editor.
2. Kopiere den Inhalt der ersten Datei unten in eine neue Abfrage und klicke auf „Run“.
3. Wiederhole das mit den übrigen Dateien. Die Reihenfolge stimmt mit den Dateinamen überein.
4. Prüfe unter „Table Editor“, dass die neuen Spalten da sind.
5. Trag in Documentation ein, dass die Migrationen laufen, und lösch diese Datei.

Jede Datei läuft genau einmal. Ein zweiter Lauf bricht mit „already exists“ ab und ändert nichts.

## 1. `supabase/migrations/20261020000300_comment_replies.sql`

**Wozu:** Antworten auf Kommentare.

**Ändert:**
- `comments.reply_to_id uuid`, verweist auf einen Kommentar derselben Challenge.
- Eindeutigkeit `(id, challenge_id)` und ein zusammengesetzter Fremdschlüssel. So kann eine Antwort nur an einem Kommentar derselben Challenge hängen.
- Wird der Ausgangskommentar gelöscht, bleibt die Antwort stehen, und `reply_to_id` wird leer.
- Index auf `reply_to_id`.

**Danach prüfen:** In einer Challenge auf „Antworten“ tippen und absenden. Die Antwort steht eingerückt unter dem Kommentar.

## 2. `supabase/migrations/20261020000400_challenge_coords.sql`

**Wozu:** Entfernung im Feed („1,3 km“) und Sortierung von „In der Nähe“.

**Ändert:**
- `challenges.lat` und `challenges.lng` (double precision, mit Wertebereich-Prüfung).
- Update-Recht auf beide Spalten für angemeldete Nutzerinnen, damit Entwürfe den Punkt mit speichern.

**Danach prüfen:** Neue Challenge mit freigegebenem Standort erstellen. Im Table Editor stehen bei ihr Werte mit 3 Nachkommastellen in `lat` und `lng`. Im Feed steht am Beitrag die Entfernung.

**Bis sie läuft:** Die App speichert Challenges ohne Punkt. Es gibt keinen Fehler.

## 3. `supabase/migrations/20261020000500_challenge_views.sql`

**Wozu:** Aufrufe in „Deine Challenges“.

**Ändert:**
- Neue Tabelle `challenge_views` (`challenge_id`, `user_id`, `created_at`), pro Person und Challenge höchstens ein Eintrag.
- RLS: Zählen darf jede angemeldete Person, außer bei eigenen Challenges. Lesen darf nur, wer die Challenge erstellt hat.
- Kein Update und kein Löschen für Nutzerinnen.

**Danach prüfen:** Mit einem zweiten Konto eine Challenge öffnen. In „Deine Challenges“ des ersten Kontos steht bei „Aufrufe“ 1.

**Bis sie läuft:** Die Karte zeigt bei „Aufrufe“ einen Strich. Es gibt keinen Fehler.

## 4. `supabase/migrations/20261020000600_delete_open_challenge.sql`

**Wozu:** Offene Challenges löschen. Seit `20261020000200` durften nur Entwürfe gelöscht werden. Deshalb hat „Löschen“ bisher nicht geklappt.

**Ändert:** Die Regel heißt jetzt „Eigene Challenge löschen“ und erlaubt Entwürfe und offene Challenges, solange niemand angenommen hat.

**Danach prüfen:** In „Deine Challenges“ eine offene Challenge löschen. Sie verschwindet aus dem Feed.

**Offen:** Das Foto bleibt im Storage liegen. Aufräumen kommt später (Storage-Regel oder Funktion).

## 5. `supabase/migrations/20261020000700_challenge_extra_images.sql`

**Wozu:** Bis zu 2 weitere Fotos pro Challenge.

**Ändert:** `challenges.extra_image_paths text[]` (Standard leer, höchstens 2 Einträge) und Update-Recht darauf für Entwürfe.

**Danach prüfen:** Challenge mit 3 Fotos erstellen. Im Detail lässt sich das Foto seitlich wischen, Punkte zeigen die Anzahl.

**Bis sie läuft:** Die App speichert nur das Hauptfoto. Es gibt keinen Fehler.

## 6. `supabase/migrations/20261021000100_groups.sql`

**Wozu:** Gruppen mit Edensteinen. Umsetzung: `Übergabe/2026-10-21_gruppen.md`.

**Ändert:**
- Neue Tabellen `groups` und `group_members` mit RLS: Lesen nur als Mitglied, Schreiben nur über Funktionen.
- `challenges.group_id` und `challenges.edensteine` (1 bis 10, nur bei Gruppenaufgaben, dann ohne Bounty). Gruppenaufgaben brauchen keinen Ort.
- Regeln: Gruppenaufgaben und ihre Kommentare sehen nur Mitglieder. Kiez-Challenges entstehen weiter nur ohne Gruppe.
- Funktionen `create_group`, `join_group`, `leave_group`, `remove_group_member`, `transfer_group_founder`.
- `accept_challenge` neu: Gruppenaufgaben nehmen Mitglieder ohne Kiez an.

**Danach prüfen:** In der App unter „Gruppen“ eine Gruppe gründen. Mit einem zweiten Konto über den Code beitreten. Die Gruppenseite zeigt dann 2 Mitglieder.

**Bis sie läuft:** Der Reiter „Gruppen“ zeigt nur „Gruppe gründen“ und „Mit Code beitreten“. Beides meldet einen Fehler.

## 7. `supabase/migrations/20261021000200_soft_delete_challenge.sql`

**Wozu:** Offene Challenges löschen und wieder veröffentlichen. Läuft nach Nummer 6.

**Ändert:**
- Neuer Status `deleted` und Spalte `challenges.deleted_at`.
- Gelöschte Challenges sieht nur die Ersteller:in. Kommentare und Likes sind dort gesperrt.
- Funktion `delete_challenge`: offene Challenge ohne Annehmende auf `deleted` setzen.
- Funktion `restore_challenge`: zurück auf `open`, optional mit neuer Frist.
- Endgültig löschen nur noch Entwürfe. Nummer 4 ist damit überholt.

**Danach prüfen:** In „Deine Challenges“ eine offene Challenge löschen. Sie verschwindet aus dem Feed und steht zugeklappt auf der letzten Seite. Aufklappen, „Wieder veröffentlichen“, sie steht wieder im Feed.

**Bis sie läuft:** Löschen und Wieder veröffentlichen melden einen Fehler.

## 8. `supabase/migrations/20261021000300_delete_closed_challenge.sql`

**Wozu:** Auch geschlossene Challenges lassen sich löschen, solange niemand sie angenommen hat.

**Ändert:** `delete_challenge` neu (`create or replace`): Status `open` oder `closed`, ohne Annehmende. Keine neue Tabelle, keine neue Regel.

**Danach prüfen:** Eine geschlossene Challenge in „Deine Challenges“ löschen. Sie landet unter „Gelöscht“.

## 9. `supabase/migrations/20261021000400_purge_deleted_challenge.sql`

**Wozu:** „Endgültig löschen“ bei gelöschten Challenges in „Deine Challenges“.

**Ändert:** Die Regel „Eigenen Entwurf löschen“ erlaubt jetzt Entwürfe und gelöschte Challenges. Kommentare, Likes und Aufrufe verschwinden mit.

**Danach prüfen:** Eine gelöschte Challenge aufklappen und „Endgültig löschen“ tippen. Sie verschwindet aus der Liste.

**Offen:** Das Foto bleibt im Storage liegen.

## 10. `supabase/migrations/20261021000800_ensure_profile.sql`

**Wozu:** Am 21.10.2026 hatte Darias Konto keine Zeile in `profiles` und `profile_settings`. Deckname, Kiez und Einstellungen landeten dadurch nirgends, ohne Fehlermeldung. Der Trigger `on_auth_user_created` war vorhanden, die Ursache ist unklar.

**Ändert:**
- Trägt für alle Konten ohne Profil die fehlenden Zeilen nach.
- Neue Funktion `ensure_own_profile`. Die App ruft sie nach dem Anmelden auf, wenn kein Profil da ist.

**Danach prüfen:** In der App abmelden und neu anmelden, Deckname und Kiez festlegen. Im Table Editor steht dann eine Zeile in `profiles` mit Deckname und Kiez.

## 11. `supabase/migrations/20261021000900_app_texts.sql`

**Wozu:** Texte-CMS für Buttons und Kater, siehe `2026-10-21_texte-cms.md`.

**Ändert:** Neue Tabelle `app_texts` mit 138 Texten aus dem Code, Lesen für alle, Schreiben nur im Dashboard.

**Danach prüfen:** In `app_texts` bei „Anheuern“ das Feld `text` ändern. Die App zeigt den neuen Text auf dem Startbildschirm, sobald sie wieder nach vorn kommt.

**Bis sie läuft:** Die App zeigt die Texte aus dem Code. Es gibt keinen Fehler.

## 12. `supabase/migrations/20261021001000_download_settings.sql`

**Wozu:** Die Download-Seite funktioniert ohne Secret in den Edge Functions (Branch `claude/download-ohne-secret`, am 21.10.2026 nach main übernommen, Nummer von 0700 auf 1000 geändert).

**Ändert:** Neue Tabelle `download_settings` mit einer Zeile: `password_sha256` (Passwort als SHA-256-Hash, hex) und `apk_url` (Ausweichweg, solange keine APK im Bucket liegt). Nur die Edge Function liest sie.

**Danach:** Passwort-Hash per SQL eintragen. Der Wert gehört nicht ins Repo.

## 13. `supabase/migrations/20261021001100_download_settings_page.sql`

**Wozu:** Rückweg bei falschem Passwort, solange kiezcoins.de noch nicht auf Vercel zeigt.

**Ändert:** Spalte `download_page` in `download_settings`.

**Reihenfolge:** Erst 12, dann 13. Die Secrets `DOWNLOAD_PASSWORD` und `DOWNLOAD_PAGE` gehen weiter vor und sind ohne die Tabelle ebenfalls ausreichend.

## 14. `supabase/migrations/20261021001200_app_texts_rechtstexte.sql`

**Wozu:** Rechtstexte im Texte-CMS, siehe `2026-10-21_texte-cms.md`.

**Ändert:** Trägt in `app_texts` alle Überschriften und Absätze von Impressum, Datenschutz, Nutzungsbedingungen und Community-Regeln ein, dazu „Stand 21.10.2026“ und neue Button-Texte. Schon geänderte Fassungen bleiben.

**Voraussetzung:** Nr. 11 (`app_texts`) ist gelaufen.

## 15. `supabase/migrations/20261021001300_app_texts_edit.sql`

**Wozu:** Texte-Editor in der App (Dein Konto › Texte).

**Ändert:** Moderatorinnen (Tabelle `moderators`) dürfen in `app_texts` die Spalte `text` ändern.

**Voraussetzung:** Nr. 7 (`moderation`, Tabelle `moderators`) und Nr. 11 (`app_texts`). Daria steht in `moderators`.

## 16. `supabase/migrations/20261021001400_app_texts_languages.sql`

**Wozu:** Mehrsprachigkeit, siehe `2026-10-21_mehrsprachigkeit.md`.

**Ändert:** Spalten `en`, `fr`, `uk`, `ar`, `he` in `app_texts`, Schreibrecht für Moderatorinnen, und alle rund 880 Texte der App als Zeilen.

**Voraussetzung:** Nr. 11 (`app_texts`) und Nr. 15 (`app_texts_edit`).

**Bis sie läuft:** Die App zeigt die mitgelieferten Übersetzungen. Der Editor kennt nur die bisherigen Texte und nur Deutsch.

## 17. `supabase/migrations/20261022000100_photo_posts.sql`

**Wozu:** Beitrag „Nur ein Bild“ (Schalter in Schritt 1 beim Erstellen).

**Ändert:** `challenges.type` erlaubt `photo`. Ein Bild hat keine Coins. `accept_challenge` lehnt Bilder ab.

**Bis sie läuft:** Challenges klappen wie bisher. Ein Bild zu posten scheitert an der Typprüfung der Datenbank.

## 18. `supabase/migrations/20261022000200_like_counts.sql`

**Wozu:** Anzahl Likes neben dem Herz.

**Ändert:** Funktion `like_counts`. Sie liefert nur Summen, die Likes selbst bleiben privat.

**Bis sie läuft:** Das Herz zeigt keine Zahl.


## 19. `supabase/migrations/20261022000300_edit_challenge_image.sql`

**Wozu:** Foto beim Bearbeiten einer Challenge oder Aufgabe ändern.

**Ändert:** Funktion `set_challenge_image`. Sie trägt den Pfad eines neuen Fotos ein, nur für eigene offene Challenges, die noch niemand angenommen hat.

**Bis sie läuft:** Titel, Text und die übrigen Felder speichern wie bisher. Ein neues Foto meldet einen Fehler und bleibt nur bis zum nächsten Laden sichtbar.

## 20. `supabase/migrations/20261022000400_bio_friends.sql`

**Wozu:** Kurze Bio und Webseite im Profil, Freundschaftsanfragen.

**Ändert:**
- Spalten `bio` (bis 160 Zeichen) und `website` (http/https) in `profiles`, änderbar nur am eigenen Profil.
- Tabelle `friendships`: Anfrage (`pending`) und Freundschaft (`accepted`). Annehmen darf nur die angefragte Person, lösen beide. Keine Anfrage zwischen Personen, die sich blockieren. Blockieren beendet eine Freundschaft (Trigger).

**Bis sie läuft:** Profil und Personenansicht zeigen keine Bio, keine Webseite und keinen Knopf für Freundschaften. „Freundschaften“ im Konto meldet, dass die Datenbank ein Update braucht.
