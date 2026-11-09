-- Me-Challenge gleich offen (Daria, 2026-11-09): „Vorher posten“ legt keinen Entwurf mehr an, sondern eine
-- offene Me-Challenge. Sie steht sofort im Feed (im gewählten Modus), mit Vorher-Foto und #vorher.
-- Fertig ist sie mit dem Nachher („Abschließen und posten“). Ohne Nachher schließt der Server sie ab:
-- mit Timer 48 h nach dem Timerstart, ohne Timer 7 Tage nach dem Vorher, auch ohne Nachher-Foto.
--
-- Offen und noch nicht fertig heißt: status = 'open' und finished_at is null. deadline ist der Zeitpunkt,
-- zu dem der Server abschließt.
-- Die App legt weiter zuerst einen Entwurf an (start_before_after), setzt die Sichtbarkeit und macht ihn dann
-- mit open_before_after offen. Ältere Entwürfe ohne diesen Schritt laufen wie bisher.
--
-- Voraussetzung: 20261023000300_before_after, 20261027000100_before_after_stop_timer.
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

-- Vor dieser Migration gepostete Me-Challenges gelten als fertig, auch falls finished_at fehlt.
-- Die Datumsgrenze schützt offene Me-Challenges, wenn das Skript später noch einmal läuft.
update public.challenges
   set finished_at = created_at
 where type = 'before_after' and status <> 'draft' and finished_at is null
   and created_at < timestamptz '2026-11-09 00:00:00+00';

create index if not exists challenges_before_after_open_idx
  on public.challenges (deadline)
  where type = 'before_after' and status = 'open' and finished_at is null;

-- Entwurf offen machen (direkt nach start_before_after)
create or replace function public.open_before_after(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.challenges c
     where c.id = p_challenge_id and c.group_id is not null and not public.is_group_member(c.group_id)
  ) then
    raise exception 'Du bist nicht mehr in dieser Gruppe.' using errcode = 'P0001', hint = 'not_group_member';
  end if;
  update public.challenges
     set status = 'open',
         title = case when btrim(title) = '' then 'Vorher-Nachher' else title end,
         location = case
           when group_id is null and btrim(location) = '' then coalesce(left(nullif(btrim(kiez), ''), 120), 'Kiez')
           else location end,
         body = left('#vorher' || coalesce(' ' || before_text, ''), 500),
         image_path = image_before_path,
         created_at = now(),
         deadline = case when timer_started_at is not null then timer_started_at + interval '48 hours'
                         else now() + interval '7 days' end
   where id = p_challenge_id and author_id = auth.uid() and status = 'draft' and type = 'before_after'
     and finished_at is null;
  if not found then perform public.challenge_not_changed('gepostet werden'); end if;
end;
$$;

