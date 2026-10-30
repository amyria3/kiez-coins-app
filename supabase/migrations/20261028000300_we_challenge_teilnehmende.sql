-- We-Challenge mit mehreren Personen (Daria, 27.10.2026). Plan: Übergabe/2026-10-27_offen_we-challenge-mehrere-personen.md
--
-- * Die Erstellerin legt eine Höchstzahl an Teilnehmenden fest (max_participants, Vorgabe 1 = bisheriger Ablauf).
--   Die App setzt keine feste Obergrenze; Gruppenaufgaben begrenzt die Größe der Gruppe.
-- * join_mode 'open': Jede Person, die die Challenge sieht, tritt direkt bei.
--   join_mode 'approval': Jede Person fragt an, auch die erste. Die Erstellerin nimmt an oder lehnt ab.
-- * Die Erstellerin schließt Teilnehmende aus, bis jemand erledigt meldet. Ab 'reported' ist die Liste fest.
-- * assignee_id bleibt die erste Person. Sie meldet erledigt, für alle. Steigt sie aus oder wird
--   ausgeschlossen, rückt die nächste nach. Ohne Teilnehmende ist die Challenge wieder 'open'.
-- * Mehrere Personen nur ohne Euro-Bounty. Jede Person bekommt die volle Zahl Edensteine (rechnet die App).
--
-- Voraussetzung: 20261028000200_kiez_edensteine. Das Skript läuft auch ein zweites Mal ohne Fehler.

-- ---------------------------------------------------------------------------
-- Spalten und Tabelle
-- ---------------------------------------------------------------------------

alter table public.challenges
  add column if not exists max_participants integer not null default 1,
  add column if not exists join_mode text not null default 'open';

alter table public.challenges drop constraint if exists challenges_max_participants;
alter table public.challenges add constraint challenges_max_participants check (max_participants >= 1);
alter table public.challenges drop constraint if exists challenges_join_mode;
alter table public.challenges add constraint challenges_join_mode check (join_mode in ('open', 'approval'));
-- Mehrere Personen: keine Euro-Bounty (Daria, 27.10.2026)
alter table public.challenges drop constraint if exists challenges_participants_reward;
alter table public.challenges add constraint challenges_participants_reward check (max_participants = 1 or bounty_amount is null);

create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- requested: wartet auf die Erstellerin; joined: dabei; declined: Anfrage abgelehnt;
  -- removed: ausgeschlossen; left: selbst ausgestiegen
  status text not null check (status in ('requested', 'joined', 'declined', 'removed', 'left')),
  requested_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (challenge_id, user_id)
);
create index if not exists challenge_participants_user_idx on public.challenge_participants (user_id);

-- Bisherige Annehmende als erste Teilnehmende übernehmen
insert into public.challenge_participants (challenge_id, user_id, status, requested_at, joined_at)
select c.id, c.assignee_id, 'joined', coalesce(c.accepted_at, c.created_at), coalesce(c.accepted_at, c.created_at)
  from public.challenges c
 where c.assignee_id is not null
