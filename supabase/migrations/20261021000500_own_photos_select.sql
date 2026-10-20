-- Eigene Fotos auflisten, damit „Konto löschen“ sie mit entfernt (DSGVO Art. 17).
-- Storage braucht für list() und remove() ein Leserecht auf die Zeilen in storage.objects.
-- Das Recht gilt nur für den eigenen Ordner `<user-id>/…`. Fremde Fotos bleiben nur per öffentlicher URL lesbar.

create policy "Eigene Fotos auflisten" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
