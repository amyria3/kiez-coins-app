-- Zugänge fürs Weiterposten verschlüsselt in Supabase Vault (Daria, 2026-11-14, Sicherheitsprüfung).
--
-- Vorher stand der Zugang (BlueSky-App-Passwort, Mastodon-, Instagram- und Facebook-Token) im Klartext in
-- crosspost_accounts.secret. Jetzt liegt er verschlüsselt in vault.secrets, die Tabelle hält nur die id (secret_id).
-- Schreiben und Lesen nur über zwei Funktionen, die allein der Service-Schlüssel (Edge Function weiterposten) aufrufen darf.
-- Trennt jemand ein Konto oder löscht sein Konto, löscht ein Trigger den Zugang aus Vault.
--
-- Reihenfolge: erst diese Migration, gleich danach die Edge Function neu hochladen
-- (npx supabase functions deploy weiterposten). Dazwischen schlägt Weiterposten fehl.
-- Läuft auch mehrfach ohne Fehler.

create extension if not exists supabase_vault with schema vault;

alter table public.crosspost_accounts add column if not exists secret_id uuid;
alter table public.crosspost_accounts alter column secret drop not null;

-- Vorhandene Zugänge nach Vault umziehen und den Klartext löschen
do $$
declare
  r record;
  v_id uuid;
begin
  for r in select user_id, platform, secret from public.crosspost_accounts where secret_id is null and secret is not null loop
    v_id := vault.create_secret(r.secret, null, 'Weiterposten ' || r.platform);
    update public.crosspost_accounts set secret_id = v_id, secret = null where user_id = r.user_id and platform = r.platform;
  end loop;
end;
$$;

-- Verbinden: Zugang in Vault schreiben (neu oder ersetzen), Konto speichern
create or replace function public.crosspost_save(p_user uuid, p_platform text, p_handle text, p_instance text, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select secret_id into v_id from public.crosspost_accounts where user_id = p_user and platform = p_platform;
  if v_id is not null and exists (select 1 from vault.secrets where id = v_id) then
    perform vault.update_secret(v_id, p_secret);
  else
    v_id := vault.create_secret(p_secret, null, 'Weiterposten ' || p_platform);
  end if;
  insert into public.crosspost_accounts (user_id, platform, handle, instance, secret, secret_id)
  values (p_user, p_platform, p_handle, p_instance, null, v_id)
  on conflict (user_id, platform) do update
    set handle = excluded.handle, instance = excluded.instance, secret = null, secret_id = excluded.secret_id;
end;
$$;
revoke all on function public.crosspost_save(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.crosspost_save(uuid, text, text, text, text) to service_role;

-- Posten und Löschen: verbundene Konten einer Person mit entschlüsseltem Zugang
create or replace function public.crosspost_accounts_of(p_user uuid)
returns table (platform text, handle text, instance text, secret text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.platform, a.handle, a.instance, coalesce(s.decrypted_secret, a.secret)
  from public.crosspost_accounts a
  left join vault.decrypted_secrets s on s.id = a.secret_id
  where a.user_id = p_user;
$$;
revoke all on function public.crosspost_accounts_of(uuid) from public, anon, authenticated;
grant execute on function public.crosspost_accounts_of(uuid) to service_role;

-- Konto getrennt oder gelöscht: Zugang auch aus Vault entfernen
create or replace function public.crosspost_secret_loeschen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.secret_id is not null then
    delete from vault.secrets where id = old.secret_id;
  end if;
  return old;
end;
$$;
revoke all on function public.crosspost_secret_loeschen() from public, anon, authenticated;

drop trigger if exists crosspost_secret_loeschen on public.crosspost_accounts;
create trigger crosspost_secret_loeschen
  after delete on public.crosspost_accounts
  for each row execute function public.crosspost_secret_loeschen();
