# Hinweis „Wer sieht, was Du postest“ überall unter dem Umschalter

Datum: 2026-10-29 · Status: umgesetzt, PR #123 gemergt (30.10.2026); noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/design/UX_UI_Regeln.md` (Hinweis unter dem Umschalter)

## Entscheidung von Daria (29.10.2026)

Der Hinweis unter dem Umschalter Privat / Gruppe / Kiez / Überall erscheint einheitlich.

## Umsetzung

- Feed (`src/app/feed.tsx`): jetzt auch im Reiter „Gruppe“ ohne Gruppe.
- „Was Du so machst“ (`src/app/reise.tsx`) und Profil im Fashionable-Look (`src/components/FashionProfile.tsx`): derselbe Hinweis unter dem Umschalter.
- Sichtbar in den ersten fünf Sitzungen, danach dauerhaft weg (Daria, 30.10.2026). Das Kreuz blendet den Hinweis je Reiter nur für die laufende Sitzung aus. Eine Sitzung beginnt mit dem Start der App (im Browser: Laden der Seite) oder wenn die App nach mindestens 30 Minuten im Hintergrund wieder nach vorn kommt. Zähler pro Gerät: `kiez-hinweis-sitzungen` (`AudienceHint.tsx`). Die alten Schlüssel `kiez-hinweis-sichtbarkeit-*` gelten nicht mehr; wer den Hinweis früher geschlossen hat, sieht ihn wieder fünf Sitzungen lang.

## Außerdem in PR #123 (Daria, 29./30.10.2026)

- „Was Du so machst“, Reiter Gruppe: Knopf „Feed ansehen“ statt „Aufgaben ansehen“.
- Dein Konto: oben „Me“ (bisher „Was Du so machst“), „Meine Challenges“ (bisher „Deine Challenges“), „Meine Features“ (bisher „Deine Funktionen“), danach Gruppen, Freundschaften, Sprache usw. wie bisher. Die Seiten selbst heißen noch wie vorher; die anderen Einträge heißen weiter „Deine …“.
- Ziele (`src/components/Quests.tsx`): Im Web erschien der Deckel als kleines zweites Geschenk, weil er keine eigene Größe hatte; behoben. Geschlossene Geschenke wackeln ab und zu, kräftiger je näher das Ziel, ohne Fortschritt ruhig, versetzt, nicht bei reduzierter Bewegung. Offenes Geschenk grün (Bestätigung), aufsteigende Herzen pink als normales Herz statt Doppelherz.
