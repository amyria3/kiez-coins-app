-- Einstellungen für die Download-Seite, nur für die Edge Function `download` (Service Role).
-- Passwort als SHA-256-Hash (hex), APK-Adresse als Ausweichweg, solange keine Datei im Bucket `downloads` liegt.
-- Werte setzt Daria oder Claude per SQL, nicht im Repo.
create table public.download_settings (
  id int primary key default 1 check (id = 1),
  password_sha256 text,
  apk_url text,
  updated_at timestamptz not null default now()
);
alter table public.download_settings enable row level security;
revoke all on table public.download_settings from anon, authenticated;
