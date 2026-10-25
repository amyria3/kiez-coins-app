-- Update-Hinweis in der Android-App (Daria, 2026-10-25).
--
-- * `latest_version_code`: versionCode der APK, die gerade im Bucket `downloads` liegt. Ist die APK auf dem Handy
--   älter, zeigt die App den Hinweis „Neue Version da“. Setzt der EAS-Workflow `.eas/workflows/android.yml`
--   nach jedem neuen Build, beim Hochladen von Hand Daria per SQL.
-- * `min_version_code`: älteste APK, die noch mit Datenbank und Code zusammenpasst. Ältere APKs zeigen den Hinweis
--   ohne „Später“. Leer heißt: keine Mindestversion.
-- * `app_release()` gibt beide Werte an alle heraus, ohne den Rest der Tabelle (Passwort-Hash) freizugeben.
-- * Angemeldete Personen dürfen die APK lesen. So lädt die App sie ohne Einladungscode herunter.

alter table public.download_settings
  add column if not exists latest_version_code int check (latest_version_code > 0),
  add column if not exists min_version_code int check (min_version_code > 0);

insert into public.download_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.app_release()
returns table (latest_version_code int, min_version_code int)
language sql
stable
security definer
set search_path = public
as $$
  select s.latest_version_code, s.min_version_code from public.download_settings s where s.id = 1;
$$;

revoke all on function public.app_release() from public;
grant execute on function public.app_release() to anon, authenticated;

drop policy if exists "APK für Angemeldete" on storage.objects;
create policy "APK für Angemeldete" on storage.objects for select to authenticated
  using (bucket_id = 'downloads' and name = 'kiez-coins.apk');
