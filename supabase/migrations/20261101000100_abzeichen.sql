-- Abzeichen am Avatar (Daria, 2026-10-31). Konzept: Documentation, Entscheidungen, Abschnitt „Abzeichen“.
--
--   pionier    Fernrohr        die ersten 200 Personen (ohne Testkonten), die ersten 20 mit Nummer
--   lotse      Flaschenpost    ab 5 aktiven Einladungen
--   anfuehrer  Steuerrad       ab 5 aktiven Einladungen und mindestens 1 gegründeten Gruppe
--   seebaer    Anker           ab 50 Posts, höchstens 3 pro Tag zählen
--   macher     Seemannsknoten  ab 15 erledigten We-Challenges, selbst erstellt oder mitgemacht
--
-- Eine Einladung ist aktiv, sobald die eingeladene Person einen Post hat oder bei einer We-Challenge dabei ist.
-- Es zählen Einladungen per Freundes-Code (friendships.via_invite). Ein Abzeichen bleibt, auch wenn die
-- Bedingung später nicht mehr gilt.
--
-- Vergeben: Die App ruft check_my_badges() beim Start und nach dem Posten auf. Die Funktion trägt neue
-- Abzeichen ein und liefert alle eigenen samt Fortschritt. Am Ende dieser Datei läuft sie einmal für alle.

create table if not exists public.badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null check (badge in ('pionier', 'lotse', 'anfuehrer', 'seebaer', 'macher')),
  earned_at timestamptz not null default now(),
  -- Nur Pionier:in 1 bis 20
  number integer check (number between 1 and 20),
  -- Im Profil eingeblendet (Schalter im Konto)
  visible boolean not null default true,
  -- Am Avatar gezeigt; höchstens eins je Person
  selected boolean not null default false,
  -- Hinweis beim Erhalt gesehen
  seen boolean not null default false,
  primary key (user_id, badge)
);
create unique index if not exists badges_one_selected on public.badges (user_id) where selected;

alter table public.badges enable row level security;
revoke all on public.badges from anon, authenticated;
grant select on public.badges to authenticated;

drop policy if exists "Abzeichen lesen" on public.badges;
create policy "Abzeichen lesen" on public.badges for select to authenticated
  using (visible or user_id = (select auth.uid()));

-- Das Abzeichen am Avatar: das ausgewählte, sonst das zuletzt erhaltene; nur eingeblendete
create or replace view public.avatar_badges
with (security_invoker = true) as
select distinct on (user_id) user_id, badge, number
  from public.badges
 where visible
 order by user_id, selected desc, earned_at desc;
grant select on public.avatar_badges to authenticated;

-- Zahlen für die Bedingungen einer Person
create or replace function public.badge_progress(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with
  rang as (
    select r.n from (
      select p.id, row_number() over (order by p.created_at, p.id) as n
        from public.profiles p
       where not coalesce(p.is_test, false) and not p.is_group
    ) r where r.id = p_user
  ),
  posts as (
    select coalesce(sum(least(t.n, 3)), 0) as n from (
      select count(*) as n
        from public.challenges c
       where c.author_id = p_user and c.status not in ('draft', 'deleted')
       group by (c.created_at at time zone 'Europe/Berlin')::date
    ) t
  ),
  einladungen as (
    select count(*) as n
      from public.friendships f
     where f.requester_id = p_user and f.via_invite and f.status = 'accepted'
       and (
         exists (select 1 from public.challenges c where c.author_id = f.addressee_id and c.status not in ('draft', 'deleted'))
         or exists (select 1 from public.challenge_participants cp where cp.user_id = f.addressee_id and cp.status = 'joined')
       )
  ),
  gruppen as (
    select count(*) as n from public.groups g where g.founder_id = p_user
  ),
  erledigt as (
    select count(*) as n
      from public.challenges c
     where c.type = 'individual'
       and c.status in ('confirmed', 'payment_open', 'paid_marked', 'paid')
       and (
         c.author_id = p_user or c.assignee_id = p_user
         or exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = p_user and cp.status = 'joined')
       )
  )
  select jsonb_build_object(
    'rang', (select n from rang),
    'posts', (select n from posts),
    'einladungen', (select n from einladungen),
    'gruppen', (select n from gruppen),
    'erledigt', (select n from erledigt)
  );
$$;
revoke all on function public.badge_progress(uuid) from public, anon, authenticated;

-- Neue Abzeichen einer Person eintragen
create or replace function public.award_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb := public.badge_progress(p_user);
  v_rang integer := (v ->> 'rang')::integer;
begin
  if v_rang is not null and v_rang <= 200 then
    insert into public.badges (user_id, badge, number)
    values (p_user, 'pionier', case when v_rang <= 20 then v_rang end)
    on conflict do nothing;
  end if;
  if (v ->> 'einladungen')::integer >= 5 then
    insert into public.badges (user_id, badge) values (p_user, 'lotse') on conflict do nothing;
    if (v ->> 'gruppen')::integer >= 1 then
      insert into public.badges (user_id, badge) values (p_user, 'anfuehrer') on conflict do nothing;
    end if;
  end if;
  if (v ->> 'posts')::integer >= 50 then
    insert into public.badges (user_id, badge) values (p_user, 'seebaer') on conflict do nothing;
  end if;
  if (v ->> 'erledigt')::integer >= 15 then
    insert into public.badges (user_id, badge) values (p_user, 'macher') on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.award_badges(uuid) from public, anon, authenticated;

-- Für die App: eigene Abzeichen prüfen und mit Fortschritt zurückgeben
create or replace function public.check_my_badges()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return null;
  end if;
  perform public.award_badges(v_me);
  return jsonb_build_object(
    'progress', public.badge_progress(v_me),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'badge', b.badge, 'number', b.number, 'earnedAt', b.earned_at,
        'visible', b.visible, 'selected', b.selected, 'seen', b.seen
      ) order by b.earned_at)
        from public.badges b where b.user_id = v_me
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.check_my_badges() from public, anon;
grant execute on function public.check_my_badges() to authenticated;

-- Einblenden, Auswählen, als gesehen markieren
create or replace function public.set_badge(p_badge text, p_visible boolean default null, p_selected boolean default null, p_seen boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if not exists (select 1 from public.badges where user_id = v_me and badge = p_badge) then
    raise exception 'Dieses Abzeichen hast Du noch nicht.' using errcode = 'P0001';
  end if;
  if p_selected then
    update public.badges set selected = false where user_id = v_me and selected and badge <> p_badge;
  end if;
  update public.badges
     set visible = coalesce(p_visible, visible),
         selected = coalesce(p_selected, selected),
         seen = coalesce(p_seen, seen)
   where user_id = v_me and badge = p_badge;
end;
$$;
revoke all on function public.set_badge(text, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_badge(text, boolean, boolean, boolean) to authenticated;

-- Einmal für alle, die es schon gibt. Beim nächsten Öffnen der App sehen sie den Hinweis.
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.award_badges(r.id);
  end loop;
end;
$$;
