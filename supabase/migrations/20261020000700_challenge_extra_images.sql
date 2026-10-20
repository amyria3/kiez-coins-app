-- Bis zu 2 weitere Fotos pro Challenge (Pfade im Bucket wie image_path).

alter table public.challenges
  add column extra_image_paths text[] not null default '{}'
    check (cardinality(extra_image_paths) <= 2);

-- Entwürfe dürfen die weiteren Fotos mit ändern (wie das Hauptfoto)
grant update (extra_image_paths) on public.challenges to authenticated;
