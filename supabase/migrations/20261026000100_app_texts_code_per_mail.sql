-- Button auf dem Anmeldebildschirm heißt jetzt „Code per Mail“ statt „Mit Code anmelden“ (Daria, 26.10.2026).
-- Die CMS-Zeile zieht mit. Die alten Übersetzungen passen nicht mehr, daher leer: Die App nimmt src/i18n/<sprache>.json.
update public.app_texts
set original = 'Code per Mail', text = 'Code per Mail', en = null, fr = null, uk = null, ar = null, he = null
where original = 'Mit Code anmelden'
  and not exists (select 1 from public.app_texts where original = 'Code per Mail');
