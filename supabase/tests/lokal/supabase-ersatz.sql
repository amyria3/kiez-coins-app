-- Ersatz für das, was Supabase mitbringt: Rollen, auth, storage, cron, Realtime-Publikation.
-- Nur für einen lokalen Postgres, damit alle Migrationen und Tests ohne Supabase-Projekt laufen.
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create schema storage; create schema cron;
create table auth.users (id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text, email text,
  raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true), current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select 'authenticated' $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now(), metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create table cron.job (jobid serial primary key, jobname text, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job(jobname, schedule, command) values (n, s, c) returning jobid $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname = n returning true $$;
create publication supabase_realtime;
grant usage on schema public, auth, storage to anon, authenticated;
-- Supabase gibt neuen Tabellen in public Leserechte für angemeldete Personen
alter default privileges in schema public grant select, insert, delete on tables to authenticated;
