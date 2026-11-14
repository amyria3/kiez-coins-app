-- Konto ohne E-Mail: Grenze je Anschluss statt nur für alle zusammen (Daria, 2026-11-14, Sicherheitsprüfung).
--
-- Vorher galt nur: höchstens 30 neue Konten ohne E-Mail pro Stunde, für alle zusammen. Wer die Grenze ausschöpfte,
-- blockierte alle anderen, und über „Kopie an E-Mail“ gingen bis zu 30 Mails pro Stunde an beliebige Adressen.
-- Jetzt: höchstens 3 Versuche pro Stunde je Anschluss und 100 pro Stunde insgesamt.
--
-- Gespeichert wird nur ein Fingerabdruck der IP-Adresse (SHA-256 mit geheimem Zusatz, in der Edge Function
-- berechnet), nie die Adresse selbst. Einträge verschwinden nach einem Tag. Nur der Service-Schlüssel kommt heran.
-- Läuft auch mehrfach ohne Fehler.

create table if not exists public.no_mail_signups (
  id bigint generated always as identity primary key,
  ip_hash text not null check (char_length(ip_hash) between 16 and 128),
  created_at timestamptz not null default now()
);
create index if not exists no_mail_signups_ip_idx on public.no_mail_signups (ip_hash, created_at);
alter table public.no_mail_signups enable row level security;
revoke all on public.no_mail_signups from anon, authenticated;

-- Prüft und zählt einen Versuch. Antwort: 'ok', 'ip' (Anschluss über der Grenze) oder 'alle' (Grenze für alle)
create or replace function public.no_mail_signup_check(p_ip_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.no_mail_signups where created_at < now() - interval '1 day';
  if (select count(*) from public.no_mail_signups where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 3 then
    return 'ip';
  end if;
  if (select count(*) from public.no_mail_signups where created_at > now() - interval '1 hour') >= 100 then
    return 'alle';
  end if;
  insert into public.no_mail_signups (ip_hash) values (p_ip_hash);
  return 'ok';
end;
$$;
revoke all on function public.no_mail_signup_check(text) from public, anon, authenticated;
grant execute on function public.no_mail_signup_check(text) to service_role;
