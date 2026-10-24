# Funktionen an- und abschalten

Datum: 2026-10-24 · Status: erledigt, muss in die Doku · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“, und `kiez-coins/design/Icon_Regelwerk.md` (neues Icon)

## Entscheidung

- Jede Person schaltet drei Funktionen an und ab: Bild, We-Challenge, Gruppen. So bleibt der Einstieg leicht.
- Me-Challenge ist immer an und steht nicht in der Liste, da sie dort verwirrt (Daria, 24.10.2026).
- Start für alle: Me-Challenge und Bild. We-Challenge und Gruppen sind aus.
- Onboarding: Schritt 6 von 7 „Funktionen“ nach dem Kodex zeigt den Stand. Dort lassen sich We-Challenge und Gruppen schon anschalten. Danach Push (Schritt 7).
- Später in „Dein Konto › Funktionen“, mit denselben Schaltern.
- Abschalten blendet nur das Erstellen aus. Beiträge anderer bleiben im Feed sichtbar.
- Gruppe gründen oder beitreten schaltet Gruppen an.
- In Gruppen gehört die Gruppenaufgabe zu Gruppen und steht immer zur Wahl, ebenso Vorher-Nachher.
- Eine Sperre bis zu einem Meilenstein gibt es noch nicht (offene Aufgabe `2026-10-24_offen_funktionen-sperre.md`).

## Technik

- `src/data/features.ts`: `features`, `useFeatures()`, `setFeature()`, `turnOnGroups()`. Gespeichert per AsyncStorage unter `kiez-features:<userId>`, also pro Gerät und Konto.
- `src/components/FeatureSwitches.tsx`: Schalter. Genutzt in `src/app/onboarding/funktionen.tsx` und `src/app/account/funktionen.tsx`. Karte „Funktionen“ in `src/app/account/index.tsx`, Icon Phosphor `toggle-right` (`PH.features` in `fashionableSvgs.ts`), Bedeutung „Funktionen an- und abschalten“.
- Erstellen-Blatt (`ComposeSheet.tsx`) und Entwurf (`challenge/create/step-1.tsx`) zeigen nur angeschaltete Typen. Bei nur einem Typ fällt der Typ-Schalter weg.
- Feed: Ohne Gruppen fehlt der Reiter „Gruppen“, Wischen springt nicht dorthin. Die Karte „Deine Gruppen“ im Konto fehlt ebenfalls.
- Wave bleibt wie bisher über `challengeTypes` für alle abgeschaltet.
