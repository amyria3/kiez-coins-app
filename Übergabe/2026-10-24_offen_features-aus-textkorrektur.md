# Features und Bugs aus Darias Textkorrektur auf Papier

Datum: 2026-10-24
Status: offen
Ziel in Documentation: `kiez-coins/app/Offene_Punkte.md`, neuer Abschnitt „2026-10-24 – Textkorrektur auf Papier (Daria)“; erledigte Punkte als Entscheidung nach `kiez-coins/ENTSCHEIDUNGEN.md`.

Daria hat diese Punkte am Rand des Ausdrucks notiert (Nummern aus `Übergabe/2026-10-23_offen_texte-druck-nummern.json`). Die Texte selbst sind schon geändert, siehe `Übergabe/2026-10-24_textkorrektur-papier.md`.

## Standort und Kiez

- [ ] **Standort nur für We-Challenges Pflicht** (S-038, S-055). Ohne Kiez darf man lesen, Bilder und Me-Challenges posten (Bilder: Daria, 24.10.2026). Heute verlangt `useRequireKiez()` den Kiez für jedes Posten aus dem Feed (`src/app/feed.tsx`) und unter „Deine Challenges“ (`src/app/manage.tsx`). Für We-Challenges ist die Freigabe des Standorts Pflicht. Betrifft `src/app/onboarding/kiez.tsx`, `requireKiez()` und die Sperren beim Erstellen und Annehmen. Der Hinweis S-055 sagt das schon.
  - Pflichtaufgabe: Migration. Die Datenbank prüft den Kiez über `public.is_active_member()` (`profiles.kiez is not null`, Datei `20261019000100_tables.sql`). Diese Stellen sperren heute Bilder und Me-Challenges ohne Kiez:
    - Regel „Challenge erstellen“ auf `challenges` (zuletzt `20261021000100_groups.sql`, Zeile 118 ff.): jeder neue Kiez-Post, auch Entwürfe, aus denen ein Bild wird.
    - `start_before_after` (`20261023000300_before_after.sql`): Me-Challenge im Kiez.
    - `restore_challenge` (`20261021000200_soft_delete_challenge.sql`): gelöschten Post wieder veröffentlichen.
    - Regeln „Kommentar schreiben“ und „Liken“ (`20261021000200_soft_delete_challenge.sql`) bleiben, wie sie sind: Ohne Kiez darf man nicht kommentieren und nicht liken (Daria, 24.10.2026).
  - Vorschlag: neue Funktion `public.is_member()` (wie `is_active_member()`, ohne die Kiez-Bedingung). Bilder (`type = 'photo'`) und Me-Challenges (`type = 'before_after'`) prüfen `is_member()`, We-Challenges (`type = 'individual'`) und `accept_challenge` weiter `is_active_member()`. Achtung: Ein Bild entsteht als Entwurf vom Typ `individual` und wechselt den Typ per Update (`grant update (type)` in `20261022000100_photo_posts.sql`). Die Regel muss deshalb auch den Typwechsel abdecken, sonst wird aus einem Bild-Entwurf eine We-Challenge ohne Kiez.
  - Daria (24.10.2026): Personen ohne Kiez tragen ein Erkennungszeichen, etwa eine Ninja-Maske, an Profilbild und Posts. Das Zeichen zeigt allen, dass der Kiez dieser Person nicht bestätigt ist. Icon: noch offen (Darias Zeichnung oder Phosphor als Übergang).
  - Sichtbarkeit (Daria, 24.10.2026): Posts von Personen ohne Kiez erscheinen vorerst in jedem Feed „In der Nähe“, mit Erkennungszeichen. Die Regeln zur Sichtbarkeit werden später feiner. Ohne Ort trägt die Datenbank heute „Kiez“ ein (`publish_before_after_row`); diese Posts zeigen als Ort „Irgendwo“ (Daria, 24.10.2026).
- [ ] **Testphase: Pflicht zu PLZ und Lokalisierung aussetzen** (Notiz über S-054). Offene Frage an Daria: Gilt das für alle oder nur für Testerinnen? Widerspricht dem Hilfetext S-054 („Die Postleitzahl ist notwendig“), den sie gleichzeitig so korrigiert hat.
- [ ] **Kiez von Hand muss in der Nähe des Pins liegen**, mit Fehlertoleranz (S-041 „Stimmt nicht, von Hand eingeben“). Offene Frage: welche Toleranz (z. B. Nachbarbezirk, 2 km)?
- [ ] **Angaben über eine Person: nur Stadtteil, Straße auf Wunsch** (Notiz über E-036/E-037). Der Ortsvorschlag beim Erstellen (`src/app/challenge/create/step-2.tsx`, `place.street ?? place.kiez`) soll standardmäßig nur den Stadtteil eintragen, die Straße nur auf Wunsch.

## Fehler und Hinweise

- [ ] **Button „Bei der IT beschweren“** in Fehlerzuständen (F-018 bis F-020 im Feed, E-001 „Aufgabe konnte nicht erstellt werden“). Vorschlag: Button führt zu `/account/support` mit vorausgefüllter Fehlermeldung.
- [ ] **Coins automatisch auf „Keine“ setzen** (D-053), statt nur zu sagen „Wähle bei Coins „Keine““. Betrifft `publish` und `keepUnpublished` in `src/app/challenge/[id]/edit.tsx`.

## Texte nach Typ

- [ ] **Me-Challenge oder We-Challenge nennen statt „Challenge“** (E-017 und Seite `challenge/[id]`, D-018 bis D-023). Typen im Code: `individual` = We-Challenge, `before_after` = Me-Challenge, `photo` = Bild. Vorschlag: Hilfsfunktion `challengeLabel(type)` und Texte mit Platzhalter.
- [x] Gruppenmitglieder oder Nachbar:innen (D-029, V-001): umgesetzt, der Dialog „Challenge schließen?“ wählt nach `groupId`.

## Gendern als Feature

- [ ] **Anrede nach Geschlecht**: „mein Freund“ (D-082), „Kamerad“ (S-022) und Ähnliches sollen sich nach der Person richten (Freund/Freundin …). Ansprache gibt es schon (`profile.address_form`, Platzhalter `{anrede}`). Offene Frage: eigenes Feld für das Geschlecht oder aus der gewählten Ansprache ableiten?

## Kodex

- [ ] **„Wieso?“ bei den Zustimmungen** (S-063 bis S-069): zu jedem Schalter auf `onboarding/kodex` eine kurze Erklärung, warum die Zustimmung nötig ist.

## Bugs

- [ ] **Vorschläge beim Decknamen** (Seite `onboarding/deckname`, z. B. „Rostige Rosi“): Auf dem Button soll der Vorschlag genauso aussehen wie im Eingabefeld (Schrift, Größe, Schreibweise).

## Fragen von Daria, beantwortet mit Screenshots

S-036, F-009, F-025, D-057, D-085, D-094 und V-024: Daria hat Screenshots der Screens bekommen. Ihre Korrekturen dazu stehen noch aus.

V-001 und V-005 („hatten wir schon?“): Ja. V-001 ist derselbe Dialog wie D-029 (Challenge schließen), V-005 derselbe wie D-030 (Challenge löschen), einmal auf der Detailseite, einmal unter „Deine Challenges“. Beide haben jetzt Darias Fassung.
