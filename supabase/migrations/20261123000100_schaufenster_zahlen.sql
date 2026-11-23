-- Zahlen für die Zusammenfassung oben in der Schaufenster-Verwaltung (2026-11-23): Aufrufe der Seite, Aufrufe der
-- Visitenkarte, „In Kontakte speichern“ und erhaltene Kontakte, dazu Posts und neue Abonnent:innen.
--
-- Gezählt wird nur eine Zahl pro Schaufenster und Tag: keine Kennung, keine IP-Adresse, kein Cookie, nichts auf dem
-- Gerät. Die Webseite kiezcoins.de/s/… zählt per Skript im Browser (Bots und Linkvorschauen ohne JavaScript zählen
-- nicht, der Zwischenspeicher der Seite stört nicht), die vCard serverseitig, die App beim Öffnen. Das Team zählt bei
-- sich selbst nicht mit. Das Team sieht über showcase_summary die Summen der letzten 30 Tage.
-- Setzt 20261110000400_schaufenster und 20261110001600_schaufenster_schalter voraus.

create table if not exists public.showcase_stats_daily (
  showcase_id uuid not null references public.showcases (id) on delete cascade,
  day date not null,
  page_views integer not null default 0,
  card_views integer not null default 0,
  contact_saves integer not null default 0,
  contacts_received integer not null default 0,
  primary key (showcase_id, day)
);
alter table public.showcase_stats_daily enable row level security;
revoke all on public.showcase_stats_daily from anon, authenticated;

-- Zählen: p_kind 'page' (Seite), 'card' (Visitenkarte), 'save' (in Kontakte gespeichert), 'contact' (Kontakt erhalten).
-- Nur öffentliche Schaufenster, die online sind. Höchstens 5000 je Art und Tag, damit Spam die Zahl nicht beliebig hebt.
create or replace function public.count_showcase_visit(p_slug text, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_group uuid;
  v_day date := (now() at time zone 'Europe/Berlin')::date;
  v_cap constant integer := 5000;
begin
  if p_kind is null or p_kind not in ('page', 'card', 'save', 'contact') then
    return;
  end if;
  select s.id, s.group_id into v_id, v_group
    from public.showcases s
   where s.slug = lower(coalesce(p_slug, '')) and s.visibility = 'public';
  if v_id is null or not public.showcase_online(v_id) then
    return;
  end if;
  if (select auth.uid()) is not null
     and exists (select 1 from public.group_members m where m.group_id = v_group and m.user_id = (select auth.uid())) then
    return;
  end if;
  insert into public.showcase_stats_daily as t (showcase_id, day, page_views, card_views, contact_saves, contacts_received)
  values (v_id, v_day, (p_kind = 'page')::int, (p_kind = 'card')::int, (p_kind = 'save')::int, (p_kind = 'contact')::int)
  on conflict (showcase_id, day) do update set
    page_views = t.page_views + (p_kind = 'page' and t.page_views < v_cap)::int,
    card_views = t.card_views + (p_kind = 'card' and t.card_views < v_cap)::int,
    contact_saves = t.contact_saves + (p_kind = 'save' and t.contact_saves < v_cap)::int,
    contacts_received = t.contacts_received + (p_kind = 'contact' and t.contacts_received < v_cap)::int;
end;
$$;
revoke all on function public.count_showcase_visit(text, text) from public;
grant execute on function public.count_showcase_visit(text, text) to anon, authenticated;

-- Zusammenfassung fürs Team: Posts (ohne Entwürfe und gelöschte) mit dem Datum des letzten, Abonnent:innen gesamt und
-- neu in 30 Tagen, Summen der Tageszahlen der letzten 30 Tage (heute eingeschlossen).
create or replace function public.showcase_summary(p_showcase uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_group uuid;
  v_since date := (now() at time zone 'Europe/Berlin')::date - 29;
  v_result jsonb;
begin
  select s.group_id into v_group from public.showcases s where s.id = p_showcase;
  if v_group is null
     or not exists (select 1 from public.group_members m where m.group_id = v_group and m.user_id = (select auth.uid())) then
    raise exception 'Nur das Team sieht die Zahlen des Schaufensters' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'posts', (select count(*) from public.challenges c where c.showcase_id = p_showcase and c.status not in ('draft', 'deleted')),
    'last_post_at', (select max(c.created_at) from public.challenges c where c.showcase_id = p_showcase and c.status not in ('draft', 'deleted')),
    'followers', (select count(*) from public.showcase_follows f where f.showcase_id = p_showcase),
    'new_followers', (select count(*) from public.showcase_follows f where f.showcase_id = p_showcase and f.created_at >= now() - interval '30 days'),
    'page_views', coalesce((select sum(d.page_views) from public.showcase_stats_daily d where d.showcase_id = p_showcase and d.day >= v_since), 0),
    'card_views', coalesce((select sum(d.card_views) from public.showcase_stats_daily d where d.showcase_id = p_showcase and d.day >= v_since), 0),
    'contact_saves', coalesce((select sum(d.contact_saves) from public.showcase_stats_daily d where d.showcase_id = p_showcase and d.day >= v_since), 0),
    'contacts_received', coalesce((select sum(d.contacts_received) from public.showcase_stats_daily d where d.showcase_id = p_showcase and d.day >= v_since), 0)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.showcase_summary(uuid) from public;
grant execute on function public.showcase_summary(uuid) to authenticated;
