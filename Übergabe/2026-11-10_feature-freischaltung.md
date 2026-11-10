# Feature-Freischaltung

Datum: 2026-11-10 · Status: umgesetzt, Notiz für die Doku · Gehört nach Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Funktionen“) und in die Datenbank-Doku (Tabellen `features`, `feature_grants`, Funktionen `feature_an`, `meine_features`).

Pflichtaufgabe: Migration `supabase/migrations/20261110001100_feature_freischaltung.sql` im Supabase SQL Editor einspielen (nach 20261110001000). Bis dahin läuft die App wie vorher.

## Entscheidung (Daria, 2026-11-10)

Jede Funktion außerhalb des Kerns hat einen Schlüssel und ist an oder aus. Eine eigene Funktion entscheidet je Person, später auch je Gruppe oder Verein. Im Moment ist alles an für alle (Daria, 2026-11-10: „Alles für alle freigeschaltet“); später werden bestimmte Funktionen nur für einzelne Menschen, Gruppen oder Vereine freigeschaltet.

## So funktioniert es

- Datenbank: `public.features` (Schlüssel, Name, Standard `default_on`) und `public.feature_grants` (Freischaltung oder Sperre für eine Person `user_id` oder eine Gruppe `group_id`, gültig bis `until`, `'infinity'` = ohne Ende, wie `plan_until` beim Schaufenster).
- `public.feature_an(schluessel, gruppe)` prüft der Reihe nach: Moderatorin → alles an. Freischaltung der Person. Freischaltung einer Gruppe (mit Gruppe genau dieser, ohne Gruppe einer ihrer Gruppen). Standard der Funktion. Unbekannter Schlüssel → an.
- `public.meine_features(gruppe)` gibt alles auf einmal zurück, die App lädt das einmal pro Sitzung.
- App: `src/data/freischaltung.ts`, Abfrage mit `useFeature('schluessel')` bzw. `useFeature('schaufenster', groupId)`. Fehlt die Migration, gilt der Standard aus `FEATURE_DEFAULTS` (Moderatorinnen alles).
- Getrennt davon blendet jede Person Funktionen unter „Dein Konto › Funktionen“ für sich aus (`src/data/features.ts`). Freigeschaltet = darf es haben, ausgeblendet = will es gerade nicht sehen.
- Das Schaufenster behält `plan_until` für seinen Bezahlstand (50 Einträge, alle sichtbar). Das ist kein Feature-Schalter und bleibt dort.

## Funktionen mit Schlüssel (Stand 2026-11-10)

| Schlüssel | Standard | Vorher |
|---|---|---|
| `routine` | an | `useRoutineAvailable` fragte `is_moderator` |
| `kalender` | an | neu (2026-11-10), Migration `20261110001200_feature_kalender.sql` |
| `schaufenster` | an | `useShowcaseEnabled` fragte `is_moderator` |
| `weiterposten` | an | `CROSSPOST_ACTIVE = true` |
| `ohne_wasserzeichen` | an | neu (2026-11-10): Bildpost teilen ohne Kater und „KiezCoins“ im Rahmen, Migration `20261110001500_feature_rahmen.sql` |
| `ohne_rahmen` | an | neu (2026-11-10): Bildpost teilen ohne weißen Rahmen, dieselbe Migration |

## SQL für Daria

```sql
-- Funktion für alle abschalten (dann gelten nur noch Freischaltungen)
update public.features set default_on = false where key = 'routine';

-- Einer Person freischalten (Kurzname aus profiles.handle)
insert into public.feature_grants (feature_key, user_id, note)
select 'schaufenster', id, 'Testerin' from public.profiles where handle = 'kurzname';

-- Einer Gruppe oder einem Verein freischalten, bis Ende 2027
insert into public.feature_grants (feature_key, group_id, until, note)
values ('schaufenster', '<gruppen-id>', '2027-12-31', 'Verein bezahlt');

-- Freischaltung zurücknehmen
delete from public.feature_grants where feature_key = 'schaufenster' and group_id = '<gruppen-id>';
```

## Offen

- Weitere Funktionen außerhalb des Kerns bekommen einen Schlüssel, sobald Daria sie benennt (Kandidaten: Nachrichten, Wave; Kalender hat seit 2026-11-10 einen).
- Die Datenbank prüft die Freischaltung noch nicht selbst (z. B. beim Anlegen eines Schaufensters). Nötig, sobald etwas wirklich nur für Freigeschaltete gelten soll.
