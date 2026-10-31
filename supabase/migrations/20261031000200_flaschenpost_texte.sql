-- Daria, 31.10.2026: „Flaschenpost“ steht in der App nicht mehr für E-Mail.
-- Die alten Texte gibt es im Code nicht mehr; ihre Zeilen in app_texts fallen weg.
-- Die neuen Fassungen bringt `node scripts/app-texts.mjs` in die Tabelle.
delete from public.app_texts where original ilike '%Flaschenpost%';