-- Timer starten: auch bei offener Me-Challenge. Dann schließt der Server 48 h nach dem Start ab.
create or replace function public.start_before_after_timer(p_challenge_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_started timestamptz;
begin
  update public.challenges
     set timer_started_at = coalesce(timer_started_at, now()),
         deadline = case when status = 'open' then coalesce(timer_started_at, now()) + interval '48 hours'
                         else deadline end
   where id = p_challenge_id and author_id = auth.uid() and status in ('draft', 'open') and type = 'before_after'
     and finished_at is null
  returning timer_started_at into v_started;
  if not found then perform public.challenge_not_changed('gestartet werden'); end if;
  return v_started;
end;
$$;

-- Timer stoppen: bei offener Me-Challenge gilt wieder die Frist von 7 Tagen nach dem Vorher
create or replace function public.stop_before_after_timer(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set timer_started_at = null,
         deadline = case when status = 'open' then greatest(created_at + interval '7 days', now())
                         else deadline end
   where id = p_challenge_id and author_id = auth.uid() and status in ('draft', 'open') and type = 'before_after'
     and finished_at is null;
  if not found then perform public.challenge_not_changed('gestoppt werden'); end if;
end;
$$;

-- Ändern, solange die Me-Challenge nicht fertig ist. Offen: body zeigt weiter nur das Vorher.
create or replace function public.update_before_after(
  p_challenge_id uuid,
  p_title text default null,
  p_before_text text default null,
  p_after_text text default null,
  p_image_before_path text default null,
  p_image_after_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (p_image_before_path is not null and not public.before_after_own_path(p_image_before_path))
     or (p_image_after_path is not null and not public.before_after_own_path(p_image_after_path)) then
    raise exception 'Das Foto liegt nicht in Deinem Ordner.' using errcode = 'P0001', hint = 'invalid_image';
  end if;
  update public.challenges
     set title = coalesce(nullif(left(btrim(p_title), 60), ''), title),
         before_text = case when p_before_text is null then before_text else nullif(btrim(p_before_text), '') end,
         after_text = case when p_after_text is null then after_text else nullif(btrim(p_after_text), '') end,
         image_before_path = coalesce(p_image_before_path, image_before_path),
         image_after_path = coalesce(p_image_after_path, image_after_path),
         image_path = coalesce(p_image_before_path, image_before_path),
         body = case when status = 'open' then left('#vorher' || coalesce(' ' || case
                       when p_before_text is null then before_text else nullif(btrim(p_before_text), '') end, ''), 500)
                     else body end
   where id = p_challenge_id and author_id = auth.uid() and status in ('draft', 'open') and type = 'before_after'
     and finished_at is null;
  if not found then perform public.challenge_not_changed('bearbeitet werden'); end if;
end;
$$;

-- Abschließen, intern. Ein Entwurf bekommt beim Posten die aktuelle Zeit, eine offene Me-Challenge behält ihre.
create or replace function public.publish_before_after_row(p_challenge_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'open',
         title = case when btrim(title) = '' then 'Vorher-Nachher' else title end,
         location = case
           when group_id is null and btrim(location) = '' then coalesce(left(nullif(btrim(kiez), ''), 120), 'Kiez')
           else location end,
         body = left(concat_ws(E'\n',
           '#vorher' || coalesce(' ' || before_text, ''),
           case when image_after_path is not null or after_text is not null
                then '#nachher' || coalesce(' ' || after_text, '') end
         ), 500),
         image_path = coalesce(image_after_path, image_before_path),
         finished_at = case when timer_started_at is null then now()
                            else least(now(), timer_started_at + interval '48 hours') end,
         created_at = case when status = 'draft' then now() else created_at end,
         deadline = now()
   where id = p_challenge_id and status in ('draft', 'open') and type = 'before_after' and finished_at is null;
  return found;
end;
$$;

-- „Abschließen und posten“
create or replace function public.finish_before_after(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.challenges
     where id = p_challenge_id and author_id = auth.uid() and status in ('draft', 'open') and type = 'before_after'
       and finished_at is null
  ) then
    perform public.challenge_not_changed('gepostet werden');
  end if;
  if exists (
    select 1 from public.challenges c
     where c.id = p_challenge_id and c.group_id is not null and not public.is_group_member(c.group_id)
  ) then
    raise exception 'Du bist nicht mehr in dieser Gruppe.' using errcode = 'P0001', hint = 'not_group_member';
  end if;
  perform public.publish_before_after_row(p_challenge_id);
end;
$$;

-- Fällige abschließen: Entwürfe 48 h nach dem Timerstart, offene Me-Challenges ab ihrer Frist
create or replace function public.publish_due_before_after()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.challenges
     where type = 'before_after' and finished_at is null
       and ((status = 'draft' and timer_started_at <= now() - interval '48 hours')
         or (status = 'open' and deadline <= now()))
  loop
    if public.publish_before_after_row(v_id) then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.open_before_after(uuid) from public, anon;
grant execute on function public.open_before_after(uuid) to authenticated;
revoke execute on function
  public.publish_before_after_row(uuid),
  public.publish_due_before_after()
from public, anon, authenticated;
