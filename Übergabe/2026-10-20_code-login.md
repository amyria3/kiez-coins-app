# Anmeldung per Passwort oder E-Mail-Code

Stand: 20.10.2026

Gehört nach Documentation: `kiez-coins/konto/MVP_Konto.md` (Anmeldung) und `kiez-coins/ENTSCHEIDUNGEN.md`.

## Was sich geändert hat

- `onboarding/email` (Stand 21.10.2026): zuerst nur die E-Mail, darunter „Mit Code registrieren“ und als zweite Wahl „Passwort festlegen“ (bei „Ich hab schon ein Konto“: „Mit Code anmelden“ und „Mit Passwort anmelden“). Nach der Wahl gleiten die Buttons zur Seite, die E-Mail rutscht hoch, und an derselben Stelle erscheint das Feld für den Code oder das Passwort. Der Code wird direkt dort geprüft. `onboarding/code` nutzt die App nicht mehr.
- Im Passwort-Weg führt „Stattdessen mit Code“ bzw. „Passwort vergessen? Code per Mail“ zum Code.
- Neuer Eintrag „Zugangsdaten“ unter „Dein Konto“ → `account/credentials` mit zwei Zeilen:
  - „E-Mail“ → `account/email`: neue Adresse eingeben, Code von der neuen Adresse bestätigen (`verifyOtp` mit Typ `email_change`).
  - „Passwort hinterlegen“ bzw. „Passwort ändern“ → `account/password`.
- Ob ein Passwort hinterlegt ist, merkt sich die App in den Nutzer-Metadaten (`has_password`). Registrierung mit Passwort, Anmeldung mit Passwort und `account/password` setzen den Merker.
- Vergessenes Passwort: per Code anmelden, dann unter Zugangsdaten ein neues festlegen. Es gibt keinen Reset-Link.

## Mailversand

- Domain `kiezcoins.de` liegt bei INWX. Dort stehen die Brevo-Einträge: TXT `brevo-code`, CNAME `brevo1._domainkey` und `brevo2._domainkey`, TXT `_dmarc`.
- Supabase Auth verschickt über Brevo-SMTP (`smtp-relay.brevo.com`, Port 587) als `registration.noreply@kiezcoins.de`.
- Brevo Free: 300 Mails pro Tag. Supabase-Limit für E-Mails: 30 pro Stunde.
- Supabase-Vorlagen „Magic Link“, „Confirm signup“ und „Change Email Address“ enthalten `{{ .Token }}`, damit die Mail den Code zeigt.
- „Secure email change“ in Supabase ist aus. Sonst verlangt Supabase einen zweiten Code von der alten Adresse, den die App nicht abfragt.
- „Confirm email“ bleibt aus, damit die Passwort-Registrierung ohne Bestätigungsmail direkt eine Sitzung bekommt.
- Redirect URL in Supabase: `kiezcoins://**`. Die App wertet Links noch nicht aus.
