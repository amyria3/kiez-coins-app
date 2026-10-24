# Konsistentes Gendern

Datum: 2026-10-24
Status: teilweise umgesetzt (24.10.2026), Rest offen
Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, neuer Abschnitt „Gendern“; das Feature nach `kiez-coins/konzept/`.

Daria will konsistentes Gendern als Feature. Claude hat alle Texte im Code (Stand `main`, 24.10.2026) nach grammatischem Geschlecht durchsucht. Es gibt drei Arten von Stellen.

## Die App spricht Dich an

Der Kater richtet sich an die Person, die die App benutzt. Ihre Ansprache steht schon im Profil (`profile.addressForm`: Pirat:in, Pirat, Piratin, The Pirat oder eigene Bezeichnung; Platzhalter `{anrede}`, `src/data/format.ts`).

- `src/app/challenge/[id]/payment/index.tsx` (D-082): „Nur Geduld, mein Freund!“ ist fest männlich.
- `src/app/onboarding/ansprache.tsx` (S-004): „Darling“ ist neutral, bleibt.
- Früher S-022 „Kamerad“: steht nicht mehr im Code, Daria hatte es auf Papier eingesetzt.

## Die App spricht über eine andere Person

Hier entscheidet das Geschlecht von `{name}`. Die App kennt es nicht. Sie unterscheidet nur Einzelpersonen und Konten von Gruppen (`user.group`, dann Plural: „{name} bestätigen“).

- `src/app/challenge/[id]/report/payout.tsx` (D-098, D-099): „… wenn Du die Challenge erledigt hast und **er** sie bestätigt hat“ gilt für jede Einzelperson, auch für Frauen. Die Variante mit „sie“ ist der Plural für Gruppen.
- `src/app/gruppen/[id]/index.tsx` (Gruppe, Mitgliederliste): „Gründerin“ steht bei jeder Person, die eine Gruppe gegründet hat.
- `src/app/gruppen/[id]/index.tsx`: „Tippe ein Mitglied an und übertrage **ihm** die Gründerrolle“ ist grammatisch richtig (das Mitglied), bleibt.
- Übersetzungen: Ukrainisch nutzt Klammerformen („взяв(ла)“, „міг(ла)“), Hebräisch und Arabisch sprechen durchgehend männlich an, Französisch nutzt den Mittelpunkt („voisin·es“).

## Gruppen von Menschen

Die Texte nutzen drei Schreibweisen nebeneinander:

- Doppelpunkt (die meisten): „Nachbar:innen“, „Freund:innen“, „Kontoinhaber:in“, „Empfänger:in“, „Pirat:in“, „Seebär:in“.
- Sternchen: „Nachbar*innen“ in der Begrüßung (S-078) und in den Demo-Daten. Seit 24.10.2026 mit Doppelpunkt.
- Paarform in den Rechtstexten (`src/data/legal.ts`): „Nutzerinnen und Nutzer“, „Kontoinhaberin oder Kontoinhaber“.

## Entscheidung (Daria, 24.10.2026)

- **Neue Auswahl im Profil: „er“, „sie“ oder „unbestimmt (Person)“.** Die App nutzt sie für Texte an die Person und für Texte über die Person. Andere sehen die Wahl nur indirekt über die Texte.
- **Anrede „Freund“:** er → „mein Freund“, sie → „my friend“, unbestimmt → „my friend“ (so von Daria festgelegt, das Englische ist neutral).
- **„Gründerin“ wird „Initiator:in“:** er → „Initiator“, sie → „Initiatorin“, unbestimmt → „Initiator:in“. Dazu passen „Initiator:innen-Rolle übertragen“ oder kürzer „Rolle übertragen“ in `src/app/gruppen/[id]/index.tsx` (Zeilen 62, 64, 85, 150, 172). „Gruppe gründen“ und „Du hast sie gegründet“ (`GroupCard.tsx`) bleiben, da das Verb kein Geschlecht hat.
- **Texte über andere Personen** wählen das Pronomen nach deren Auswahl: „… und er/sie sie bestätigt hat“, bei „unbestimmt“ mit Namen: „… und {name} sie bestätigt hat“ (D-098/D-099 in `report/payout.tsx`).

## Umsetzung

