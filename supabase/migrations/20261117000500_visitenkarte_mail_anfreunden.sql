-- Visitenkarte per Mail und Anfreunden über das Schaufenster (Daria, 2026-11-17: „per Mail senden können (aus dem
-- public interface) … Außerdem sollte ich mich mit der Person gleich nach dem Scannen anfreunden können.“)
-- Baut auf 20261110000400 (Schaufenster), 20261022000400 (Freundschaften) und 20261021000700 (Blockieren) auf.
--
-- 1. showcases.friend_requests: Schalter in „Bearbeiten“. An = Besucher:innen können der Person, die das Schaufenster
--    angelegt hat, über das Schaufenster eine Freundschaftsanfrage schicken. Anfangs an (Projektregel 2026-11-08).
-- 2. showcase_accepts_friends(): Darf die öffentliche Seite oder die App den Knopf „Mit … anfreunden“ zeigen?
-- 3. request_showcase_friend(): Schickt die Anfrage an die Gründer:in, ohne dass die App deren id kennen muss.
-- 4. showcase_card_mails: Protokoll der Funktion visitenkarte-mail für die Begrenzung. Gerät und Empfängeradresse
--    stehen nur als Prüfsumme (SHA-256 mit geheimem Zusatz) darin; nach 30 Tagen löscht die Funktion alte Zeilen.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

-- 1. Schalter
alter table public.showcases add column if not exists friend_requests boolean not null default true;
grant update (friend_requests) on public.showcases to authenticated;

-- 2. Knopf zeigen? Nur bei sichtbarem Schaufenster mit eingeschaltetem Schalter
create or replace function public.showcase_accepts_friends(p_showcase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select s.friend_requests
       and (s.visibility = 'public' or public.can_see_showcase(s.id))
       and public.showcase_online(s.id)
      from public.showcases s where s.id = p_showcase
  ), false);
$$;
revoke all on function public.showcase_accepts_friends(uuid) from public;
grant execute on function public.showcase_accepts_friends(uuid) to anon, authenticated;

-- 3. Anfrage an die Gründer:in. Antwort: 'sent' (Anfrage verschickt oder schon offen), 'friends' (schon befreundet
--    oder ihre offene Anfrage an mich jetzt angenommen), 'own' (eigenes Schaufenster)
create or replace function public.request_showcase_friend(p_showcase uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_founder uuid;
  v_row public.friendships%rowtype;
begin
  if v_me is null then
    raise exception 'Melde Dich zuerst an.' using errcode = 'P0001', hint = 'not_signed_in';
  end if;
  if not public.showcase_accepts_friends(p_showcase) then
    raise exception 'Über dieses Schaufenster gehen keine Freundschaftsanfragen.' using errcode = 'P0001', hint = 'friends_off';
  end if;
  select g.founder_id into v_founder
    from public.showcases s join public.groups g on g.id = s.group_id
   where s.id = p_showcase;
  if v_founder is null then
    raise exception 'Über dieses Schaufenster gehen keine Freundschaftsanfragen.' using errcode = 'P0001', hint = 'friends_off';
  end if;
  if v_founder = v_me then
    return 'own';
  end if;
  if exists (
    select 1 from public.blocks b
     where (b.blocker_id = v_founder and b.blocked_id = v_me)
        or (b.blocker_id = v_me and b.blocked_id = v_founder)
  ) then
    raise exception 'Diese Anfrage kannst Du nicht schicken.' using errcode = 'P0001', hint = 'friends_blocked';
  end if;

  select * into v_row from public.friendships f
   where (f.requester_id = v_me and f.addressee_id = v_founder)
      or (f.requester_id = v_founder and f.addressee_id = v_me);
  if not found then
    insert into public.friendships (requester_id, addressee_id) values (v_me, v_founder);
    return 'sent';
  end if;
  if v_row.status = 'accepted' then
    return 'friends';
  end if;
  if v_row.requester_id = v_founder then
    -- Sie hatte schon gefragt: Wer ihre Karte scannt und „anfreunden“ tippt, nimmt an
    update public.friendships set status = 'accepted', accepted_at = now()
     where requester_id = v_founder and addressee_id = v_me;
    return 'friends';
  end if;
  return 'sent';
end;
$$;
revoke all on function public.request_showcase_friend(uuid) from public, anon;
grant execute on function public.request_showcase_friend(uuid) to authenticated;

-- 4. Protokoll für die Begrenzung des Mailversands (nur die Edge Function schreibt und liest, mit dem Service-Schlüssel)
create table if not exists public.showcase_card_mails (
  id bigint generated always as identity primary key,
  showcase_id uuid not null references public.showcases (id) on delete cascade,
  device_hash text not null,
  recipient_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists showcase_card_mails_device_idx on public.showcase_card_mails (device_hash, created_at);
create index if not exists showcase_card_mails_recipient_idx on public.showcase_card_mails (recipient_hash, created_at);
create index if not exists showcase_card_mails_showcase_idx on public.showcase_card_mails (showcase_id, created_at);
alter table public.showcase_card_mails enable row level security;
revoke all on public.showcase_card_mails from anon, authenticated;
