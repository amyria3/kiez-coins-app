-- Coins für We-Challenges mit mehreren Personen (Daria, 28.10.2026).
--
-- * Coins (Euro) sind die Alternative zu Edensteinen, in jeder We-Challenge im Kiez. Gruppenaufgaben bleiben
--   bei Edensteinen (challenges_group_reward unverändert). In der App heißt der Umschalter
--   „Das ist mir bares Geld wert“.
-- * Mit Coins machen höchstens 10 Personen mit.
-- * Pro Platz mindestens 5 € und höchstens 50 €: bounty_amount liegt zwischen 5 × und 50 × max_participants.
--   Bei einer Person bleibt es bei 5 bis 50 € wie bisher.
-- * Der Betrag wird geteilt, unter allen, die beim Bestätigen dabei sind. Gerundet auf Cent, übrige Cent
--   gehen an die Ersten (20 € für 3 Personen: 6,67 €, 6,67 €, 6,66 €).
-- * Bestätigen je Person (Daria, 28.10.2026): Die Erstellerin wählt beim Bestätigen, wer mitgemacht hat. Alle sind
--   vorausgewählt, abgewählte Personen bekommen 'unconfirmed' und weder Coins noch Edensteine. Mindestens eine bleibt.
-- * Jede Person gibt ihre Zahlungsdaten frei und bestätigt den Empfang selbst. Die Erstellerin markiert je
--   Person als bezahlt. Die Challenge ist 'paid_marked', wenn alle markiert sind, und 'paid', wenn alle
--   den Empfang bestätigt haben.
--
-- Voraussetzung: 20261028000300_we_challenge_teilnehmende. Das Skript läuft auch ein zweites Mal ohne Fehler.

-- ---------------------------------------------------------------------------
-- 1. Regeln für Betrag und Personenzahl
-- ---------------------------------------------------------------------------

alter table public.challenges drop constraint if exists challenges_bounty_amount_check;
alter table public.challenges drop constraint if exists challenges_participants_reward;
alter table public.challenges add constraint challenges_participants_reward check (
  bounty_amount is null
  or (max_participants <= 10 and bounty_amount between 5 * max_participants and 50 * max_participants)
);

-- Höchstzahl setzen: wie 20261028000300, mit der neuen Regel für Coins
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
  if c.bounty_amount is not null and p_max > 10 then
    perform public.participant_error('Mit Coins machen höchstens 10 Personen mit.', 'coins_max_people');
  end if;
  if c.bounty_amount is not null and c.bounty_amount < 5 * p_max then
    perform public.participant_error('Mit Coins gibt es mindestens 5 € pro Person.', 'coins_min_per_person');
  end if;
  if c.bounty_amount is not null and c.bounty_amount > 50 * p_max then
    perform public.participant_error('Mit Coins gibt es höchstens 50 € pro Person.', 'coins_max_per_person');
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
-- 2. Zahlungsdaten: eine Freigabe je Person und Challenge
-- ---------------------------------------------------------------------------

alter table public.payout_shares drop constraint if exists payout_shares_pkey;
alter table public.payout_shares add constraint payout_shares_pkey primary key (challenge_id, user_id);

-- Freigeben dürfen alle, die dabei sind (bisher nur die annehmende Person)
alter policy "Zahlungsdaten freigeben" on public.payout_shares
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.challenges c
       where c.id = challenge_id and c.bounty_amount is not null
         and (
           c.assignee_id = (select auth.uid())
           or exists (
             select 1 from public.challenge_participants p
              where p.challenge_id = c.id and p.user_id = (select auth.uid()) and p.status = 'joined'
           )
         )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Auszahlung je Person
-- ---------------------------------------------------------------------------

create table if not exists public.challenge_payouts (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  paid_marked_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id),
  constraint challenge_payouts_order check (paid_at is null or paid_marked_at is not null)
);
create index if not exists challenge_payouts_user_idx on public.challenge_payouts (user_id);

alter table public.challenge_payouts enable row level security;
revoke all on public.challenge_payouts from anon;
revoke insert, update, delete on public.challenge_payouts from authenticated;
grant select on public.challenge_payouts to authenticated;

-- Lesen: die Person selbst und die Erstellerin. Schreiben nur über die Funktionen unten.
drop policy if exists "Auszahlung lesen" on public.challenge_payouts;
create policy "Auszahlung lesen" on public.challenge_payouts for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.author_id = (select auth.uid()))
  );

