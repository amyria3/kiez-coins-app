# Login: ein Weg für neue und bekannte Konten

Datum: 24.10.2026
Gehört nach: `kiez-coins/ENTSCHEIDUNGEN.md` (Anmeldung) und `kiez-coins/app/Stand_App.md` (Onboarding)

## Entscheidung (Daria)

- Die App unterscheidet beim Einstieg nicht mehr zwischen „Anheuern“ und „Ich hab schon ein Konto“. Der Willkommensbildschirm hat nur noch „Anheuern“.
- `onboarding/email` zeigt „Mit Code anmelden“ und „Mit Passwort anmelden“.
- „Mit Passwort anmelden“ öffnet das Passwortfeld sofort, auch ohne E-Mail. Die E-Mail prüft die App beim Absenden.

## So wertet die App das Passwort aus

1. Anmelden mit E-Mail und Passwort. Klappt es, geht es weiter.
2. Meldet Supabase `invalid_credentials`, legt die App ein Konto an (Passwort mindestens 8 Zeichen).
3. Gibt es das Konto schon (`user_already_exists`/`email_exists`), stimmt das Passwort nicht. Die App zeigt „E-Mail oder Passwort stimmen nicht.“ Darunter steht „Passwort vergessen? Code per Mail“.

Code: `signInOrUpWithPassword` in `src/data/auth.tsx`. Der Code-Weg legt bei Bedarf immer ein Konto an (`shouldCreateUser: true`).

Voraussetzung: „Confirm email“ ist in Supabase aus. Sonst meldet `signUp` ein bestehendes Konto nicht als Fehler.
