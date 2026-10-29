-- Modus „Überall“ (Daria, 29.10.2026). Plan und Entscheidungen: Übergabe/2026-10-29_offen_modus-ueberall.md
--
-- * Kiez zeigt nur Beiträge bis 5 km, Überall alle öffentlichen. Das filtert die App.
-- * Neue Spalte challenges.local_only: „Auf einen Umkreis von 5 km begrenzen“. Solche Beiträge erscheinen nicht
--   in „Überall“. Lesen bleibt erlaubt (Policy unverändert), damit ein Link zur Challenge weiter funktioniert.
-- * join_challenge: Wer weiter als 5 km vom Ort der Challenge entfernt ist oder keinen Standort mitschickt,
--   kann nur anfragen. Die Erstellerin nimmt an oder lehnt ab (wie join_mode 'approval').
--   Gemessen wird vom Standort, den die App mitschickt (auf rund 100 m gerundet), zum Punkt der Challenge.
--   Challenges ohne Punkt und Gruppenaufgaben bleiben wie bisher.
--
-- Voraussetzung: 20261028000300_we_challenge_teilnehmende. Das Skript läuft auch ein zweites Mal ohne Fehler.

alter table public.challenges add column if not exists local_only boolean not null default false;
-- Entwürfe dürfen den Schalter ändern (Spaltenrechte wie bei visibility)
grant update (local_only) on public.challenges to authenticated;

-- Entfernung in Metern zwischen zwei Punkten (Haversine, Erdradius 6371 km)
create or replace function public.distance_meters(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  ));
$$;

-- Alte Fassung mit nur einem Parameter ersetzen. Ältere App-Fassungen rufen join_challenge(p_challenge_id) auf
-- und landen dank der Vorgaben hier; ohne Standort fragen sie bei Challenges mit Punkt an.
drop function if exists public.join_challenge(uuid);

create or replace function public.join_challenge(
  p_challenge_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
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
  v_far boolean;
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

  -- Weiter als 5 km oder ohne Standort: nur auf Anfrage (Daria, 29.10.2026)
  v_far := c.group_id is null and c.lat is not null and c.lng is not null
    and (p_lat is null or p_lng is null or public.distance_meters(p_lat, p_lng, c.lat, c.lng) > 5000);

  select p.status into v_old from public.challenge_participants p
   where p.challenge_id = p_challenge_id and p.user_id = auth.uid();
  -- Schon dabei, oder Anfrage offen und es braucht weiter eine Zusage
  if v_old = 'joined' or (v_old = 'requested' and (c.join_mode = 'approval' or v_far)) then
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

  v_status := case when c.join_mode = 'approval' or v_far then 'requested' else 'joined' end;
  insert into public.challenge_participants (challenge_id, user_id, status, requested_at, joined_at)
  values (p_challenge_id, auth.uid(), v_status, now(), case when v_status = 'joined' then now() end)
  on conflict (challenge_id, user_id) do update
     set status = excluded.status, requested_at = excluded.requested_at, joined_at = excluded.joined_at;

  if v_status = 'joined' then perform public.challenge_sync_first(p_challenge_id); end if;
  return v_status;
end;
$$;

revoke execute on function public.join_challenge(uuid, double precision, double precision) from public, anon;
grant execute on function public.join_challenge(uuid, double precision, double precision) to authenticated;

-- accept_challenge ruft join_challenge wie bisher auf (ohne Standort)
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
