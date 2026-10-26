# Kiez ausschalten: „Erstmal nur ich“

- Datum: 2026-10-26
- Status: offen, Feature-Wunsch von Daria
- Gehört in Documentation: `kiez-coins/app/Offene_Punkte.md`, nach der Umsetzung `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Challenges“

## To-do (Daria, 26.10.2026)

„Kiez ausschalten (als Feature) – ‚Erstmal nur ich‘“

Die Person kann den Kiez in der App ausschalten. Der Modus heißt etwa „Erstmal nur ich“: Sie sieht keinen Kiez-Feed und postet nicht in den Kiez, sondern nutzt die App für sich (und ggf. ihre Gruppen).

Verwandt: `2026-10-26_offen_sichtbarkeit-nur-ich.md` (Sichtbarkeit „Nur ich“ für einzelne Beiträge). Ist der Kiez aus, liegt nahe, dass jeder neue Beitrag automatisch „Nur ich“ ist. Beide Notizen am besten zusammen umsetzen.

## Stand

Noch nichts umgesetzt. Es gibt schon Schalter in „Dein Konto › Funktionen“ (`src/app/account/funktionen.tsx`, `src/components/FeatureSwitches.tsx`), gespeichert in `src/data/features.ts`:

- `Feature = 'photo' | 'we' | 'groups'`, Startwerte `{ photo: true, we: false, groups: false }`, pro Person in AsyncStorage.
- Vorbild: Ist `groups` aus, blendet `src/app/feed.tsx` den Reiter „In Gruppen“ aus (`groupsOn`, `tabOrder`).

Der Kiez ist bisher immer an. Der Feed startet im Reiter „Im Kiez“ (`chosenTab` default `'nearby'`). `useRequireKiez()` in `feed.tsx` verlangt einen Kiez vor dem Erstellen. In der Datenbank prüfen We-Challenges `is_active_member()` (Kiez-Mitgliedschaft), siehe auch `2026-10-24_offen_features-aus-textkorrektur.md` (Vorschlag `is_member()` ohne Kiez-Bedingung).

## Offene Fragen an Daria

- Was sieht die Person bei ausgeschaltetem Kiez: nur eigene Beiträge, oder auch ihre Gruppen?
- Ist „Erstmal nur ich“ der Startzustand für neue Konten (wie `we: false`), oder schaltet man es bewusst an?
- Braucht man dafür noch einen Kiez beim Onboarding?
- Was passiert mit bereits öffentlichen Beiträgen, wenn jemand den Kiez ausschaltet: bleiben sie sichtbar oder werden sie „Nur ich“?
- Name in der App: „Erstmal nur ich“, „Kiez aus“ oder anders?

## Code-Vorschlag

In `src/data/features.ts` eine Funktion `kiez` ergänzen (`Feature = 'photo' | 'we' | 'groups' | 'kiez'`). Ist sie aus:

- `feed.tsx`: Reiter „Im Kiez“ weglassen wie bei `groups`, Start in einer Ansicht „Nur ich“ mit den eigenen Beiträgen.
- Erstellen-Blatt (`src/components/compose/ComposeSheet.tsx`): kein Kiez-Reiter, Sichtbarkeit fest auf „Nur ich“ (Spalte `visibility = 'private'` aus der Notiz „Nur ich“).
- We-Challenges ausblenden, sie brauchen andere im Kiez.

Soll die Wahl geräteübergreifend gelten, gehört sie ins Profil (Spalte in `profiles`, Migration) statt nur in AsyncStorage.

## Nächste Schritte

- Daria beantwortet die Fragen.
- Zusammen mit „Nur ich“ umsetzen: erst Migration für `visibility`, dann Schalter und Feed.
