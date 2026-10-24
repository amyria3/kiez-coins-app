# Darias Textkorrektur auf Papier ist eingetragen

Datum: 2026-10-24
Status: erledigt, muss in die Doku
Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Texte“ (Regeln unten); Textliste in `kiez-coins/app/`, sofern sie die alten Texte führt.

## Was eingetragen ist

Daria hat den Ausdruck vom 23.10.2026 korrigiert (Abschnitte S, F, E, D, V und G bis G-014). Claude hat jede Korrektur an allen Stellen im Code eingetragen, an denen derselbe oder fast derselbe Text steht, und die Übersetzungen (en, fr, uk, he, ar) nachgezogen. `Übergabe/2026-10-23_offen_texte-druck-nummern.json` zeigt bei den Nummern die neuen Texte.

## Regeln, die Daria dabei festgelegt hat

- Imperative stehen ausgeschrieben: „Füge“, „Tippe“, „Schaue“, „Wähle“, „Zeige“, „Lege“, „Prüfe“, „Versuche“, „Schreibe“, „Komme“. Verben mit Vokalwechsel bleiben kurz: „Gib“, „Nimm“, „Hilf“, „Sei“. Der Kater spricht in der Ich-Form weiter umgangssprachlich („hab ich“, „Ich sag Dir Bescheid“).
- Bei Wiederholungen nutzt die App denselben Text: Der Code-Hinweis auf `onboarding/email` lautet wie auf `onboarding/code` („Der Code ist unterwegs! Schaue in Dein Postfach.“, „Gesendet an {email}. Gilt 5 Minuten.“).
- Der Code zum Beitreten einer Gruppe heißt „Beitrittscode“ (Button „Mit Beitrittscode beitreten“, Feld „Beitrittscode“).
- Der Abschließen-Dialog nennt in Gruppen „Deine Gruppenmitglieder“, sonst „Deine Nachbar:innen“.
- Der eigene Coin-Betrag nennt den Fehler: „Dieser Betrag ist größer als erlaubt.“ oder „Dieser Betrag enthält unerlaubte Zeichen.“
- S-038 („Ohne Freigabe finde ich Deinen Kiez nicht …“) ist gestrichen. Ohne Freigabe zeigt `onboarding/kiez` nur das Eingabefeld.

## Nicht eingetragen

- S-022 („Willkommen zurück an Bord!“) und S-033 („Wird angelegt …“) stehen seit der neuen Anmeldung („Anheuern“) nicht mehr im Code.

## Lesarten, die Daria prüfen sollte

- S-023 behält „Flaschenpost-Adresse“, so wie Daria es stehen gelassen hat.
- S-078: „Alles.“ ist entfallen, da der Satz „… würde ich alles tun“ gestrichen ist.
- F-001: „Tippe einmal, um den Namen anzuzeigen, oder zweimal oder lange, um den Post zu öffnen.“ (Langes Drücken öffnet den Post ebenfalls.)
- D-035: „… Fotografiere am Ende das Ergebnis, und wir warten. Wenn {name} bestätigt, aktualisiert sich der Status automatisch. Du bekommst eine Nachricht.“
- E-036: Darias Komma in „größer, als erlaubt“ ist entfallen.
