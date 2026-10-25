# Website kiezcoins.de zeigt Me-Challenge, We-Challenge, Kiez und Gruppe

Datum: 2026-10-25
Status: erledigt, muss in die Doku
Ergebnis gehört nach Documentation: `kiez-coins/app/Stand_App.md`, Abschnitt „Website kiezcoins.de“

## Entscheidung (Daria, 25.10.2026)

- Der Prototyp auf der Startseite stellt die Hauptfunktionen dar: Me-Challenge, We-Challenge sowie Kiez und Gruppe.
- Der Schalter über den Szenarien heißt „Kiez | Gruppe Luxor“ (vorher „Öffentlich | Familie / Gruppe“).
- Der Startzustand erklärt die Me-Challenge.

## Umsetzung

- Szenarien im Kiez: Me-Challenge (Start), We-Challenge. In der Gruppe Luxor zusätzlich Rangliste.
- Me-Challenge im Telefon wie in der App: Vorher-Foto mit Titel, „Vorher speichern“, Timer (im Prototyp Zeitraffer, 1 s = 10 min, von 48 h), „Nachher aufnehmen“, „Me-Challenge posten“. Danach sagt der Kater „1 gute Tat für den Kiez!“. Keine Coins, keine Coin-Animation (kommt später, siehe `2026-10-24_offen_coin-animation-me-challenge.md`).
- Vorher-Nachher-Karte im Feed wie `BeforeAfterPost`: Vorher 1/3, Nachher 2/3, Tipp vergrößert eine Hälfte auf 5/6, Karte wächst um 25 %, Dauer an der Naht.
- Ein laufender Timer steht oben im Feed („Du hast Dich selbst herausgefordert“) und führt zurück zum Timer.
- Das Erstellen-Blatt hat oben die Wahl Me-Challenge / We-Challenge. Die Kamera öffnet die Me-Challenge.
- We-Challenge: Annehmen, erledigt melden, Bestätigung mit Coins (Kiez) bzw. Edensteinen (Gruppe). „Virtuelle Belohnung“ heißt jetzt überall „Edensteine“.
- Gruppe Luxor ersetzt Familie Berger und ist eine Hausgemeinschaft: Mitglieder Jule, Tom, Ben, Ayla, Du; Aufgaben Einkauf für Gisela (nach Hüft-OP), Fahrradkeller entrümpeln, Wäscheleine im Hof spannen (Erstellen-Beispiel).
- Beispiele mit Substanz (Daria, 25.10.2026): Jede Beispiel-Challenge nennt einen echten Bedarf, einen Grund oder eine Frist. Hausarbeit mit selbsterklärenden Anweisungen (Spülmaschine ausräumen, Wäsche aufhängen) fliegt raus.
- Auf dem Handy steht unter der Szenario-Leiste der Satz zum gewählten Szenario.
- Fotos: Me-Beispiel Lena „Müll im Auwald gesammelt“ (muell → igel), eigene Me-Challenge „Gemeinschaftsgarten pflegen“ (rasen → garten). Keine neuen Fotos.

## Betroffene Dateien

- `scripts/site/prototyp.js` (Quelle des Prototyps), `scripts/site/seite.css`, `scripts/build-download-site.mjs` (Schalter und Szenario-Knöpfe)
- `website/` neu gebaut mit `node scripts/build-download-site.mjs`; Vercel baut bei jedem Push ohnehin neu.

## Offene Fragen an Daria

- Ist „Luxor“ eine echte Gruppe? Dann Namen der Mitglieder und Beispielaufgaben anpassen.
- Der Einleitungssatz unter der Überschrift ist unverändert („zu Hause oder im Kiez“).
