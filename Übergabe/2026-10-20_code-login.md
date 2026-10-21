# Anmeldung per Passwort oder E-Mail-Code

Stand: 21.10.2026

**Status:** Läuft. Der Code-Login ist auf `main`, der Mailversand über Brevo und `kiezcoins.de` funktioniert seit 21.10.2026 (Code-Mail kam um 09:55 an, Anmeldung per Code klappt). Brevo ist erledigt.

Gehört nach Documentation: `kiez-coins/konto/MVP_Konto.md` (Anmeldung) und `kiez-coins/ENTSCHEIDUNGEN.md`.

## Was sich geändert hat

- `onboarding/email` bietet zwei Wege: E-Mail und Passwort, oder ohne Passwort einen Code per Mail. Der Code-Weg leitet auf `onboarding/code` weiter.
- Bei „Ich hab schon ein Konto“ heißt der Code-Weg „Passwort vergessen? Code per Mail“.
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
- Brevo › Sicherheit: Die IP-Sperre für SMTP ist aus. Supabase verschickt von wechselnden IP-Adressen, mit Sperre lehnt Brevo die Mails ab.
- Den Auftragsverarbeitungsvertrag mit Brevo hat Daria mit den Brevo-AGB akzeptiert (21.10.2026).
- Redirect URL in Supabase: `kiezcoins://**`. Die App wertet Links noch nicht aus.

## Pull Request

PR #11 („Anmeldung mit Code per Mail oder Passwort“) ist geschlossen und nicht gemergt. Der Code kam über andere Branches auf `main` (`onboarding/code`, `account/credentials`, `account/email`, `account/password`). PR #11 braucht niemand mehr.
