-- Logo im Rahmen entfernen (weiterposten_ohne_logo) im Moment für alle an, wie alle bezahlten Funktionen
-- (Daria, 2026-11-13: „im Moment auch alle bezahlten Funktionen freigeschaltet“). Später sperren:
--   update public.features set default_on = false where key = 'weiterposten_ohne_logo';
update public.features
set default_on = true, note = 'Für alle, bis bezahlte Funktionen gesperrt werden (Daria, 2026-11-13)'
where key = 'weiterposten_ohne_logo';
