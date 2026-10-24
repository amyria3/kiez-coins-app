# TypeScript auf die neuen React-Native-Typen umstellen

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/app/Arbeitsstand_Code.md` (Abschnitt SDK 58)

- Seit SDK 58 (React Native 0.88) nutzt `tsconfig.json` vorerst die alten React-Native-Typen (`customConditions`).
- Mit der Strict TypeScript API meldet `npx tsc --noEmit` 57 Fehler, vor allem bei Refs (`measureInWindow`, `scrollTo`) und Bildquellen.
- Die Ausnahme fällt nach React Native 0.89 weg. Bis dahin die Stellen umstellen, dann `customConditions` entfernen.
- Prüfen: `customConditions` vorübergehend entfernen, `npx tsc --noEmit`, Fehler nach Datei abarbeiten.
