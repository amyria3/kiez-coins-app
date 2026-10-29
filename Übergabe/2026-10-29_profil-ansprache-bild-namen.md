# Profil: Ansprache ausgeblendet, Profilbild zuschneiden, Namen ohne Kiez ohne Hinweistext

Datum: 2026-10-29 · Status: umgesetzt, PR #117, #118, #119 und #120 gemergt; noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Profil“), `app/Stand_App.md`

## Entscheidungen von Daria (29.10.2026)

- Das Feld „Ansprache“ verschwindet aus der Anzeige im Profil. Die Datenbank bleibt unverändert.
- Das Profilbild lässt sich richtig positionieren.
- Namen und Profilbilder von Personen ohne gemeinsamen Kiez bleiben verdeckt. Nur der Hinweis „Name verdeckt, solange Dein Kiez fehlt“ fällt weg.

## Umsetzung

- Ansprache (PR #117): `src/app/account/profile.tsx` zeigt das Feld nicht mehr. Spalte und gespeicherte Werte bleiben.
- Profilbild (PR #118): `src/components/AvatarCropper.tsx`. Nach der Fotoauswahl öffnet sich ein Fenster mit Kreis. Mit einem Finger verschieben, mit zwei Fingern oder Minus und Plus zoomen (bis 400 %). Gespeichert wird ein Quadrat mit 640 px als JPEG. Im Profil steht zusätzlich „Ausschnitt ändern“. `choosePhoto` in `src/components/Form.tsx` nimmt dafür einen zusätzlichen Eintrag `extra` an.
- Namensregel: PR #119 hatte die Regel aus Versehen ausgeschaltet (Missverständnis). PR #120 schaltet sie wieder ein (`NAMEN_OHNE_KIEZ_VERDECKEN = true` in `src/components/AuthorRow.tsx`) und entfernt nur den Hinweistext. Verdeckte Namen sind für Screenreader ausgeblendet (`AuthorRow.tsx`, `src/app/user/[id]/index.tsx`).

## Offene Punkte

- Fotos von fremden Servern (Beispieldaten) darf der Browser nicht zuschneiden. Dann übernimmt die App das Foto unverändert.
