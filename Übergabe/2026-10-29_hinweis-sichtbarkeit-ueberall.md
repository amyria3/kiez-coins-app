# Hinweis „Wer sieht, was Du postest“ überall unter dem Umschalter

Datum: 2026-10-29 · Status: umgesetzt, PR #123 gemergt (30.10.2026); noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/design/UX_UI_Regeln.md` (Hinweis unter dem Umschalter)

## Entscheidung von Daria (29.10.2026)

Der Hinweis unter dem Umschalter Privat / Gruppe / Kiez / Überall erscheint einheitlich.

## Umsetzung

- Feed (`src/app/feed.tsx`): jetzt auch im Reiter „Gruppe“ ohne Gruppe.
- „Was Du so machst“ (`src/app/reise.tsx`) und Profil im Fashionable-Look (`src/components/FashionProfile.tsx`): derselbe Hinweis unter dem Umschalter.
- Das Kreuz blendet den Hinweis je Reiter dauerhaft auf diesem Gerät aus, für Feed und „Was Du so machst“ gemeinsam (`AudienceHint`).

## Außerdem in PR #123 (Daria, 29./30.10.2026)

- „Was Du so machst“, Reiter Gruppe: Knopf „Feed ansehen“ statt „Aufgaben ansehen“.
- Dein Konto: oben „Me“ (bisher „Was Du so machst“), „Meine Challenges“ (bisher „Deine Challenges“), „Meine Features“ (bisher „Deine Funktionen“), danach Gruppen, Freundschaften, Sprache usw. wie bisher. Die Seiten selbst heißen noch wie vorher; die anderen Einträge heißen weiter „Deine …“.
- Ziele (`src/components/Quests.tsx`): Im Web erschien der Deckel als kleines zweites Geschenk, weil er keine eigene Größe hatte; behoben. Geschlossene Geschenke wackeln ab und zu, kräftiger je näher das Ziel, ohne Fortschritt ruhig, versetzt, nicht bei reduzierter Bewegung. Offenes Geschenk grün (Bestätigung), aufsteigende Herzen pink als normales Herz statt Doppelherz.
