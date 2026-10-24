# E-Mail-Code: jeder Code der letzten 5 Minuten gilt

Pflichtaufgabe: Migration für `login_codes`, zwei Edge Functions, Secrets und `pg_cron`-Job anlegen.

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Anmeldung“, und Datenbank-Doku für `login_codes`

## Das hat Daria entschieden

- Jeder Code, der nicht älter als 5 Minuten ist, funktioniert. Mails kommen manchmal verspätet an, und die Nutzerin fordert dann einen zweiten Code an.
- Der Button „Code erneut senden“ ist nach jedem Versand 30 Sekunden gesperrt und zeigt den Countdown („Neuer Code in 0:24“).
- Hinweis unter dem Eingabefeld: „Mails kommen manchmal verspätet an. Jeder Code, der nicht älter als 5 Minuten ist, funktioniert.“
- Die Mail zeigt Datum und Uhrzeit der Anforderung gut sichtbar über dem Code.

## Warum ein eigener Ablauf nötig ist

Supabase hält pro Konto nur den zuletzt verschickten Code gültig, da jede neue Anforderung den alten Code überschreibt. `signInWithOtp` und `verifyOtp` in `src/data/auth.tsx` (`sendCode`, `verifyCode`) reichen deshalb für das Feature nicht. Der Code-Wechsel der E-Mail-Adresse (`verifyOtp` mit `type: 'email_change'`) bleibt unverändert.

## Stand

Nichts umgesetzt. Betroffen sind:

- `src/data/auth.tsx`: `sendCode` und `verifyCode` rufen die neuen Edge Functions auf.
- `src/app/onboarding/code.tsx`: Countdown und Hinweistext.
- `src/app/onboarding/email.tsx`: prüfen, ob dort ebenfalls `sendCode` mit Sperre gebraucht wird.
- neu: `supabase/migrations/2026102400xxxx_login_codes.sql`
- neu: `supabase/functions/send-code/index.ts`, `supabase/functions/verify-code/index.ts`
- Brevo: Transaktions-Template für die Code-Mail.

## So funktioniert der Ablauf

1. Die App ruft `send-code` mit der E-Mail-Adresse auf.
2. `send-code` prüft die 30-Sekunden-Sperre, erzeugt einen 6-stelligen Code, speichert den Hash und verschickt die Mail über Brevo. Antwort: `{ next_allowed_at }`.
3. Die App rechnet den Countdown aus `next_allowed_at`. So bleibt der Timer korrekt, wenn die App zwischendurch geschlossen wird.
4. Die App ruft `verify-code` mit E-Mail und Code auf.
5. `verify-code` sucht einen unbenutzten Code dieser E-Mail mit passendem Hash, der nicht älter als 5 Minuten ist, und markiert danach alle offenen Codes dieser E-Mail als benutzt.
6. `verify-code` legt das Konto an, wenn es fehlt (`auth.admin.createUser` mit `email_confirm: true`), und ruft `auth.admin.generateLink({ type: 'magiclink', email })` auf. Antwort: `{ token_hash }` aus `properties.hashed_token`.
7. Die App meldet sich mit `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` an.

Neue und bekannte Nutzerinnen nehmen denselben Weg. So passt der Ablauf zu „Anheuern“.

## Sicherheit

- Versand: höchstens ein Code pro 30 Sekunden pro E-Mail, Prüfung auf dem Server. Damit sind höchstens 10 Codes gleichzeitig gültig.
- Prüfung: höchstens 5 Fehlversuche pro E-Mail in 15 Minuten, danach Sperre. Ratechance damit 50 zu 1 Million.
- Codes liegen nur als SHA-256-Hash mit Pepper in der Datenbank. Pepper als Function-Secret `LOGIN_CODE_PEPPER`.
- Der Service-Role-Key liegt nur in den Function-Secrets und nie im App-Code.
- `login_codes` hat RLS aktiv und keine Policies. So kommt nur der Service-Role-Key an die Tabelle.
- Beide Funktionen antworten immer gleich, egal ob ein Konto existiert. So lässt sich nicht herausfinden, welche E-Mails registriert sind.
- Ein täglicher `pg_cron`-Job löscht Codes und Fehlversuche, die älter als 24 Stunden sind.
- Brevo bekommt E-Mail-Adresse und Code. Der Auftragsverarbeitungsvertrag mit Brevo (DSGVO) muss abgeschlossen sein.

## SQL-Vorschlag für die Migration

```sql
create table public.login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index login_codes_email_created on public.login_codes (lower(email), created_at desc);

create table public.login_code_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);
create index login_code_attempts_email_created on public.login_code_attempts (lower(email), created_at desc);

alter table public.login_codes enable row level security;
alter table public.login_code_attempts enable row level security;
-- keine Policies: nur der Service-Role-Key hat Zugriff

select cron.schedule(
  'login_codes_cleanup',
  '17 3 * * *',
  $$
    delete from public.login_codes where created_at < now() - interval '24 hours';
    delete from public.login_code_attempts where created_at < now() - interval '24 hours';
  $$
);
```

## Mail

- Betreff: „Dein KiezCoins-Code · 10:53 Uhr“
- Text, groß über dem Code:
  - „Angefordert am 24.10.2026 um 10:53 Uhr“
  - der Code, z. B. „482 913“
  - „Gültig bis 10:58 Uhr“
- `send-code` formatiert beide Zeiten in `Europe/Berlin` und übergibt sie als Parameter an das Brevo-Template.

## Secrets für die Edge Functions

`SUPABASE_SERVICE_ROLE_KEY` (von Supabase gesetzt), `BREVO_API_KEY`, `BREVO_TEMPLATE_ID_LOGIN_CODE`, `LOGIN_CODE_PEPPER`. Werte nie in dieses Repo schreiben.

## Nächster Schritt

Migration anlegen, `send-code` und `verify-code` schreiben, Brevo-Template anlegen, danach `src/data/auth.tsx` und `src/app/onboarding/code.tsx` umstellen und mit zwei kurz nacheinander angeforderten Codes testen: beide funktionieren, ein 6 Minuten alter Code nicht.