- Pflichtaufgabe: Migration. Neue Spalte `profiles.gender` (`'er' | 'sie' | 'person'`, Standard `'person'`). Andere Personen brauchen Lesezugriff, da Texte über sie das Pronomen brauchen (Spalte in die öffentliche Profilabfrage aufnehmen, `grant update (gender)` für die eigene Zeile).
- Onboarding: eigene Frage nach dem grammatischen Geschlecht, änderbar unter „Dein Konto“. Die Auswahl hat nichts mit der Ansprache (Pirat, Piratin …) zu tun und wird nicht aus ihr vorbelegt (Daria, 24.10.2026: Die Ansprache ist nur ein Zusatz, die Herausforderung ist die Grammatik).
- Code: Hilfsfunktion `byGender(user, { er, sie, person })` in `src/data/format.ts`, die ganze Sätze auswählt, damit Übersetzungen ganze Sätze bekommen (wie bei `user.group` heute).
- Übersetzungen: je Satz drei Fassungen. Ukrainisch, Hebräisch und Arabisch verlieren damit die Klammerformen und die feste männliche Form.

## Schreibweise für Gruppen von Menschen

Daria (24.10.2026): Die App nutzt durchgehend den Doppelpunkt („Nachbar:innen“). Rechtstexte bleiben bei der Paarform. Die Ansprache „Pirat*in“ gibt es schon nicht mehr, ältere Profile bekommen „Pirat:in“.

## Übersetzungen (Prüfung vom 24.10.2026)

Behoben: Die Gruppen-Fassung von D-098 („… und sie sie bestätigt hat“, Plural für Gruppen) war in allen Sprachen als weiblich übersetzt („she“, „elle“, „вона“ …). Sie steht jetzt im Plural.

Offen: In anderen Sprachen hängen auch Texte an **Dich** vom Geschlecht ab, im Deutschen nicht. Die Auswahl er/sie/unbestimmt muss deshalb auch diese Texte steuern.

- **Hebräisch und Arabisch:** Die ganze App spricht Dich männlich an (Imperative, Verben, Adjektive, z. B. „הראה“, „תשלם“, „أرِنا“). Für „sie“ braucht jeder Text an Dich eine weibliche Fassung, für „unbestimmt“ eine neutrale Lösung (im Hebräischen oft Plural oder Infinitiv).
- **Ukrainisch:** Klammerformen bei Dir und bei anderen: „сам(а)“, „один (одна)“, „міг(ла)“, „платив(ла)“, „порекомендував(ла)“, „заснував(-ла)“, „{name} … взяв(ла)“, „{firstName} не підтвердив(ла)“, Berufsbezeichnungen „Власник(ця) рахунку“, „Одержувач(ка)“. Anrede „друже“ ist männlich.
- **Französisch:** Mittelpunkt bei Dir: „averti·e“, „seul·e“, „encourageant·e et constructif·ve“, „l’ami·e“, „Demander en ami·e“. „Patience, mon ami !“ (D-082) ist fest männlich. Der Rollenname der Gruppe heißt „Fondatrice“ (wird Initiateur/Initiatrice/Initiateur·rice).
- **Englisch:** neutral, „my friend“ passt für alle drei.

Festgelegt (Claude auf Darias Bitte, 24.10.2026; Daria passt an, sobald sie eine Prüfung durch Muttersprachler:innen findet):

- **Anrede:** Englisch „my friend“ für alle drei. Französisch, Ukrainisch, Hebräisch und Arabisch nutzen für „er“ und „sie“ die eigene männliche und weibliche Form der Sprache, für „unbestimmt“ eine Anrede ohne Geschlecht oder gar keine. Nur Deutsch folgt Darias Sonderregel (sie → „my friend“).
- **Gruppen von Menschen:** die übliche Form der Sprache. Französisch Mittelpunkt („voisin·es“), Ukrainisch Paarform oder ein neutrales Wort („люди“, „учасники й учасниці“), Hebräisch und Arabisch Plural.
- **„unbestimmt“ bei Texten an Dich:** Hebräisch Infinitiv für Aufforderungen (in hebräischen Apps üblich, z. B. „להקיש“) und Plural, wo der Infinitiv nicht passt. Arabisch Verbalnomen („النقر على …“) und Passiv. Ukrainisch und Französisch Sätze ohne Partizip oder Adjektiv, die sich auf Dich beziehen.
- **Hebräisch und Arabisch kommen mit dem Feature,** da „sie“ sonst in diesen Sprachen nichts bewirkt.

## So entstehen die Übersetzungen ohne Daria

1. Claude schreibt die Fassungen je Sprache und Geschlecht.
2. Ein zweiter, unabhängiger Durchgang übersetzt jede Fassung zurück ins Deutsche und vergleicht mit dem Original. Abweichungen und unsichere Texte kommen in eine Liste `scripts/.i18n-pruefen.json`.
3. Die Fassungen gehen als Übersetzung in die App, mit dem Hinweis „Übersetzung zur Orientierung“ wie heute.
4. Später prüfen Muttersprachler:innen im Texte-Editor (Spalten je Sprache in `app_texts`), zum Beispiel Testpersonen aus der Testphase. Die Liste aus Schritt 2 zeigt, wo sie zuerst schauen.

