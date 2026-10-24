# Font Awesome im Instagram-Look, Konto-Karten

Datum: 2026-10-24 · Status: erledigt, muss in die Doku · Ziel in Documentation: `kiez-coins/design/Icon_Regelwerk.md` (Instagram-Look) und `kiez-coins/design/Designsystem.md` (Konto)

## Font Awesome nur im Instagram-Look

- Daria (24.10.2026): Im Instagram-Look zeigt die App Font-Awesome-Free-Icons. Der Kiez-Look behält Darias Figma-Icons.
- Pakete: `@fortawesome/free-regular-svg-icons`, `@fortawesome/free-solid-svg-icons` (nur Pfaddaten, kein natives Modul, Einzelimporte). Lizenz CC BY 4.0.
- Regel: Regular, wo Font Awesome Free es anbietet, sonst Solid. Gefüllt (Herz bei „gefällt mir“) immer Solid. Das Zeichen füllt 80 % der quadratischen Fläche.
- Code: `src/components/icons/instagramSvgs.ts` (`instagramSvgs`, `FA`, `faXml`), `FaIcon` in `Icon.tsx`.

| Bedeutung | IconName / FA-Schlüssel | Font Awesome |
|---|---|---|
| Gefällt mir | heart | heart (Regular, gefüllt Solid) |
| Kommentar | comment | comment (Regular) |
| Senden | send | paper-plane (Regular) |
| Beitrag erstellen | camera / FA.create | camera (Regular) |
| Feed | FA.home | house (Regular) |
| Chats | message / FA.chats | comments (Regular) |
| Menü | burger / FA.menu | bars |
| Ort | map-pin | location-dot |
| Webseite | link | link |
| Einstellungen | settings | gear |
| Zurück, Weiter | chevron-left, chevron-right | chevron-left, chevron-right |
| Schließen | close | xmark |
| Erledigt | check | check |
| Mehr, Weniger | plus, minus | plus, minus |
| Weitere Aktionen | more | ellipsis |
| Frist | clock | clock (Regular) |
| Hinweis | info | circle-info |
| Melden | flag | flag (Regular) |
| Kopieren | copy | copy (Regular) |
| Sichtbarkeit | eye | eye (Regular) |
| Deine Challenges | ship | table-cells-large |
| Erstellt (Profil-Reiter) | FA.created | table-cells |
| Angenommen (Profil-Reiter) | FA.accepted | circle-check (Regular) |
| Gruppen | behausung / FA.groups | users |
| Geschenk | gift | gift |
| Daumen hoch | thumbs-up | thumbs-up (Regular) |
| Freundschaften | FA.friends | handshake (Regular) |
| Sprache | FA.language | language |
| Look | FA.look | palette |
| Edenstein | FA.gem | gem (Regular), blitzt im Verlauf auf |
| Coins | CoinsIcon | coins |

## Konto im Instagram-Look

- Freundschaften, Sprache und Look stehen als große Karten (NavCard) unter „Deine Gruppen“, mit Handschlag, Sprache und Palette. Im Kiez-Look bleiben sie Zeilen unter „Einstellungen“.
