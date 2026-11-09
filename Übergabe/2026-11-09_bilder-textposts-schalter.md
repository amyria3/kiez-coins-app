# Bilder und Textposts je Feed schaltbar

Datum: 09.11.2026 · Status: erledigt (PR #230) · Gehört in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Modi und Funktionen“, und die Beschreibung von Dein Konto › Funktionen.

- Dein Konto › Funktionen hat unten die Gruppe „Bilder und Textposts“ mit zwei Schaltern: „Bilder und Textposts im Kiez-Feed anzeigen“ und „Bilder und Textposts überall anzeigen“ (Daria, 09.11.2026).
- Standard: an. Ein Schalter ist ausgegraut und nicht bedienbar, solange sein Modus (Dein Kiez bzw. Überall) verborgen ist.
- Ausgeblendet werden Posts vom Typ `photo` (mit Foto oder nur Text). Challenges bleiben immer, eigene Posts auch.
- Gespeichert auf dem Gerät, pro Konto (`postsHidden` in `src/data/features.ts`).
- Ersetzt die Seite Einstellungen › Feed vom 08.11.2026 (Bilder und Textposts getrennt, für beide Feeds zusammen). Wer dort beides aus hatte, hat es jetzt in beiden Feeds aus.
- Der Standard-Umschalter steht jetzt ganz oben, über den Modi, auch im Onboarding (Daria, 09.11.2026).
