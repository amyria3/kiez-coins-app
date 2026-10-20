-- Gruppen mit Edensteinen (Konzept: Documentation, kiez-coins, Gruppen).
--
-- * Eine Gruppe hat 2 bis 13 Mitglieder (beim Gründen zunächst 1). Eine Person ist in höchstens 10 Gruppen.
-- * Beitreten per Einladungscode (6 Zeichen) über join_group. Gruppen brauchen keinen Kiez.
-- * Gruppenaufgaben sehen nur Mitglieder. Statt Euro gibt es 1 bis 10 Edensteine, ohne Zahlungsschritt.
-- * Den Bestand an Edensteinen rechnet die App aus den bestätigten Gruppenaufgaben (status confirmed).
-- * Gründerin: Mitglieder entfernen, Rolle übertragen. Sie verlässt die Gruppe erst nach dem Übertragen,
--   außer sie ist allein. Dann verschwindet die Gruppe samt Aufgaben.

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  founder_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('founder', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

alter table public.challenges
  add column group_id uuid references public.groups (id) on delete cascade,
  add column edensteine integer;
create index challenges_group_idx on public.challenges (group_id, created_at desc);

-- Gruppenaufgabe: Edensteine statt Bounty. Kiez-Challenge: keine Edensteine.
alter table public.challenges add constraint challenges_group_reward check (
  (group_id is null and edensteine is null)
  or (group_id is not null and edensteine between 1 and 10 and bounty_amount is null and type = 'individual')
);

-- Gruppenaufgaben brauchen keinen Ort.
alter table public.challenges drop constraint challenges_location_check;
alter table public.challenges add constraint challenges_location_check check (
  char_length(btrim(location)) <= 120
  and (status = 'draft' or group_id is not null or char_length(btrim(location)) >= 1)
);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

-- Ist die angemeldete Person Mitglied? security definer, damit die Regeln sich nicht gegenseitig aufrufen.
create function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m where m.group_id = p_group_id and m.user_id = (select auth.uid())
  );
$$;

create function public.group_error(p_message text, p_hint text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_message using errcode = 'P0001', hint = p_hint;
end;
$$;

-- Darf die Person Gruppen gründen oder beitreten? Deckname gesetzt, nicht gesperrt, unter 10 Gruppen.
create function public.check_group_slot()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.handle is not null and p.banned_at is null
  ) then
    perform public.group_error('Leg zuerst Deinen Decknamen fest.', 'handle_required');
  end if;
  if (select count(*) from public.group_members m where m.user_id = auth.uid()) >= 10 then
    perform public.group_error('Du bist schon in 10 Gruppen. Mehr geht nicht.', 'too_many_groups');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
-- Schreiben nur über die Funktionen unten
revoke insert, update, delete on public.groups, public.group_members from authenticated;

create policy "Eigene Gruppen lesen" on public.groups for select to authenticated
  using ((select public.is_group_member(id)));
create policy "Mitglieder eigener Gruppen lesen" on public.group_members for select to authenticated
  using ((select public.is_group_member(group_id)));

-- Challenges: Gruppenaufgaben nur für Mitglieder.
alter policy "Challenges lesen" on public.challenges
  using (
    (status <> 'draft' or author_id = (select auth.uid()))
    and (group_id is null or (select public.is_group_member(group_id)))
  );

-- Kiez-Challenges wie bisher, aber ohne Gruppe (Stand 20261020000200 plus group_id is null).
alter policy "Challenge erstellen" on public.challenges
  with check (
    author_id = (select auth.uid())
    and group_id is null
    and type = 'individual'
    and assignee_id is null
    and accepted_at is null
    and reported_at is null
    and confirmed_at is null
    and paid_marked_at is null
    and paid_at is null
    and closed_at is null
    and report_photo_path is null
    and (status = 'draft' or (status = 'open' and deadline > now()))
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
    and (select public.is_active_member())
    and (
      bounty_amount is null
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.can_offer_bounties)
    )
  );

-- Gruppenaufgabe: direkt veröffentlicht, nur für Mitglieder, kein Kiez nötig.
create policy "Gruppenaufgabe erstellen" on public.challenges for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and group_id is not null
    and (select public.is_group_member(group_id))
    and type = 'individual'
    and status = 'open'
    and deadline > now()
    and bounty_amount is null
    and edensteine between 1 and 10
    and assignee_id is null
    and accepted_at is null
    and reported_at is null
    and confirmed_at is null
    and closed_at is null
    and report_photo_path is null
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );

-- Kommentare: nur lesen, wer die Challenge sehen darf (die Abfrage auf challenges prüft deren Regel).
alter policy "Kommentare lesen" on public.comments
  using (exists (select 1 from public.challenges c where c.id = challenge_id));

-- Kommentieren: Kiez-Challenges mit Kiez, Gruppenaufgaben als Mitglied.
alter policy "Kommentar schreiben" on public.comments
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_id
        and c.status not in ('draft', 'closed')
        and (c.group_id is not null or (select public.is_active_member()))
    )
  );