## Laden der Übersetzungen nach Sprache und Geschlecht (Daria, 24.10.2026)

Daria will die gegenderten Übersetzungen erst laden, wenn die Person Sprache oder Auswahl wechselt. Maschinelle Übersetzung löst das Gendern nicht, Claude schreibt die Fassungen, Muttersprachler:innen prüfen.

- Heute bündelt `src/data/texts.ts` alle fünf Sprachdateien fest in die App (`import en from '../i18n/en.json'` …), je rund 100 KB.
- Vorschlag: Je Sprache eine Grunddatei (Fassung „unbestimmt“) und je Geschlecht eine Ergänzungsdatei nur mit den abweichenden Texten, z. B. `src/i18n/he.json`, `src/i18n/he.er.json`, `src/i18n/he.sie.json`. Für Deutsch, Englisch und Französisch bleiben die Ergänzungen klein, für Hebräisch und Arabisch betreffen sie fast jeden Text an Dich.
- `t()` sucht zuerst in der Ergänzung, dann in der Grunddatei, dann im deutschen Original.
- Web: Die App lädt die Dateien erst beim Wechsel (`import()` oder Abruf vom Server) und legt sie wie `app_texts` im Speicher ab (`AsyncStorage`). Native App: Die Dateien liegen im Paket, die App liest nur die gewählten ein.
- Alternativ: Spalten je Geschlecht in der Tabelle `app_texts` (z. B. `he_sie`), dann kann Daria die Fassungen auch im Texte-Editor pflegen.

## Stand der Umsetzung (24.10.2026, Claude auf Darias Bitte)

Umgesetzt und gepusht:

- Pflichtaufgabe: Migration `supabase/migrations/20261024000100_gender.sql` im SQL-Editor ausführen (Spalte `profiles.gender`, Standard `person`). Ohne die Migration läuft die App weiter: Sie merkt sich die Wahl auf dem Gerät, andere sehen „unbestimmt“.
- Auswahl „er“, „sie“, „unbestimmt (Person)“ auf `onboarding/ansprache` (eigener Block, `src/components/GenderChoice.tsx`) und unter Dein Konto › Grammatisches Geschlecht (`src/app/account/geschlecht.tsx`).
- Textlogik in `src/data/texts.ts`: `t()` nutzt das eigene Geschlecht, `tAbout(person, …)` das Geschlecht der Person, über die der Text spricht. Ergänzungen in `src/i18n/<sprache>.<er|sie|person>.json`, eingebunden über `src/i18n/gender.ts`.
- Deutsch: „Initiator“, „Initiatorin“, „Initiator:in“; „Rolle übertragen“; „Nur Geduld, mein Freund!“ (er) und „my friend“ (sie, unbestimmt); D-098 mit „er“, „sie“ oder Namen.
- Texte über andere laufen über `tAbout` (Zahlungsdaten, bezahlt markiert, nicht bestätigt, Freundschaft, Blockieren, Rolle übertragen …).
- Französisch und Ukrainisch: alle Mittelpunkt- und Klammerformen bei Dir und bei anderen haben Fassungen für „er“ und „sie“. Die Grundfassung mit Mittelpunkt und Klammern gilt für „unbestimmt“.
- Hebräisch und Arabisch: Fassungen für „sie“ und „unbestimmt“ für das ganze Onboarding, alle Texte über andere und alle neuen Texte. Neutral heißt: Infinitiv oder unpersönlicher Satz (he), Verbalnomen oder Passiv (ar).
- Demo-Daten: Peter ist „er“, Lena ist „sie“.

Offen:

- Hebräisch und Arabisch außerhalb des Onboardings: Die übrigen Texte an Dich sprechen noch männlich an (Grundfassung). Nächste Pakete: Feed und Challenge erstellen, dann Challenge-Detail, dann Konto.
- Prüfung: `Übergabe/2026-10-24_offen_gender-uebersetzungen-pruefen.json` listet alle neuen Fassungen. Muttersprachler:innen prüfen sie.
- Laden erst beim Wechsel: Die Ergänzungen liegen vorerst im Paket (zusammen rund 30 KB). Nachladen lohnt sich, sobald Hebräisch und Arabisch vollständig sind.
- Texte-Editor: Die Ergänzungen nach Geschlecht lassen sich dort noch nicht pflegen (dafür Spalten wie `he_sie` in `app_texts`).
- Seiten, die Personen per Rolle zeigen, außer der Gruppe (z. B. Moderation), nutzen noch kein Geschlecht.
