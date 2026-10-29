-- Text auf dem Foto (Daria, 29.10.2026): nur bei „Nur ein Bild“ (type 'photo'). Beim Posten tippt man einen
-- kurzen Text aufs Foto und verschiebt ihn mit dem Finger. Das Foto bleibt unverändert; die App legt den Text
-- im Feed, im Detail und in der Vorschau darüber.
--
-- * photo_text: höchstens 80 Zeichen, leer = kein Text
-- * photo_text_x, photo_text_y: Mitte des Texts als Anteil der Bildfläche (0 bis 1)
--
-- Ältere App-Fassungen schicken die Spalten nicht mit und zeigen keinen Text. Das Skript läuft auch ein zweites
-- Mal ohne Fehler.

alter table public.challenges add column if not exists photo_text text;
alter table public.challenges add column if not exists photo_text_x real;
alter table public.challenges add column if not exists photo_text_y real;

alter table public.challenges drop constraint if exists challenges_photo_text_check;
alter table public.challenges add constraint challenges_photo_text_check check (
  (photo_text is null or char_length(photo_text) <= 80)
  and (photo_text_x is null or photo_text_x between 0 and 1)
  and (photo_text_y is null or photo_text_y between 0 and 1)
);

-- Entwürfe dürfen den Text ändern (wie Titel und Foto)
grant update (photo_text, photo_text_x, photo_text_y) on public.challenges to authenticated;
