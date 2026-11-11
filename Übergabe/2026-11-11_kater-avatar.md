# Kater-Avatar auf gelbem Kreis (2026-11-11)

Notiz für die Doku.

- Daria hat einen neuen Kater-Avatar geschickt: lila Kater mit grünen Herzen in der Brille auf gelbem Kreis. Die Datei liegt in `assets/kater/kater-avatar.svg`.
- `KaterRund` in `src/components/Content.tsx` zeigt jetzt diesen Avatar statt des lila Katers auf schwarzem Kreis. Der Kater fährt weiterhin beim Erscheinen von unten herein (nicht bei „Bewegung reduzieren“). Die Herzen sind fest im Bild, sie blitzen nicht mehr.
- Der gelbe Kreis pulsiert langsam zwischen voll und durchscheinend (35 %), damit der Grund darunter durchscheint. Mit „Bewegung reduzieren“ bleibt er voll.
- Betroffen sind alle Stellen mit dem Kater im Kreis im Kiez-Look: Kater-Nachrichten im Chat-Stil, Kater-Karten und der große Kater auf den Abschluss-Screens. Der Fashionable-Look bleibt unverändert.
- Ersetzt die Notiz `2026-11-02_kater-rund.md` in Farbe und Herzen.

## Eine Komponente für den sprechenden Kater (2026-11-11, später)

- Es gab drei Fassungen, wenn der Kater spricht: `KaterCard` (graue Karte, Kater rechts), `KaterBubble` (nur ein anderer Name dafür) und `KaterNachricht` (lila helle Sprechblase, Kater links unten). Dazu die ungenutzte `SpeechBubble`.
- Jetzt gibt es nur noch `KaterCard` in `src/components/Content.tsx`. Im Kiez-Look ist sie die lila helle Sprechblase mit dem Kater im Kreis links unten, optional mit Überschrift, Tipp (`onPress`) und Kreuz (`onClose`). Der Fashionable-Look bleibt bei Blase plus Kater-Kachel.
- `KaterBubble`, `KaterNachricht` und `SpeechBubble` sind entfernt.
- Update-Hinweis, Installier-Hinweis und die Feedback-Seite der Tour zeigen im Kiez-Look den Kater im Kreis statt des alten Linien-Katers.
- Bleibt bewusst: `KaterMessage` (großer Kater mittig auf leeren und Abschluss-Screens), die Krabbe für Erklärungen (`Explanation`, `Notice`), der große Kater beim Start (`KaterStage`) und der Linien-Kater als Platzhalter in Kacheln ohne Foto.
