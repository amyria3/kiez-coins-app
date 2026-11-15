-- Kontaktadresse in den Rechtstexten: kontakt@kiezcoins.de statt der Proton-Adresse (Daria, 15.11.2026).
--
-- Die Texte im Code (`src/data/legal.ts`, `src/i18n`) nennen schon die neue Adresse. Diese Migration zieht
-- die Zeilen im Texte-Editor nach: Originale und alle Sprachfassungen. So bleiben Änderungen aus dem Editor erhalten.
-- Läuft auch mehrfach ohne Fehler.

update public.app_texts a
set original = replace(a.original, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de'),
    text = replace(a.text, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de'),
    en = replace(a.en, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de'),
    fr = replace(a.fr, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de'),
    uk = replace(a.uk, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de'),
    ru = replace(a.ru, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de'),
    ar = replace(a.ar, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de'),
    he = replace(a.he, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de')
where concat_ws(' ', a.original, a.text, a.en, a.fr, a.uk, a.ru, a.ar, a.he) like '%kiezkoins@protonmail.com%'
  and not exists (
    select 1 from public.app_texts b
    where b.original = replace(a.original, 'kiezkoins@protonmail.com', 'kontakt@kiezcoins.de')
      and b.original <> a.original
  );
