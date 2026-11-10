-- Bildkommentare (Daria, 2026-11-10): Ein Kommentar kann ein Bild haben, mit oder ohne Text, höchstens eins.
-- Das Bild liegt wie alle Fotos im Speicher `photos` im Ordner der Person. Freischaltung über den Schlüssel
-- `bildkommentare` (für alle an). Dazu dürfen Moderatorinnen Kommentare samt Bild löschen.

-- 1. Spalte für das Bild. Nur ein Pfad im eigenen Ordner `<user-id>/<datei>`.
alter table public.comments
  add column if not exists image_path text
  check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[^/]+$');

-- 2. Text darf leer sein, wenn ein Bild dabei ist. Höchstens 1000 Zeichen wie bisher.
alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments add constraint comments_body_check check (
  char_length(btrim(body)) <= 1000 and (char_length(btrim(body)) >= 1 or image_path is not null)
);

-- 3. Beim Schreiben: Bild nur aus dem eigenen Ordner und nur mit freigeschalteter Funktion.
--    Zusätzliche (restriktive) Regel, die bestehende Regel „Kommentar schreiben“ bleibt unverändert.
drop policy if exists "Kommentarbild nur eigenes und freigeschaltet" on public.comments;
create policy "Kommentarbild nur eigenes und freigeschaltet" on public.comments
  as restrictive for insert to authenticated
  with check (
    image_path is null
    or (
      split_part(image_path, '/', 1) = (select auth.uid())::text
      and public.feature_an('bildkommentare', (select c.group_id from public.challenges c where c.id = challenge_id))
    )
  );

-- 4. Moderation löscht Kommentare (eigene Kommentare darf jede Person schon löschen).
drop policy if exists "Moderation löscht Kommentare" on public.comments;
create policy "Moderation löscht Kommentare" on public.comments for delete to authenticated
  using ((select public.is_moderator()));

-- 5. Moderation löscht das Bild eines Kommentars im Speicher. Nur Dateien, die an einem Kommentar hängen;
--    die App löscht erst das Bild, dann den Kommentar.
drop policy if exists "Moderation löscht Kommentarbilder" on storage.objects;
create policy "Moderation löscht Kommentarbilder" on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (select public.is_moderator())
    and exists (select 1 from public.comments m where m.image_path = objects.name)
  );

create index if not exists comments_image_path_idx on public.comments (image_path) where image_path is not null;

-- 6. Freischaltung: für alle an (Regel „keine Funktion ist von Anfang an aus“, Daria, 2026-11-08).
insert into public.features (key, name, description, default_on, note) values
  ('bildkommentare', 'Bildkommentare', 'Ein Bild an einen Kommentar hängen', true, 'Für alle (Daria, 2026-11-10)')
on conflict (key) do nothing;