-- Bestehende Bounties mit Zahlungsschritt übernehmen: eine Person, voller Betrag
insert into public.challenge_payouts (challenge_id, user_id, amount_cents, paid_marked_at, paid_at, created_at)
select c.id, c.assignee_id, c.bounty_amount * 100,
       case when c.status in ('paid_marked', 'paid') then coalesce(c.paid_marked_at, now()) end,
       case when c.status = 'paid' then coalesce(c.paid_at, now()) end,
       coalesce(c.confirmed_at, now())
  from public.challenges c
 where c.bounty_amount is not null and c.assignee_id is not null
   and c.status in ('payment_open', 'paid_marked', 'paid')
on conflict (challenge_id, user_id) do nothing;

-- Status der Challenge aus den Auszahlungen: alle markiert → paid_marked, alle erhalten → paid
create or replace function public.challenge_sync_payment(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_marked integer;
  v_paid integer;
begin
  select count(*), count(paid_marked_at), count(paid_at) into v_total, v_marked, v_paid
    from public.challenge_payouts where challenge_id = p_challenge_id;
  if v_total = 0 then return; end if;
  update public.challenges
     set status = case when v_paid = v_total then 'paid' when v_marked = v_total then 'paid_marked' else 'payment_open' end,
         paid_marked_at = case when v_marked = v_total then coalesce(paid_marked_at, now()) end,
         paid_at = case when v_paid = v_total then coalesce(paid_at, now()) end
   where id = p_challenge_id and status in ('payment_open', 'paid_marked', 'paid');
end;
$$;

-- Neuer Teilnahme-Status 'unconfirmed': beim Bestätigen abgewählt
alter table public.challenge_participants drop constraint if exists challenge_participants_status_check;
alter table public.challenge_participants add constraint challenge_participants_status_check
  check (status in ('requested', 'joined', 'declined', 'removed', 'left', 'unconfirmed'));

-- Bestätigen: p_user_ids sind die Ausgewählten (ohne Angabe alle, die dabei sind). Abgewählte werden 'unconfirmed'.
-- Mit Coins entstehen die Auszahlungen, der Betrag geteilt unter den Ausgewählten.
drop function if exists public.confirm_challenge(uuid);
create or replace function public.confirm_challenge(p_challenge_id uuid, p_user_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges%rowtype;
  v_ids uuid[];
  v_n integer;
  v_base integer;
  v_rest integer;
  i integer;
begin
  select * into c from public.challenges
   where id = p_challenge_id and status = 'reported' and author_id = auth.uid()
   for update;
  if not found then perform public.challenge_not_changed('bestätigt werden'); end if;

  -- Auswahl: nur Personen, die dabei sind; mindestens eine
  if p_user_ids is not null then
    if not exists (
      select 1 from public.challenge_participants p
       where p.challenge_id = p_challenge_id and p.status = 'joined' and p.user_id = any (p_user_ids)
    ) then
      perform public.participant_error('Wähle mindestens eine Person aus.', 'confirm_none_selected');
    end if;
    update public.challenge_participants set status = 'unconfirmed'
     where challenge_id = p_challenge_id and status = 'joined' and not (user_id = any (p_user_ids));
  end if;

  if c.bounty_amount is null then
    update public.challenges set status = 'confirmed', confirmed_at = now(), rejection_reason = null
     where id = p_challenge_id;
    return;
  end if;

  -- Die erste Person zuerst, dann nach Beitritt
  select array_agg(x.user_id order by x.first desc, x.since) into v_ids
    from (
      select p.user_id, p.user_id = c.assignee_id as first, coalesce(p.joined_at, p.requested_at) as since
        from public.challenge_participants p
       where p.challenge_id = p_challenge_id and p.status = 'joined'
    ) x;
  if v_ids is null then v_ids := array[c.assignee_id]; end if;  -- alte Daten ohne Liste
  v_n := array_length(v_ids, 1);
  v_base := (c.bounty_amount * 100) / v_n;
  v_rest := (c.bounty_amount * 100) - v_base * v_n;

  delete from public.challenge_payouts where challenge_id = p_challenge_id;
  for i in 1 .. v_n loop
    insert into public.challenge_payouts (challenge_id, user_id, amount_cents)
    values (p_challenge_id, v_ids[i], v_base + case when i <= v_rest then 1 else 0 end);
  end loop;

  update public.challenges
     set status = 'payment_open', confirmed_at = now(), rejection_reason = null, paid_marked_at = null, paid_at = null
   where id = p_challenge_id;
end;
$$;

-- Rückgängig: nur solange noch niemand als bezahlt markiert ist
create or replace function public.undo_confirm_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.challenge_payouts where challenge_id = p_challenge_id and paid_marked_at is not null) then
    perform public.challenge_not_changed('zurückgesetzt werden');
  end if;
  update public.challenges
     set status = 'reported', confirmed_at = null
   where id = p_challenge_id and status in ('confirmed', 'payment_open') and author_id = auth.uid();
  if not found then perform public.challenge_not_changed('zurückgesetzt werden'); end if;
  delete from public.challenge_payouts where challenge_id = p_challenge_id;
  update public.challenge_participants set status = 'joined'
   where challenge_id = p_challenge_id and status = 'unconfirmed';
end;
$$;

-- Eine Person als bezahlt markieren (p_paid true) oder wieder als unbezahlt. Nur die Erstellerin.
create or replace function public.mark_participant_paid(p_challenge_id uuid, p_user_id uuid, p_paid boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.challenges c
   where c.id = p_challenge_id and c.author_id = auth.uid() and c.status in ('payment_open', 'paid_marked')
   for update;
  if not found then perform public.challenge_not_changed('als bezahlt markiert werden'); end if;
  update public.challenge_payouts
     set paid_marked_at = case when p_paid then coalesce(paid_marked_at, now()) end
   where challenge_id = p_challenge_id and user_id = p_user_id and paid_at is null;
  if not found then perform public.challenge_not_changed('als bezahlt markiert werden'); end if;
  perform public.challenge_sync_payment(p_challenge_id);
end;
$$;

-- Alle als bezahlt markieren (eine Person wie bisher; ältere App-Fassungen)
create or replace function public.mark_challenge_paid(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.challenges c
   where c.id = p_challenge_id and c.author_id = auth.uid() and c.status = 'payment_open'
   for update;
  if not found then perform public.challenge_not_changed('als bezahlt markiert werden'); end if;
  update public.challenge_payouts set paid_marked_at = now()
   where challenge_id = p_challenge_id and paid_marked_at is null;
  perform public.challenge_sync_payment(p_challenge_id);
end;
$$;

-- Alle, die den Empfang noch nicht bestätigt haben, wieder als unbezahlt
create or replace function public.unmark_challenge_paid(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.challenges c
   where c.id = p_challenge_id and c.author_id = auth.uid() and c.status = 'paid_marked'
   for update;
  if not found then perform public.challenge_not_changed('als unbezahlt markiert werden'); end if;
  update public.challenge_payouts set paid_marked_at = null
   where challenge_id = p_challenge_id and paid_at is null;
  perform public.challenge_sync_payment(p_challenge_id);
end;
$$;

-- Empfang bestätigen: jede Person für sich
create or replace function public.confirm_bounty_received(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.challenges c
   where c.id = p_challenge_id and c.status in ('payment_open', 'paid_marked')
   for update;
  if not found then perform public.challenge_not_changed('als erhalten bestätigt werden'); end if;
  update public.challenge_payouts set paid_at = now()
   where challenge_id = p_challenge_id and user_id = auth.uid() and paid_marked_at is not null and paid_at is null;
  if not found then perform public.challenge_not_changed('als erhalten bestätigt werden'); end if;
  perform public.challenge_sync_payment(p_challenge_id);
end;
$$;

-- Offene Arbeit: dazu offene Auszahlungen, für Empfangende und Erstellerin
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
  )
  or exists (
    select 1 from public.challenge_payouts o
      join public.challenges c on c.id = o.challenge_id
     where o.paid_at is null
       and (o.user_id = (select auth.uid()) or c.author_id = (select auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------------
-- Rechte
-- ---------------------------------------------------------------------------

revoke execute on function public.challenge_sync_payment(uuid) from public, anon, authenticated;
revoke execute on function
  public.mark_participant_paid(uuid, uuid, boolean),
  public.confirm_challenge(uuid, uuid[])
from public, anon;
grant execute on function
  public.mark_participant_paid(uuid, uuid, boolean),
  public.confirm_challenge(uuid, uuid[]),
  public.undo_confirm_challenge(uuid),
  public.mark_challenge_paid(uuid),
  public.unmark_challenge_paid(uuid),
  public.confirm_bounty_received(uuid),
  public.set_challenge_participation(uuid, integer, text),
  public.has_open_work()
to authenticated;