-- ---------------------------------------------------------------------------
-- Annehmen: Gruppenaufgaben nur für Mitglieder, ohne Kiez
-- ---------------------------------------------------------------------------

create or replace function public.accept_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
begin
  select c.group_id into v_group from public.challenges c where c.id = p_challenge_id;
  if v_group is not null then
    if not public.is_group_member(v_group) then
      perform public.challenge_not_changed('angenommen werden');
    end if;
  elsif not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;
  update public.challenges
     set status = 'accepted', assignee_id = auth.uid(), accepted_at = now(), rejection_reason = null
   where id = p_challenge_id and status = 'open' and author_id <> auth.uid() and deadline > now();
  if not found then perform public.challenge_not_changed('angenommen werden'); end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gruppen-Funktionen
-- ---------------------------------------------------------------------------

-- Gruppe gründen. Gibt die id zurück. Der Code hat 6 Zeichen ohne verwechselbare (0, O, 1, I, L).
create function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 40 then
    perform public.group_error('Gib der Gruppe einen Namen mit höchstens 40 Zeichen.', 'name_invalid');
  end if;
  perform public.check_group_slot();
  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from public.groups g where g.invite_code = v_code);
  end loop;
  insert into public.groups (name, founder_id, invite_code)
  values (btrim(p_name), auth.uid(), v_code)
  returning id into v_id;
  insert into public.group_members (group_id, user_id, role) values (v_id, auth.uid(), 'founder');
  return v_id;
end;
$$;

-- Mit Code beitreten. Gibt die id der Gruppe zurück.
create function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select g.id into v_id from public.groups g where g.invite_code = upper(btrim(p_code));
  if v_id is null then
    perform public.group_error('Diesen Code gibt es nicht. Prüf ihn noch einmal.', 'code_unknown');
  end if;
  if exists (select 1 from public.group_members m where m.group_id = v_id and m.user_id = auth.uid()) then
    return v_id;
  end if;
  perform public.check_group_slot();
  -- Sperre gegen gleichzeitiges Beitreten über die Grenze von 13
  perform 1 from public.groups g where g.id = v_id for update;
  if (select count(*) from public.group_members m where m.group_id = v_id) >= 13 then
    perform public.group_error('Die Gruppe ist voll. Mehr als 13 Mitglieder geht nicht.', 'group_full');
  end if;
  insert into public.group_members (group_id, user_id) values (v_id, auth.uid());
  return v_id;
end;
$$;

-- Gruppe verlassen. Die Gründerin überträgt vorher ihre Rolle, außer sie ist allein.
create function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select m.role into v_role from public.group_members m where m.group_id = p_group_id and m.user_id = auth.uid();
  if v_role is null then
    perform public.group_error('Du bist nicht in dieser Gruppe.', 'not_member');
  end if;
  if v_role = 'founder' then
    if exists (select 1 from public.group_members m where m.group_id = p_group_id and m.user_id <> auth.uid()) then
      perform public.group_error('Übertrag zuerst die Gründerrolle an ein anderes Mitglied.', 'founder_must_transfer');
    end if;
    delete from public.groups where id = p_group_id;
    return;
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = auth.uid();
end;
$$;

-- Mitglied entfernen (nur Gründerin).
create function public.remove_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.group_members m
     where m.group_id = p_group_id and m.user_id = auth.uid() and m.role = 'founder'
  ) or p_user_id = auth.uid() then
    perform public.group_error('Nur die Gründerin kann andere Mitglieder entfernen.', 'not_founder');
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = p_user_id;
end;
$$;

-- Gründerrolle übertragen (nur Gründerin, an ein Mitglied).
create function public.transfer_group_founder(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.group_members m
     where m.group_id = p_group_id and m.user_id = auth.uid() and m.role = 'founder'
  ) then
    perform public.group_error('Nur die Gründerin kann ihre Rolle übertragen.', 'not_founder');
  end if;
  if p_user_id = auth.uid()
     or not exists (select 1 from public.group_members m where m.group_id = p_group_id and m.user_id = p_user_id) then
    perform public.group_error('Diese Person ist nicht in der Gruppe.', 'not_member');
  end if;
  update public.group_members set role = 'member' where group_id = p_group_id and user_id = auth.uid();
  update public.group_members set role = 'founder' where group_id = p_group_id and user_id = p_user_id;
  update public.groups set founder_id = p_user_id where id = p_group_id;
end;
$$;

revoke execute on function
  public.is_group_member(uuid),
  public.check_group_slot(),
  public.create_group(text),
  public.join_group(text),
  public.leave_group(uuid),
  public.remove_group_member(uuid, uuid),
  public.transfer_group_founder(uuid, uuid)
from public, anon;
grant execute on function
  public.is_group_member(uuid),
  public.create_group(text),
  public.join_group(text),
  public.leave_group(uuid),
  public.remove_group_member(uuid, uuid),
  public.transfer_group_founder(uuid, uuid)
to authenticated;
