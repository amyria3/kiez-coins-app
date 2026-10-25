Pflichtaufgabe: Nach dem Merge `node scripts/app-texts.mjs > /tmp/app-texts.sql` ausführen und das SQL im Supabase-SQL-Editor einspielen, da einige Texte neue Schlüssel haben (Liste unten).

# Konsistenzprüfung des Codes

- Datum: 2026-10-25
- Status: offen (Branch `konsistenz-2026-10-25`, nicht gemergt; Daria merged selbst)
- Gehört in Documentation: `kiez-coins/app/Arbeitsstand_Code.md` (Abschnitt Konsistenz), Textregeln nach `kiez-coins/ENTSCHEIDUNGEN.md`
- Bericht mit allen Befunden: Claude Doc „KiezCoins: Konsistenzprüfung des Codes“ (https://claude.ai/artifact/3CZNQXf759uEbSbr9csXf1)

## Auf dem Branch erledigt

- Migration `20261022000500_messages.sql` heißt `20261022000600_messages.sql`, da die Nummer doppelt war. Im Supabase-Projekt ändert sich nichts.
- Stilnamen für den Fashionable Look enden auf `Fashionable` (vorher `Insta`).
- `MIN_PASSWORD` steht einmal in `src/data/auth.tsx`.
- `@fortawesome/free-solid-svg-icons` entfernt (nirgends importiert).
- `errorText()` zeigt „Diesen Decknamen gibt es schon“ nur bei `profiles_handle_unique`. Ein doppelter Like gilt als erledigt.
- Entwicklertexte in `remote.ts` (`purgeChallenge`, `saveSurveyAnswer`) durch vorhandene, übersetzte Sätze ersetzt.
- `vorher-nachher/[id].tsx` formatiert Uhrzeit und Wochentag mit `localeTag()` (App-Sprache).
- Drei Übergabe-Notizen auf den Stand vom 25.10.2026 gebracht (Funktionen-Sperre, Gruppen-Titelbild, Badge „Me-Challenge“).

## Texte mit neuem Schlüssel

Die Übersetzungen in `src/i18n` sind mitgezogen. Eigene Fassungen in `app_texts` (Spalte `text`) zum alten Schlüssel greifen nicht mehr und müssen bei Bedarf neu eingetragen werden:

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
