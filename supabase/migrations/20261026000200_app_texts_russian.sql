-- Russisch in der App (Daria, 26.10.2026): eine weitere Sprachspalte im Texte-CMS.
-- Leer heißt: Die App nimmt die mitgelieferte Übersetzung aus src/i18n/ru.json.
-- Voraussetzung: 1400 (app_texts_languages). Läuft auch mehrfach ohne Fehler.

alter table public.app_texts
  add column if not exists ru text;

grant update (text, en, fr, uk, ru, ar, he) on public.app_texts to authenticated;

-- Zeitstempel auch bei Änderungen an der neuen Spalte
drop trigger if exists app_texts_touch on public.app_texts;
create trigger app_texts_touch
  before update of text, en, fr, uk, ru, ar, he on public.app_texts
  for each row execute function public.touch_app_texts();
