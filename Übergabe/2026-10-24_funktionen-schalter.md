# Funktionen an- und abschalten

Datum: 2026-10-24 · Status: erledigt, muss in die Doku · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“, und `kiez-coins/design/Icon_Regelwerk.md` (neues Icon)

## Entscheidung

- Jede Person schaltet in „Dein Konto › Funktionen“ vier Funktionen an und ab: Me-Challenge, Bild, We-Challenge, Gruppen. So bleibt der Einstieg leicht.
- Start: Me-Challenge und Bild an, We-Challenge und Gruppen aus. Wer schon in einer Gruppe ist, hat Gruppen an.
- Abschalten blendet nur das Erstellen aus. Beiträge anderer bleiben im Feed sichtbar.
- Eine Art zu posten bleibt immer an (Me-Challenge, Bild oder We-Challenge). Der Kater erklärt das, sobald jemand die letzte abschalten will.
- Gruppe gründen oder beitreten schaltet Gruppen an.
- In Gruppen gehört die Gruppenaufgabe zu Gruppen und steht immer zur Wahl. Vorher-Nachher folgt dem Schalter Me-Challenge.
- Eine Sperre bis zu einem Meilenstein gibt es noch nicht (offene Aufgabe `2026-10-24_offen_funktionen-sperre.md`).

## Technik

- `src/data/features.ts`: `features`, `useFeatures()`, `setFeature()`, `turnOnGroups()`. Gespeichert per AsyncStorage unter `kiez-features:<userId>`, also pro Gerät und Konto.
- `src/app/account/funktionen.tsx`: Schalter. Karte „Funktionen“ in `src/app/account/index.tsx`, Icon Phosphor `toggle-right` (`PH.features` in `fashionableSvgs.ts`), Bedeutung „Funktionen an- und abschalten“.
- Erstellen-Blatt (`ComposeSheet.tsx`) und Entwurf (`challenge/create/step-1.tsx`) zeigen nur angeschaltete Typen. Bei nur einem Typ fällt der Typ-Schalter weg.
- Feed: Ohne Gruppen fehlt der Reiter „Gruppen“, Wischen springt nicht dorthin. Die Karte „Deine Gruppen“ im Konto fehlt ebenfalls.
- Wave bleibt wie bisher über `challengeTypes` für alle abgeschaltet.
