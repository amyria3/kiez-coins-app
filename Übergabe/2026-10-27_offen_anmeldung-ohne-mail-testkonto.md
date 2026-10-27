# Anmeldung ohne E-Mail und Testkonto

Stand: 27.10.2026. Status: offen, bis der PR gemergt und die Einstellungen gesetzt sind. Gehört in Documentation nach `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Anmeldung“, und in die Datenbank-Doku (zwei neue Migrationen, Edge Function `konto-ohne-mail`).

Pflichtaufgabe: In Supabase › Authentication › Sign In / Providers „Allow anonymous sign-ins“ einschalten (Daria).
Pflichtaufgabe: Secret `BREVO_API_KEY` für die Edge Function `konto-ohne-mail` setzen, sonst geht keine Kopie per Mail raus.
Pflichtaufgabe beim Merge: Migrationen `20261027000300_login_without_email.sql` und `20261027000400_test_accounts.sql` anwenden, Edge Function `konto-ohne-mail` mit `verify_jwt: false` deployen (die App schickt den Publishable Key, kein JWT).

## Entscheidungen (Daria, 27.10.2026)

- Button „Ich möchte meine E-Mail nicht teilen“ unter der E-Mail-Anmeldung. Er führt zu Deckname und Passwort. Auf Wunsch gehen Deckname und Passwort einmal per Mail raus, die Adresse wird nicht gespeichert.
- Einmal testen ohne Anmeldung: Testkonto über die anonyme Anmeldung von Supabase (statt Fantasie-Mail und Zufallspasswort). Beiträge tragen die Marke „Testaccount“.

## So funktioniert es

- **Ohne E-Mail:** Die Edge Function legt das Konto mit einer erfundenen Adresse `<uuid>@ohne-mail.kiezcoins.de` an (gleich bestätigt) und setzt den Decknamen. Die App meldet sich mit dieser Adresse an; später findet sie die Adresse über `login_email_for_handle(handle)`. Die App zeigt die erfundene Adresse nie an (`isHiddenEmail`, `visibleEmail` in `src/data/auth.tsx`). Höchstens 30 neue Konten ohne Mail pro Stunde.
- **Testkonto:** „Erst mal testen, ohne Anmeldung“ auf der Startseite ruft `signInAnonymously()` auf, danach das normale Onboarding ab Deckname. `profiles.is_test` folgt `auth.users.is_anonymous` (Trigger), Nutzer:innen können den Wert nicht ändern. Ein Cron-Job `delete-old-test-accounts` löscht um 03:30 anonyme Konten, die älter als 7 Tage sind, samt Beiträgen. Wer im Konto eine E-Mail nachträgt, behält alles, und die Marke verschwindet.

## Offene Punkte

- Wer ohne E-Mail sein Passwort vergisst, kommt nicht mehr rein. Nachtragen einer E-Mail unter Zugangsdaten sollte gehen; falls in Supabase „Secure email change“ an ist, verlangt Supabase auch einen Code an die alte (erfundene) Adresse. Dann muss der Schalter aus oder der Weg über die Edge Function laufen. Ungetestet.
- Die Kopie per Mail enthält das Passwort im Klartext, so gewünscht.
- Fotos gelöschter Testkonten bleiben im Bucket `photos` liegen. Bei Bedarf im Cron-Job mitlöschen.
- Testkonten dürfen bisher alles (Chat, Bountys). Einschränken, falls Missbrauch auffällt.
- Übersetzungen der neuen Texte fehlen noch (`node scripts/i18n.mjs --missing`).

## Dateien

- `supabase/functions/konto-ohne-mail/index.ts`
- `supabase/migrations/20261027000300_login_without_email.sql`, `20261027000400_test_accounts.sql`
- `src/app/onboarding/ohne-mail.tsx`, `src/app/onboarding/email.tsx`, `src/app/onboarding/welcome.tsx`
- `src/data/auth.tsx` (`signInOrUpWithHandle`, `startTest`, `isTest`, `noEmail`)
- `src/components/Badges.tsx` (`TestAccountBadge`, `NameWithTestMark`), `ChallengePost.tsx`, `BeforeAfterPost.tsx`
- `src/app/account/credentials.tsx`, `src/app/account/email.tsx`
