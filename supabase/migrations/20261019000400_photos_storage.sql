-- ---------------------------------------------------------------------------
-- Fotos (Storage)
-- Öffentlich lesbar, damit die App sie per URL zeigen kann. Hochladen nur in den eigenen Ordner
-- `<user-id>/…`, höchstens 10 MB, nur Bilder.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create policy "Fotos in eigenen Ordner hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Eigene Fotos löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
