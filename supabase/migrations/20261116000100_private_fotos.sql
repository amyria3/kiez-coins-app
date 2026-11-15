-- Private Fotos in einem eigenen Speicher (Daria, 15.11.2026, Weg A aus der Sicherheitsprüfung vom 14.11.).
--
-- Vorher lagen alle Fotos im öffentlichen Speicher `photos`. Wer einen Link hatte, sah das Foto, auch nachdem
-- jemand eine Gruppe verlassen hatte. Jetzt gilt:
-- * Fotos in Posts für „Privat“ (Me & Myself) und in Gruppen liegen im Speicher `photos-private`. Die App holt
--   dafür kurzlebige Links. Den Link bekommt nur, wer den Post (oder den Kommentar mit dem Bild) lesen darf.
-- * Alles Öffentliche (Kiez, Überall, Schaufenster, Profilbilder) bleibt in `photos`, damit geteilte Seiten,
--   Vorschaubilder und Weiterposten ohne Anmeldung laden.
--
-- Den Speicher erkennt die App am Dateinamen: Private Fotos heißen `<user-id>/p_<datei>`, öffentliche
-- `<user-id>/<datei>`. So bleiben alle Prüfungen „im eigenen Ordner“ gültig, und jeder Pfad sagt selbst, wo er liegt.
--
-- Ändert die Ersteller:in die Sichtbarkeit (Privat ↔ Kiez/Überall), kopiert die App ihre Fotos in den anderen
-- Speicher und ruft danach `sync_challenge_photo_names` auf. Bilder in Kommentaren anderer bleiben, wo sie sind.
--
-- Alte Fotos zieht `scripts/fotos-privat-umziehen.mjs` einmalig um (braucht den geheimen Schlüssel).
-- Voraussetzung: 20261110001400_bildkommentare. Läuft auch mehrfach ohne Fehler.

-- 1. Speicher, nicht öffentlich, gleiche Grenzen wie `photos`
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-private', 'photos-private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false;

-- 2. Wer darf ein privates Foto lesen? Wer einen Post oder Kommentar sehen darf, der darauf verweist.
--    security invoker: Es gelten die Regeln „Challenges lesen“ und „Kommentare lesen“ der fragenden Person.
create or replace function public.can_read_private_photo(p_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.challenges c where c.image_path = p_name)
      or exists (select 1 from public.challenges c where c.image_after_path = p_name)
      or exists (select 1 from public.challenges c where c.image_before_path = p_name)
      or exists (select 1 from public.challenges c where c.report_photo_path = p_name)
      or exists (select 1 from public.challenges c where p_name = any (c.extra_image_paths))
      or exists (select 1 from public.comments k where k.image_path = p_name);
$$;
revoke execute on function public.can_read_private_photo(text) from public, anon;
grant execute on function public.can_read_private_photo(text) to authenticated;

create index if not exists challenges_private_image_idx on public.challenges (image_path) where image_path like '%/p\_%';
create index if not exists challenges_private_after_idx on public.challenges (image_after_path) where image_after_path like '%/p\_%';
create index if not exists challenges_private_before_idx on public.challenges (image_before_path) where image_before_path like '%/p\_%';
create index if not exists challenges_private_report_idx on public.challenges (report_photo_path) where report_photo_path like '%/p\_%';

-- 3. Regeln im Speicher
drop policy if exists "Private Fotos hochladen" on storage.objects;
create policy "Private Fotos hochladen" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) like 'p\_%'
  );

drop policy if exists "Private Fotos lesen" on storage.objects;
create policy "Private Fotos lesen" on storage.objects for select to authenticated
  using (
    bucket_id = 'photos-private'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.can_read_private_photo(name)
    )
  );

drop policy if exists "Eigene private Fotos löschen" on storage.objects;
create policy "Eigene private Fotos löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'photos-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Moderation löscht Kommentarbilder in beiden Speichern (vorher nur `photos`)
drop policy if exists "Moderation löscht Kommentarbilder" on storage.objects;
create policy "Moderation löscht Kommentarbilder" on storage.objects for delete to authenticated
  using (
    bucket_id in ('photos', 'photos-private')
    and (select public.is_moderator())
    and exists (select 1 from public.comments m where m.image_path = objects.name)
  );

-- 4. Nach einem Wechsel der Sichtbarkeit: Dateinamen der eigenen Fotos an den Speicher anpassen.
--    Privat oder Gruppe: `p_` vor den Dateinamen, sonst ohne. Nur die Ersteller:in, nur Fotos in ihrem Ordner.
--    Die App ruft das erst auf, wenn die Kopien im anderen Speicher liegen.
create or replace function public.photo_name_for(p_path text, p_private boolean, p_owner uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_path is null or split_part(p_path, '/', 1) <> p_owner::text then p_path
    when p_private and split_part(p_path, '/', 2) not like 'p\_%' then split_part(p_path, '/', 1) || '/p_' || split_part(p_path, '/', 2)
    when not p_private and split_part(p_path, '/', 2) like 'p\_%' then split_part(p_path, '/', 1) || '/' || substr(split_part(p_path, '/', 2), 3)
    else p_path
  end;
$$;
revoke execute on function public.photo_name_for(text, boolean, uuid) from public, anon, authenticated;

create or replace function public.sync_challenge_photo_names(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges;
  v_private boolean;
  v_me uuid := auth.uid();
begin
  select * into c from public.challenges where id = p_challenge_id and author_id = v_me;
  if c.id is null then
    raise exception 'Nur die Ersteller:in kann die Fotos dieses Posts verschieben.' using errcode = 'P0001';
  end if;
  v_private := c.visibility = 'private' or c.group_id is not null;
  update public.challenges
     set image_path = public.photo_name_for(c.image_path, v_private, v_me),
         image_before_path = public.photo_name_for(c.image_before_path, v_private, v_me),
         image_after_path = public.photo_name_for(c.image_after_path, v_private, v_me),
         extra_image_paths = coalesce((
           select array_agg(public.photo_name_for(x, v_private, v_me) order by i)
             from unnest(c.extra_image_paths) with ordinality as e(x, i)
         ), '{}')
   where id = c.id;
end;
$$;
revoke execute on function public.sync_challenge_photo_names(uuid) from public, anon;
grant execute on function public.sync_challenge_photo_names(uuid) to authenticated;
