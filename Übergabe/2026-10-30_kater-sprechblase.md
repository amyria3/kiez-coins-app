# Kater-Sprechblase im Kiez-Look: Kater im Kreis auf der Blase

Datum: 2026-10-30 · Status: umgesetzt (PR, siehe Commit); noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/design/Designsystem.md` (Kater), `kiez-coins/design/UX_UI_Regeln.md`

## Entscheidung von Daria (30.10.2026)

Wenn der Kater etwas sagt, gibt es drei Formen:

1. Kleiner Kater neben Text: das Icon „cat“ in einer runden Pille, ohne eckige Kachel. Im Kiez-Look sitzt der Kreis auf der Blase. Der Fashionable-Look bleibt wie bisher (Blase mit Spitze, Kachel daneben).
2. Großer Katzenkopf mit Titel und Text (leere Reiter, Erfolgsseiten, Tour).
3. Animationen (Start, Begrüßung, „Hallo sagen“, Herz in der Tour) bleiben.

## Umsetzung

- `src/components/Content.tsx`, `KaterCard` (auch `KaterBubble`): Kiez-Look mit Text links und `KaterRund` rechts in der Blase. Kreis 64 pt im Grund der Seite, Icon „cat“ (`iconSvgs.cat`) 44 pt in Textfarbe, unten 7 pt angeschnitten. Gläser, Nase und Mund sind ausgespart, dort scheint der Kreis durch. Keine Spitze mehr.
- Im Kiez-Look zeigt die Sprechblase keine Stimmungen mehr (`mood`: aufgeregt, Dollar), das Icon hat nur ein Gesicht. Betroffen: Stimmung in „Was Du so machst“, Dank am Ende der Tour. Im Fashionable-Look bleibt `mood`.
- Gilt für alle gut 30 Sprechblasen (Konto, Onboarding, Erledigung prüfen, Zahlungsdaten, Gruppen leer, Chats leer …).

## Offene Punkte

- Update- und Installationshinweis (`UpdateHint.tsx`, `InstallHint.tsx`): kleiner farbiger Kater ohne Blase in einer Hinweiskarte. Form 1 würde passen, Entscheidung offen.
- Platzhalter ohne Sprechen bleiben: Kater in der Fotowand von „Was Du so machst“, Kater als Profilbild im Fashionable-Profil.
- Fashionable-Profil: Denkblase über dem Profilbild („Eine Deiner Challenges ist …“), eigenes Layout, unverändert.
