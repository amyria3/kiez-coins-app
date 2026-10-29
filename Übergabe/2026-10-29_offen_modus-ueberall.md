# Modus „Überall“ und 5-km-Umkreis

Datum: 2026-10-29 · Status: offen, bis die Migration eingespielt und der PR gemergt ist · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitte „Challenges“ und „Funktionen“), Datenbank-Doku (`challenges.local_only`, `join_challenge`)

Pflichtaufgabe: Inhalt von `supabase/migrations/20261029000100_ueberall_umkreis.sql` im Supabase-SQL-Editor ausführen, bevor der PR gemergt wird (Daria). Claudes Zugang darf in Supabase nur lesen.

## Entscheidungen von Daria (29.10.2026)

- Neuer Modus „Überall“, rechts im Umschalter: Privat, Gruppe, Kiez, Überall.
- „Kiez“ zeigt nur noch Beiträge im Umkreis von 5 km um den eigenen Standort. Bisher zeigte Kiez alle öffentlichen Beiträge, nur nach Entfernung sortiert.
- Mitmachen bei Challenges, die weiter als 5 km entfernt sind, geht nur auf Anfrage. Gemessen wird vom aktuellen Standort. Ohne Standortfreigabe: immer Anfrage. Die Ersteller:in nimmt an oder lehnt ab, wie bei „Auf Anfrage“.
- Beim Posten der Schalter „Auf einen Umkreis von 5 km begrenzen“. Solche Beiträge erscheinen nicht in „Überall“. Wer den Link bekommt, kann sie trotzdem öffnen.

## Umsetzung

- Datenbank: Spalte `challenges.local_only` (Standard `false`), Funktion `distance_meters`, `join_challenge(p_challenge_id, p_lat, p_lng)`: über 5 km oder ohne Standort `requested`. Lesen bleibt erlaubt, damit Links funktionieren. Lokal mit Postgres 16 getestet (nah: joined, Leipzig–Berlin: requested, ohne Punkt: joined, ohne Standort: requested; Skript läuft zweimal ohne Fehler).
- App: `src/data/features.ts` (Modus `everywhere`, Link `?modus=ueberall`), `src/components/FeedHeader.tsx` (Reiter), `src/app/feed.tsx` (Kiez bis 5 km, Überall ohne `localOnly`), `src/components/AudienceHint.tsx`, `src/app/challenge/create/step-2.tsx` (Schalter), `src/app/challenge/[id]/index.tsx` („Anfrage senden“ und Hinweis ab 5 km), `src/data/remote.ts`, `src/data/store.tsx`, `src/data/location.ts` (`KIEZ_RADIUS_METERS`).
- „Was Du so machst“ und Profil: Überall zählt dort wie Kiez, kein eigener Reiter.

## So verhält sich die App

- Kiez ohne Standortfreigabe: Beiträge mit demselben Kiez-Namen wie im Profil (z. B. „Connewitz“).
- Challenges ohne Punkt stehen in Kiez und Überall; Mitmachen ohne Anfrage wie bisher.
- Eigene Beiträge stehen immer in Kiez und Überall, auch mit Umkreis-Begrenzung.
- Ältere App-Fassungen schicken keinen Standort mit. Bei Challenges mit Punkt fragen sie deshalb nach der Migration immer an.

## Nachgereicht (Daria, 29.10.2026)

- Me-Challenge im Kiez: Schalter „Auf einen Umkreis von 5 km begrenzen“ im ersten Schritt (`BeforeAfterForm.tsx`), gespeichert gleich nach dem Anlegen des Entwurfs.
- Nachträglich ändern: Im Menü der eigenen Challenge „Auf 5 km begrenzen“ bzw. „Auch in „Überall“ zeigen“. Funktion `set_challenge_local_only` in derselben Migration (nur Ersteller:in, nur öffentlich ohne Gruppe, nicht gelöscht).
- Website-Prototyp: Modus „Überall“ neben „Mein Kiez“ und im Umschalter im Telefon. Dort steht eine We-Challenge in 148 km Entfernung; „Anfrage senden“, nach kurzer Zeit sagt Mo zu. Texte dafür von Claude, bitte prüfen.

## Offene Punkte

- Die 5 km prüft der Server mit dem Standort, den die App schickt. Wer seinen Standort fälscht, kann die Regel umgehen.
- Im Feed zeigt keine Markierung, dass ein eigener Beitrag auf 5 km begrenzt ist; das steht nur im Menü.
