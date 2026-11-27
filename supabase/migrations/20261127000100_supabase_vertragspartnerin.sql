-- Datenschutzerklärung: Vertragspartnerin ist laut Supabase-Auftragsverarbeitungsvertrag (Version 1 vom 01.08.2026)
-- Supabase Pte. Ltd., nicht Supabase Inc. (Daria, 27.11.2026).
--
-- Die Texte im Code (`src/data/legal.ts`, `src/i18n`, `website/datenschutz.html`) nennen schon die richtige Firma.
-- Diese Migration zieht die Zeilen im Texte-Editor nach: Originale und alle Sprachfassungen. So bleiben Änderungen
-- aus dem Editor erhalten. Läuft auch mehrfach ohne Fehler.

update public.app_texts a
set original = replace(a.original, 'Supabase Inc.', 'Supabase Pte. Ltd.'),
    text = replace(a.text, 'Supabase Inc.', 'Supabase Pte. Ltd.'),
    en = replace(a.en, 'Supabase Inc.', 'Supabase Pte. Ltd.'),
    fr = replace(a.fr, 'Supabase Inc.', 'Supabase Pte. Ltd.'),
    uk = replace(a.uk, 'Supabase Inc.', 'Supabase Pte. Ltd.'),
    ru = replace(a.ru, 'Supabase Inc.', 'Supabase Pte. Ltd.'),
    ar = replace(a.ar, 'Supabase Inc.', 'Supabase Pte. Ltd.'),
    he = replace(a.he, 'Supabase Inc.', 'Supabase Pte. Ltd.')
where concat_ws(' ', a.original, a.text, a.en, a.fr, a.uk, a.ru, a.ar, a.he) like '%Supabase Inc.%'
  and not exists (
    select 1 from public.app_texts b
    where b.original = replace(a.original, 'Supabase Inc.', 'Supabase Pte. Ltd.')
      and b.original <> a.original
  );