on conflict (challenge_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Lesen: Wer dabei ist, sehen alle, die die Challenge sehen. Anfragen, Absagen und Ausschlüsse sehen nur
-- die Erstellerin und die betroffene Person. Schreiben nur über die Funktionen unten.
-- ---------------------------------------------------------------------------

alter table public.challenge_participants enable row level security;
revoke all on public.challenge_participants from anon;
revoke insert, update, delete on public.challenge_participants from authenticated;
grant select on public.challenge_participants to authenticated;

drop policy if exists "Teilnehmende lesen" on public.challenge_participants;
create policy "Teilnehmende lesen" on public.challenge_participants for select to authenticated
  using (
    exists (select 1 from public.challenges c where c.id = challenge_id)
    and (
      status = 'joined'
      or user_id = (select auth.uid())
      or exists (select 1 from public.challenges c where c.id = challenge_id and c.author_id = (select auth.uid()))
    )
  );

-- Operationsname: alle Teilnehmenden taufen für sich
alter policy "Operation taufen" on public.operation_names
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.challenge_participants p
       where p.challenge_id = operation_names.challenge_id and p.user_id = (select auth.uid()) and p.status = 'joined'
    )
  );

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function public.participant_error(p_message text, p_hint text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_message using errcode = 'P0001', hint = p_hint;
end;
$$;

-- Erste Person neu bestimmen: die am längsten dabei ist. Ohne Teilnehmende zurück auf 'open'.
-- Nur in 'open' und 'accepted'; ab 'reported' ist die Liste fest.
create or replace function public.challenge_sync_first(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first uuid;
  v_since timestamptz;
begin
  select p.user_id, p.joined_at into v_first, v_since
    from public.challenge_participants p
   where p.challenge_id = p_challenge_id and p.status = 'joined'
   order by p.joined_at, p.requested_at
   limit 1;
  if v_first is null then
    update public.challenges
       set status = 'open', assignee_id = null, accepted_at = null, rejection_reason = null
     where id = p_challenge_id and status = 'accepted';
  else
    update public.challenges
       set status = 'accepted',
           accepted_at = case when assignee_id = v_first then accepted_at else coalesce(v_since, now()) end,
           assignee_id = v_first
     where id = p_challenge_id and status in ('open', 'accepted');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Beitreten, Anfragen beantworten, Ausschließen, Aussteigen
-- ---------------------------------------------------------------------------

-- Beitreten bzw. anfragen. Gibt 'joined' oder 'requested' zurück.
create or replace function public.join_challenge(p_challenge_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges%rowtype;
  v_old text;
  v_joined integer;
  v_status text;
begin
  -- Sperre gegen gleichzeitiges Beitreten über die Höchstzahl (wie join_group)
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found then perform public.challenge_not_changed('angenommen werden'); end if;

  if c.group_id is not null then
    if not public.is_group_member(c.group_id) then perform public.challenge_not_changed('angenommen werden'); end if;
  elsif not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;

  if c.author_id = auth.uid() or c.type <> 'individual' or c.status not in ('open', 'accepted')
     or c.deadline <= now() or c.visibility <> 'public' then
    perform public.challenge_not_changed('angenommen werden');
  end if;

  select p.status into v_old from public.challenge_participants p
   where p.challenge_id = p_challenge_id and p.user_id = auth.uid();
  -- Schon dabei, oder Anfrage offen und es braucht weiter eine Zusage
  if v_old = 'joined' or (v_old = 'requested' and c.join_mode = 'approval') then
    return v_old;
  end if;
  if v_old = 'removed' then
    perform public.participant_error('Du bist bei dieser Challenge nicht mehr dabei.', 'participant_removed');
  end if;
  if v_old = 'declined' then
    perform public.participant_error('Deine Anfrage wurde schon abgelehnt.', 'request_declined');
  end if;

  select count(*) into v_joined from public.challenge_participants p
   where p.challenge_id = p_challenge_id and p.status = 'joined';
  if v_joined >= c.max_participants then
    perform public.participant_error('Alle Plätze sind vergeben.', 'challenge_full');
  end if;

  v_status := case when c.join_mode = 'approval' then 'requested' else 'joined' end;
  insert into public.challenge_participants (challenge_id, user_id, status, requested_at, joined_at)
  values (p_challenge_id, auth.uid(), v_status, now(), case when v_status = 'joined' then now() end)
  on conflict (challenge_id, user_id) do update
     set status = excluded.status, requested_at = excluded.requested_at, joined_at = excluded.joined_at;

  if v_status = 'joined' then perform public.challenge_sync_first(p_challenge_id); end if;
  return v_status;
end;
$$;

-- Annehmen wie bisher: ältere App-Fassungen rufen accept_challenge auf
create or replace function public.accept_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.join_challenge(p_challenge_id);
end;
$$;

-- Anfrage annehmen (p_accept true) oder ablehnen. Nur die Erstellerin.
create or replace function public.answer_join_request(p_challenge_id uuid, p_user_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges%rowtype;
  v_joined integer;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or c.author_id <> auth.uid() or c.status not in ('open', 'accepted') then
    perform public.challenge_not_changed('beantwortet werden');
  end if;
  if not exists (
    select 1 from public.challenge_participants p
     where p.challenge_id = p_challenge_id and p.user_id = p_user_id and p.status = 'requested'
  ) then
    perform public.challenge_not_changed('beantwortet werden');
  end if;

  if not p_accept then
    update public.challenge_participants set status = 'declined'
     where challenge_id = p_challenge_id and user_id = p_user_id;
    return;
  end if;

  select count(*) into v_joined from public.challenge_participants p
   where p.challenge_id = p_challenge_id and p.status = 'joined';
  if v_joined >= c.max_participants then
    perform public.participant_error('Alle Plätze sind vergeben. Erhöhe zuerst die Zahl der Teilnehmenden.', 'challenge_full');
  end if;
  update public.challenge_participants set status = 'joined', joined_at = now()
   where challenge_id = p_challenge_id and user_id = p_user_id;
  perform public.challenge_sync_first(p_challenge_id);
end;
$$;

-- Teilnehmende oder Anfragende ausschließen. Nur die Erstellerin, nur bis jemand erledigt meldet.
create or replace function public.remove_participant(p_challenge_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.challenges c
   where c.id = p_challenge_id and c.author_id = auth.uid() and c.status in ('open', 'accepted')
   for update;
  if not found then perform public.challenge_not_changed('geändert werden'); end if;
  update public.challenge_participants set status = 'removed'
   where challenge_id = p_challenge_id and user_id = p_user_id and status in ('joined', 'requested');
  if not found then perform public.challenge_not_changed('geändert werden'); end if;
  delete from public.operation_names where challenge_id = p_challenge_id and user_id = p_user_id;
  delete from public.payout_shares where challenge_id = p_challenge_id and user_id = p_user_id;
  perform public.challenge_sync_first(p_challenge_id);
end;
$$;

-- Selbst aussteigen oder die Anfrage zurückziehen. Nur bis jemand erledigt meldet.
create or replace function public.leave_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.challenges c where c.id = p_challenge_id and c.status in ('open', 'accepted') for update;
  if not found then perform public.challenge_not_changed('abgegeben werden'); end if;
  update public.challenge_participants set status = 'left'
   where challenge_id = p_challenge_id and user_id = auth.uid() and status in ('joined', 'requested');
  if not found then perform public.challenge_not_changed('abgegeben werden'); end if;
  delete from public.operation_names where challenge_id = p_challenge_id and user_id = auth.uid();
  delete from public.payout_shares where challenge_id = p_challenge_id and user_id = auth.uid();
  perform public.challenge_sync_first(p_challenge_id);
end;
$$;

-- Abgeben wie bisher: ältere App-Fassungen rufen give_back_challenge auf
create or replace function public.give_back_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.leave_challenge(p_challenge_id);
end;
$$;

-- Höchstzahl und Art des Beitretens setzen. Nur die Erstellerin, bis jemand erledigt meldet.
-- Die Höchstzahl sinkt nie unter die Zahl der Teilnehmenden.
create or replace function public.set_challenge_participation(p_challenge_id uuid, p_max integer, p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges%rowtype;
  v_joined integer;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or c.author_id <> auth.uid() or c.status not in ('draft', 'open', 'accepted', 'deleted')
     or c.type <> 'individual' then
    perform public.challenge_not_changed('geändert werden');
  end if;
  if p_max is null or p_max < 1 or p_mode not in ('open', 'approval') then
    perform public.participant_error('Gib mindestens 1 Person an.', 'max_invalid');
  end if;
  if p_max > 1 and c.bounty_amount is not null then
    perform public.participant_error('Mit mehreren Personen gibt es Edensteine statt Coins.', 'no_bounty_for_many');
  end if;
  select count(*) into v_joined from public.challenge_participants p
   where p.challenge_id = p_challenge_id and p.status = 'joined';
  if p_max < v_joined then
    perform public.participant_error('Es sind schon mehr Personen dabei. Schließe zuerst jemanden aus.', 'max_below_joined');
  end if;
  update public.challenges set max_participants = p_max, join_mode = p_mode where id = p_challenge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Offene Arbeit: alle Teilnehmenden, nicht nur die erste Person
-- ---------------------------------------------------------------------------

create or replace function public.has_open_work()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenges c
    where (c.assignee_id = (select auth.uid()) and c.status in ('accepted', 'reported', 'payment_open', 'paid_marked'))
       or (c.author_id = (select auth.uid()) and c.status in ('reported', 'payment_open'))
       or (c.status in ('accepted', 'reported') and exists (
             select 1 from public.challenge_participants p
              where p.challenge_id = c.id and p.user_id = (select auth.uid()) and p.status = 'joined'))
  );
$$;

-- ---------------------------------------------------------------------------
-- Rechte
-- ---------------------------------------------------------------------------

revoke execute on function
  public.participant_error(text, text),
  public.challenge_sync_first(uuid)
from public, anon, authenticated;

revoke execute on function
  public.join_challenge(uuid),
  public.answer_join_request(uuid, uuid, boolean),
  public.remove_participant(uuid, uuid),
  public.leave_challenge(uuid),
  public.set_challenge_participation(uuid, integer, text)
from public, anon;
grant execute on function
  public.join_challenge(uuid),
  public.answer_join_request(uuid, uuid, boolean),
  public.remove_participant(uuid, uuid),
  public.leave_challenge(uuid),
  public.set_challenge_participation(uuid, integer, text),
  public.accept_challenge(uuid),
  public.give_back_challenge(uuid),
  public.has_open_work()
to authenticated;
