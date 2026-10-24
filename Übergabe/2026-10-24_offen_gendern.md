# Konsistentes Gendern

Datum: 2026-10-24
Status: offen
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
- Sternchen: „Nachbar*innen“ in der Begrüßung (S-078, `src/app/onboarding/welcome.tsx`) und in Nutzerdaten der Demo („Nachbarschaftsgärtner*innen“).
- Paarform in den Rechtstexten (`src/data/legal.ts`): „Nutzerinnen und Nutzer“, „Kontoinhaberin oder Kontoinhaber“.

## Vorschlag

1. **Eine Schreibweise festlegen** für Gruppen von Menschen, zum Beispiel den Doppelpunkt, da ihn die App schon am häufigsten nutzt. Rechtstexte können bei der Paarform bleiben.
2. **Texte über andere Personen neutral fassen.** So braucht die App kein Geschlecht anderer Personen zu kennen. Beispiele:
   - „… wenn Du die Challenge erledigt hast und {name} sie bestätigt hat.“
   - „Gründerin“ → „Gründet die Gruppe“ oder „Gründung“.
3. **Anrede über die vorhandene Ansprache steuern.** Aus `addressForm` ergibt sich die Form für Texte an Dich: Pirat → „mein Freund“, Piratin → „meine Freundin“, Pirat:in, The Pirat und eigene Bezeichnung → neutrale Form (zum Beispiel „{anrede}“ selbst: „Nur Geduld, {anrede}!“).

## Offene Fragen an Daria

- Welche Schreibweise gilt für Gruppen von Menschen: Doppelpunkt, Sternchen oder Mittelpunkt?
- Reicht die Ansprache als Quelle für das Geschlecht, oder braucht das Profil ein eigenes Feld (zum Beispiel Pronomen, auch öffentlich für andere)?
- Sollen die Übersetzungen ebenfalls neutral oder nach Ansprache gegendert werden?
