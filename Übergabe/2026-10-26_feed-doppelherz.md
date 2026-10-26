# Feed-Icon Doppelherz und Herz-Animation nach dem Posten

Datum: 2026-10-26 · Status: Entscheidung, noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/design/Icon_Regelwerk.md` (Kiez-Look, Leiste) und `kiez-coins/ENTSCHEIDUNGEN.md`

- Daria hat das Doppelherz (`assets/icons/feed.svg`, IconName `feed`) als Feed-Icon im Kiez-Look festgelegt. Es ersetzt die Stecknadel in der Leiste. Die Stecknadel bedeutet jetzt nur noch „Ort“.
- Fashionable Look: Feed bleibt das Haus (Phosphor), bis Daria etwas anderes sagt.
- Nach jedem erfolgreichen Posten (We-Challenge, Bild, Gruppenaufgabe, Me-Challenge) springt das Doppelherz in Herzfarbe (`color.accent.affection`) in die Mitte, kleine Herzen steigen auf (`src/components/HeartBurst.tsx`, Aufruf `celebratePost()`). Mit „Bewegung reduzieren“ blendet es nur ein und aus.
- Der Prototyp auf der Website zeigt dasselbe (`scripts/site/prototyp.js`, `heartBurst()`).
