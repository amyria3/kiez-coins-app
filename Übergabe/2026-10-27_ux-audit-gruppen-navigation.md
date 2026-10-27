# UX-Audit: Gruppenauswahl, „Was Du so machst“ und Navigation

Datum: 2026-10-27 · Status: Entscheidung, umgesetzt, noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitte „Gruppen“ und „Navigation“), `kiez-coins/design/UX_UI_Regeln.md` (Eingabefelder), `kiez-coins/design/Icon_Regelwerk.md` (Leiste ohne Krone)

## Entscheidungen von Daria (UX-Audit, 27.10.2026)

- „Was Du so machst“ hat denselben Umschalter „Im Kiez / In Gruppen“ wie der Feed. Im Kiez stehen Bilanz und Verlauf, in Gruppen die Gruppenauswahl, Dein Platz in der Rangliste und der Verlauf der gewählten Gruppe. „Du bist dran“ steht über dem Umschalter.
- Die Rangliste steht in „Was Du so machst“ unter „In Gruppen“ und nicht mehr auf der Gruppenseite (Zahnrad). Die Gruppenseite zeigt nur die Mitglieder nach Beitritt. Der Schalter „Rangliste anzeigen“ bleibt dort. Rangliste aus: Jede Person sieht nur ihre eigenen Edensteine.
- Unter dem Umschalter steht die gewählte Gruppe. Ein Tipp auf den Namen öffnet das Auswahlmenü mit allen Gruppen, als letzter Eintrag „Neue Gruppe erstellen“. Edensteine und Anzahl der Mitglieder stehen hier nicht. Das Zahnrad steht links vom Namen und führt zur Gruppenseite, der Pfeil für das Menü steht ganz rechts. Die Chips und „Alle“ sind raus.
- Unter dem Umschalter im Feed steht ein Hinweis ohne Icon, wer sieht, was Du postest: „Was Du hier postest, sehen alle Nutzer:innen in Deinem Kiez.“ bzw. „Was Du hier postest, sehen nur die Mitglieder in dieser Gruppe.“ Das Kreuz blendet ihn je Reiter dauerhaft aus (AsyncStorage `kiez-hinweis-sichtbarkeit-kiez` und `-groups`).
- Die Krone in der Leiste ist raus. „Was Du so machst“ öffnet das Logo oben im Feed, dort sitzt auch der Punkt „Du bist dran“.
- Freundschaften: Unter „Einladung annehmen“ steht gleich das Eingabefeld für den Einladungscode mit „Annehmen“. Die Seite `freunde/einladen` bleibt für Links und QR-Codes.
- Aktive Eingabefelder haben einen Rand von 2 pt (Token `stroke.focus`), sonst 1 pt.

## Betroffene Dateien

`src/app/reise.tsx`, `src/components/GroupBar.tsx`, `src/components/GroupRanking.tsx`, `src/components/AudienceHint.tsx`, `src/app/feed.tsx`, `src/app/gruppen/[id]/index.tsx`, `src/components/TabBar.tsx`, `src/app/account/freunde.tsx`, `src/components/Form.tsx`, `src/components/compose/BeforeAfterForm.tsx`, `src/theme/tokens.ts`, Übersetzungen in `src/i18n/*.json`.

## Offene Punkte

- Der Look „Fashionable“ hat in „Was Du so machst“ eine eigene Profilansicht (`src/components/FashionProfile.tsx`) ohne Umschalter. Gruppenauswahl, Hinweis und Leiste gelten dort schon; Umschalter und Rangliste fehlen dort noch.
