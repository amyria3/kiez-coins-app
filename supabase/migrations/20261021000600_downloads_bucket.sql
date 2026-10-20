-- Privater Bucket für die Test-App (APK). Keine Regeln für anon oder authenticated:
-- Lesen geht nur über signierte Links, die die Edge Function `download` nach Passwortprüfung erzeugt.
-- Hochladen macht Daria im Supabase-Dashboard (Storage › downloads).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('downloads', 'downloads', false, 52428800, array['application/vnd.android.package-archive', 'application/octet-stream'])
on conflict (id) do nothing;
