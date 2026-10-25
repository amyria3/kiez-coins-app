# Konsistenzprüfung des Codes

- Datum: 2026-10-25
- Status: offen; Korrekturen am 25.10.2026 nach `main` gemergt, Entscheidungen unten stehen aus
- Gehört in Documentation: `kiez-coins/app/Arbeitsstand_Code.md` (Abschnitt Konsistenz), Textregeln nach `kiez-coins/ENTSCHEIDUNGEN.md`
- Bericht mit allen Befunden: Claude Doc „KiezCoins: Konsistenzprüfung des Codes“ (https://claude.ai/artifact/3CZNQXf759uEbSbr9csXf1)

## Erledigt (auf `main`)

- Migration `20261022000500_messages.sql` heißt `20261022000600_messages.sql`, da die Nummer doppelt war. Im Supabase-Projekt ändert sich nichts.
- Stilnamen für den Fashionable Look enden auf `Fashionable` (vorher `Insta`).
- `MIN_PASSWORD` steht einmal in `src/data/auth.tsx`.
- `@fortawesome/free-solid-svg-icons` entfernt (nirgends importiert).
- `errorText()` zeigt „Diesen Decknamen gibt es schon“ nur bei `profiles_handle_unique`. Ein doppelter Like gilt als erledigt.
- Entwicklertexte in `remote.ts` (`purgeChallenge`, `saveSurveyAnswer`) durch vorhandene, übersetzte Sätze ersetzt.
- `vorher-nachher/[id].tsx` formatiert Uhrzeit und Wochentag mit `localeTag()` (App-Sprache).
- Fehlendes Pflichtfoto ist sichtbar (Daria, 25.10.2026: „Weiter“ wirkte wirkungslos): `PhotoPicker` hat `error`, Rand und Hinweis erscheinen in der Fehlerfarbe. Genutzt in `challenge/create/step-1.tsx`, `PublicComposeForm.tsx`, `BeforeAfterForm.tsx`, `vorher-nachher/[id].tsx`.
- Erstellen-Blatt (Daria, 25.10.2026): Foto, Titel und Beschreibung bleiben beim Wechsel zwischen „In der Nähe“ und „Gruppen“ und zwischen den Beitragstypen erhalten (`useComposeContent` in `compose/compose.ts`, geteilt in `ComposeSheet.tsx`). Zusatzfotos, Edensteine und Frist bleiben pro Formular. Ist der Text für die Me-Challenge zu lang (über 240 Zeichen), färben sich Rand und Zähler rot, und „Vorher speichern“ wartet.
- Drei Übergabe-Notizen auf den Stand vom 25.10.2026 gebracht (Funktionen-Sperre, Gruppen-Titelbild, Badge „Me-Challenge“).

## Texte mit neuem Schlüssel

Die Übersetzungen in `src/i18n` sind mitgezogen. Daria hatte keine eigenen Fassungen in `app_texts` angepasst (25.10.2026), es geht nichts verloren. `node scripts/app-texts.mjs` bringt die neuen Texte bei Gelegenheit in den Texteditor:

- „Aufgabe zurück schicken“ → „Aufgabe zurückschicken“
- „Erstell eine Challenge …“ (`reise.ts`) → „Erstelle …“
- „Schick uns den Fehlerbericht …“, „… Schick ihn per E-Mail.“ → „Schicke …“
- Vier Texte mit `{Name}` (`user/[id]/index.tsx`) → `{name}`
- „Einen Titel eingeben, bitte.“ → „Gib einen Titel ein.“ (vorhandener Schlüssel)
- „Vorher-Nachher, Timer …“ (`manage.tsx`) und Ersatztitel in `store.tsx` → „Me-Challenge …“
- Zwei Rechtstexte mit „Nutzerinnen und Nutzer(n)“ → „Nutzer:innen“ (`legal.ts`, `impressum.html`, `nutzungsbedingungen.html`)

## Offen, braucht Darias Entscheidung

- Icons mit zwei Bedeutungen: `send` (Teilen und Senden), `friends` (Freundschaften und Einladung teilen), `behausung` (Gruppen und „Was Du so machst“), `camera` (Erstellen und Foto-Platzhalter in `manage.tsx`).
- Gruppen-Texte sagen „Aufgabe“, die Regel vom 24.10.2026 sagt „We-Challenge“ (`gruppen/[id]/index.tsx`, `feed.tsx`, `GroupTaskForm.tsx`, `GroupBar.tsx`, `tour.ts`). Übersetzungen müssen mit.
- „noch mal“, „noch einmal“, „nochmal“: eine Form wählen.
- „Lass uns …“ (`friendInvites.ts`) und „Mach’s gut“ (`account/delete/success.tsx`): Redewendung behalten oder ausschreiben.
- „Nur Geduld, my friend!“ (`challenge/[id]/payment/index.tsx`): nur die er-Fassung ist deutsch („mein Freund“).
- Routen: `challenge/[id]/flag` und `user/[id]/report` melden Verstöße, `challenge/[id]/report` meldet die Erledigung; `pay` und `payment`; `settings/` neben `account/`; deutsche und englische Ordnernamen gemischt.
- Weitere Look-Suffixe `Flat` und `Mono` (`TabBar.tsx`, Kater-Sprechblase).

## Fehler im Werkzeug, nicht behoben

- `node scripts/i18n.mjs --prune` löscht auch genutzte Übersetzungen, da `scripts/text-keys.mjs` `src/data/kater-sprueche.json` und einzelne Wörter wie „Mitglied“, „er“, „sie“ nicht erfasst. Nicht ausführen, bis `collectKeys()` diese Quellen kennt.
- `AGENTS.md` verlangt `npx expo lint`, die Repo hat keine ESLint-Konfiguration.
