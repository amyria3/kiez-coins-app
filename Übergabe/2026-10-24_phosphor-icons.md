# Phosphor Icons im Fashionable Look und als Ersatz im Kiez-Look

Datum: 2026-10-24 · Status: erledigt, muss in die Doku · Ziel in Documentation: `kiez-coins/design/Icon_Regelwerk.md` und `kiez-coins/design/Designsystem.md` (Konto)

Ersetzt die Notiz „Font Awesome im Fashionable Look“ vom selben Tag. Font Awesome Free hat nur Solid und Regular; Pro ist ein Jahresabo. Daria wechselt zu Font Awesome Pro, sobald Geld dafür da ist.

## Entscheidung

- Fashionable Look: alle Icons aus Phosphor Icons, Gewicht Regular (phosphoricons.com, MIT-Lizenz). Gefüllt (Herz bei „gefällt mir“) in Phosphor Fill.
- Kiez-Look: Darias handgezeichnete Figma-Icons. Wo es keins gibt, steht das Phosphor-Icon (`PhIcon`).
- Konto: Freundschaften, Sprache und Look stehen in beiden Looks als große Karten unter „Deine Gruppen“, mit Handschlag, Übersetzen und Palette aus Phosphor.
- Edenstein: Phosphor hat keinen Edelstein. Er bleibt Font Awesome Free „gem“ (Regular, CC BY 4.0).

## Technik

- `scripts/phosphor-icons.mjs` erzeugt `src/components/icons/phosphorSvgs.ts` aus `@phosphor-icons/core` (devDependency). Neues Icon: Namen im Skript eintragen und `node scripts/phosphor-icons.mjs` ausführen.
- `src/components/icons/instagramSvgs.ts`: `instagramSvgs` (nach IconName), `PH` (Leiste, Profil-Reiter, Konto, Coins), `phXml`. `PhIcon` in `Icon.tsx`.

| Bedeutung | IconName / PH-Schlüssel | Phosphor |
|---|---|---|
| Gefällt mir | heart | heart (gefüllt: heart-fill) |
| Kommentar | comment | chat-circle |
| Senden | send | paper-plane-tilt |
| Beitrag erstellen | camera / PH.create | camera |
| Feed | PH.home | house |
| Chats | message / PH.chats | chats |
| Menü | burger / PH.menu | list |
| Ort | map-pin | map-pin |
| Webseite | link | link |
| Einstellungen | settings | gear |
| Zurück, Weiter | chevron-left, chevron-right | caret-left, caret-right |
| Schließen | close | x |
| Erledigt | check | check |
| Mehr, Weniger | plus, minus | plus, minus |
| Weitere Aktionen | more | dots-three |
| Frist | clock | clock |
| Hinweis | info | info |
| Melden | flag | flag |
| Kopieren | copy | copy |
| Sichtbarkeit | eye | eye |
| Deine Challenges, Erstellt | ship / PH.created | squares-four |
| Angenommen (Profil-Reiter) | PH.accepted | check-circle |
| Gruppen | behausung / PH.groups | users-three |
| Geschenk | gift | gift |
| Daumen hoch | thumbs-up | thumbs-up |
| Freundschaften | PH.friends | handshake |
| Sprache | PH.language | translate |
| Look | PH.look | palette |
| Coins | CoinsIcon / PH.coins | coins |
