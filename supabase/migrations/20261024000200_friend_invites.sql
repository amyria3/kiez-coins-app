-- Freundschaften per Einladung (Daria, 24.10.2026): Link, QR-Code oder Code.
-- Jede Person hat einen eigenen Einladungscode mit 7 Zeichen. Gruppencodes haben 6 Zeichen, so verwechselt
-- die App die beiden nicht. Wer den Code annimmt, ist sofort mit der einladenden Person befreundet:
-- Die Einladung gilt als Zustimmung beider Seiten. Die einladende Person sieht beim nächsten Öffnen der App
-- einen Hinweis.

-- 1. Ein Code je Person. Neu erzeugen macht den alten Code ungültig.
create table if not exists public.friend_invites (
  inviter_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{7}$'),
  created_at timestamptz not null default now()
);
alter table public.friend_invites enable row level security;
revoke all on public.friend_invites from anon, authenticated;
-- Zugriff nur über die Funktionen unten

-- 2. Hinweis an die einladende Person: false, bis sie ihn gesehen hat
alter table public.friendships
  add column if not exists via_invite boolean not null default false,
  add column if not exists requester_seen boolean not null default true;

-- 3. Eigenen Code holen, beim ersten Mal anlegen. p_renew = true erzeugt einen neuen Code.
create or replace function public.my_friend_invite(p_renew boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then
    raise exception 'Melde Dich zuerst an.' using errcode = 'P0001', hint = 'not_signed_in';
  end if;
  if not p_renew then
    select i.code into v_code from public.friend_invites i where i.inviter_id = auth.uid();
    if v_code is not null then return v_code; end if;
  end if;
  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      into v_code from generate_series(1, 7);
    exit when not exists (select 1 from public.friend_invites i where i.code = v_code);
  end loop;
  insert into public.friend_invites (inviter_id, code) values (auth.uid(), v_code)
  on conflict (inviter_id) do update set code = excluded.code, created_at = now();
  return v_code;
end;
$$;

-- 4. Einladung annehmen. Gibt die id der einladenden Person zurück.
--    Besteht schon eine offene Anfrage zwischen beiden, wird sie angenommen.
create or replace function public.accept_friend_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inviter uuid;
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Melde Dich zuerst an.' using errcode = 'P0001', hint = 'not_signed_in';
  end if;
  select i.inviter_id into v_inviter from public.friend_invites i where i.code = upper(btrim(p_code));
  if v_inviter is null then
    raise exception 'Diesen Einladungscode gibt es nicht mehr. Frage nach einem neuen.' using errcode = 'P0001', hint = 'invite_unknown';
  end if;
  if v_inviter = v_me then
    raise exception 'Das ist Dein eigener Einladungscode.' using errcode = 'P0001', hint = 'invite_own';
  end if;
  if exists (
    select 1 from public.blocks b
     where (b.blocker_id = v_inviter and b.blocked_id = v_me)
        or (b.blocker_id = v_me and b.blocked_id = v_inviter)
  ) then
    raise exception 'Diese Einladung kannst Du nicht annehmen.' using errcode = 'P0001', hint = 'invite_blocked';
  end if;

  update public.friendships f
     set status = 'accepted', accepted_at = coalesce(f.accepted_at, now())
   where (f.requester_id = v_inviter and f.addressee_id = v_me)
      or (f.requester_id = v_me and f.addressee_id = v_inviter);
  if not found then
    insert into public.friendships (requester_id, addressee_id, status, accepted_at, via_invite, requester_seen)
    values (v_inviter, v_me, 'accepted', now(), true, false);
  end if;
  return v_inviter;
end;
$$;

-- 5. Neue Freund:innen aus eigenen Einladungen: liefert ihre ids und markiert den Hinweis als gesehen.
create or replace function public.take_new_invite_friends()
returns setof uuid
language sql
security definer
set search_path = ''
as $$
  update public.friendships f
     set requester_seen = true
   where f.requester_id = auth.uid() and f.via_invite and not f.requester_seen
  returning f.addressee_id;
$$;

revoke all on function public.my_friend_invite(boolean) from public, anon;
revoke all on function public.accept_friend_invite(text) from public, anon;
revoke all on function public.take_new_invite_friends() from public, anon;
grant execute on function public.my_friend_invite(boolean) to authenticated;
grant execute on function public.accept_friend_invite(text) to authenticated;
grant execute on function public.take_new_invite_friends() to authenticated;
