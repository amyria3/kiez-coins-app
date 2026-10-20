# Anmeldung mit Code oder Passwort

Stand: 20.10.2026. Gehört nach Documentation `kiez-coins/konto/MVP_Konto.md` (Abschnitt Anmeldung) und in den App-Status.

## Was sich geändert hat

- Daria hat entschieden: Die App erlaubt beide Wege, Code per Mail und Passwort.
- `onboarding/email` startet mit dem Code-Weg („Code schicken“). Der Knopf „Lieber mit Passwort“ zeigt das Passwortfeld, „Lieber mit Code“ schaltet zurück.
- Der Code-Weg ruft `signInWithOtp` auf und geht weiter zu `onboarding/code`.
- Der Passwort-Weg meldet direkt an. Mit „Confirm email“ an legt „Anheuern“ das Konto an und schickt zur Bestätigung ebenfalls zu `onboarding/code` (Parameter `signup=1`, Prüfung mit `verifyOtp` Typ `signup`, „Code neu senden“ über `auth.resend`).
- Ein Passwort-Login mit unbestätigter Adresse bekommt den Hinweis, sich einmal mit Code anzumelden.

## Mailversand

- Supabase verschickt über Brevo (eigenes SMTP, `smtp-relay.brevo.com`, Port 587), Absender `noreply@kiezcoins.de`. Domain bei INWX.
- Vorlagen „Confirm sign up“ und „Magic Link“ auf Deutsch mit `{{ .Token }}`. Code gilt 10 Minuten (Email OTP Expiration 600 Sekunden).
- Anleitung für Daria: Claude Doc „Anmelde-Mails mit Brevo und INWX“ im Projekt KiezKoins.
