# Modi Privat, Gruppe, Kiez

Datum: 2026-10-27 · Status: Entscheidung, umgesetzt (PR #93), Migration am 27.10.2026 eingespielt, noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitte „Challenges“ und „Funktionen“), `kiez-coins/app/Offene_Punkte.md` (offene Punkte unten)

Ersetzt `2026-10-26_offen_sichtbarkeit-nur-ich.md` und `2026-10-26_offen_kiez-ausschalten.md`.

## Entscheidungen von Daria (27.10.2026)

- „Wir brauchen ein ‚Nur Ich‘ Modus.“ Der Modus heißt in der App „Privat“. Was Du dort postest, siehst nur Du. Privat gibt es Me-Challenges und Bilder, keine We-Challenges (die brauchen andere, die sie annehmen) und keine Coins.
- Reihenfolge überall: Privat, Gruppe, Kiez. Das gilt für den Umschalter im Feed, beim Erstellen und in „Was Du so machst“. Die Reiter heißen „Privat“, „Gruppe“ und „Kiez“.
- We-Challenge, Me-Challenge und Bild lassen sich nicht mehr abschalten. Die alten Schalter in „Dein Konto › Funktionen“ sind raus.
- Stattdessen lassen sich die Modi Privat, Gruppe und Kiez mit dem Auge verbergen. Einer bleibt immer sichtbar. Ist nur einer sichtbar, gibt es keinen Umschalter.
- Ein Modus ist der Standard. Er ist im Umschalter oben vorausgewählt, und neue Beiträge landen dort. Einstellung in „Dein Konto › Funktionen“ und im Onboarding (Schritt „Funktionen“).
- Links für Zielgruppen: `https://kiezcoins.vercel.app/app/?modus=privat` (oder `gruppe`, `kiez`). Der Link setzt seinen Modus als Standard und verbirgt die beiden anderen (Daria, Entscheidungskarte 27.10.2026). Über das Auge kommen sie zurück. Vor der Anmeldung merkt sich das Gerät den Modus und wendet ihn danach an.
- Start für neue Konten wie bisher: Privat und Kiez sichtbar, Gruppe verborgen bis zur ersten Gruppe, Standard Kiez.

## Umsetzung

- Datenbank: Migration `supabase/migrations/20261028000100_challenge_visibility_private.sql`. Spalte `challenges.visibility` (`public` oder `private`), Check: privat nur ohne Gruppe, nur `photo` oder `before_after`, ohne Coins. Policy „Challenges lesen“: private Beiträge nur für die Ersteller:in. `grant update (visibility)`, damit ein Vorher-Nachher-Entwurf nach `start_before_after` privat wird.
- App: `src/data/features.ts` (`Mode`, `MODES`, `useModes`, `setModeHidden`, `setStandardMode`, `rememberLinkMode`; AsyncStorage `kiez-features:<userId>` mit `hidden` und `standard`, alter Schlüssel `groups` gilt weiter), `src/components/FeatureSwitches.tsx` (Auge und Standard), `src/app/feed.tsx`, `src/components/FeedHeader.tsx` (`TAB_OF_MODE`), `src/components/compose/ComposeSheet.tsx`, `src/app/reise.tsx`, `src/app/index.tsx` (Link), `src/components/AudienceHint.tsx` (Hinweis „Was Du hier postest, siehst nur Du.“), Erstellen-Flow (`challenge/create`, Parameter `privat=1`), `src/data/remote.ts`, Icon `eye-off`.

## Offene Punkte

- Migration `20261028000100` ist im Supabase-Projekt „Kiez Coins Data“ eingespielt (27.10.2026, per MCP).
- Sichtbarkeit nachträglich ändern (z. B. Privat → Kiez) gibt es noch nicht.
- Onboarding fragt weiter nach dem Kiez, auch wenn jemand nur Privat nutzt.
- Fashionable Look: Die eigene Profilansicht (`FashionProfile.tsx`) hat noch keinen Umschalter.
- Die Wahl liegt auf dem Gerät. Soll sie geräteübergreifend gelten, gehört sie ins Profil (Migration).
