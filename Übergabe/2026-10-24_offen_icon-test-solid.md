# Test: Font Awesome in einem anderen Stil

- Datum: 2026-10-24
- Status: offen, Test läuft
- Ziel in Documentation: `kiez-coins/design/Icon_Regelwerk.md`, Abschnitt „Instagram-Look“, sobald Daria entschieden hat

## Stand

Daria testet im Instagram-Look einen anderen Font-Awesome-Stil. Font Awesome Free hat nur Regular und Solid; Light, Thin, Duotone und Sharp gibt es nur mit Pro-Lizenz. Der Test zeigt deshalb alles in Solid (gefüllt). Das Herz bleibt leer, solange „gefällt mir“ nicht gesetzt ist.

- Zwei Test-Screens: `/icontest/menu` (Konto-Menü) und `/icontest/feed` (Feed). Im Konto unter „Einstellungen“ stehen dafür die Zeilen „Icon-Test Menü“ und „Icon-Test Feed“, nur im Instagram-Look.
- Technik: `src/components/icons/iconStyle.tsx` mit `IconStyleProvider`; `faXml`, `Icon`, `FaIcon`, `TabBar` und `InstaProfile` lesen den Stil.

## Nächster Schritt

- Daria entscheidet: Solid übernehmen, Regular behalten oder Pro-Lizenz für einen anderen Stil.
- Übernehmen: im Root-Layout `IconStyleProvider value="solid"` setzen. Danach Test-Screens und die zwei Konto-Zeilen löschen, Ergebnis in die Doku, diese Notiz löschen.
