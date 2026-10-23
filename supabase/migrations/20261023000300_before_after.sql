-- Vorher-Nachher-Beiträge (Daria, 2026-10-23): type 'before_after'.
--
-- Ablauf in der App:
-- 1. Vorher-Foto, Überschrift und Vorher-Text speichern: start_before_after legt einen Entwurf an.
-- 2. Timer starten: start_before_after_timer setzt timer_started_at. Die Zeit läuft auf dem Server weiter,
--    auch wenn die App geschlossen ist.
-- 3. Nachher-Foto und Nachher-Text: update_before_after. Danach postet finish_before_after den Beitrag.
-- 4. Spätestens 48 h nach dem Timerstart postet pg_cron den Entwurf, auch ohne Nachher-Foto.
--
-- Fotos liegen in image_before_path und image_after_path (Spalten gibt es seit 20261019000100).
-- image_path zeigt nach dem Posten auf das Nachher-Foto, ohne Nachher auf das Vorher-Foto, damit
-- Vorschauen und ältere App-Stände ein Bild haben.
-- Texte stehen im Entwurf getrennt in before_text und after_text. Beim Posten setzt die Funktion
-- body aus „#vorher …“ und „#nachher …“ zusammen.
-- Keine Bounty, keine Edensteine, kein Annehmen. Geht öffentlich im Kiez und in Gruppen.
-- Gelöscht wird wie jeder Beitrag: Entwurf endgültig, gepostet über delete_challenge.
--
-- Voraussetzung: 20261022000100_photo_posts, 20261021000100_groups, 20261022000500_messages (pg_cron).
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

-- ---------------------------------------------------------------------------
-- Spalten und Prüfungen
-- ---------------------------------------------------------------------------

alter table public.challenges
  add column if not exists before_text text,
  add column if not exists after_text text,
  add column if not exists timer_started_at timestamptz,
  add column if not exists finished_at timestamptz;

-- Je Schritt höchstens 240 Zeichen, zusammen mit #vorher und #nachher passt das in body (500).
alter table public.challenges drop constraint if exists challenges_before_after_texts;
alter table public.challenges add constraint challenges_before_after_texts check (
  char_length(coalesce(before_text, '')) <= 240 and char_length(coalesce(after_text, '')) <= 240
);

do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.challenges'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%type%individual%'
       and conname <> 'challenges_group_reward'
  loop
    execute format('alter table public.challenges drop constraint %I', c);
  end loop;
end $$;
alter table public.challenges
  add constraint challenges_type_check check (type in ('individual', 'wave', 'photo', 'before_after'));

alter table public.challenges drop constraint if exists challenges_before_after_reward;
alter table public.challenges add constraint challenges_before_after_reward check (
  type <> 'before_after' or (bounty_amount is null and edensteine is null)
);

-- Gruppen: Aufgaben mit Edensteinen wie bisher, dazu Vorher-Nachher ohne Edensteine.
alter table public.challenges drop constraint if exists challenges_group_reward;
alter table public.challenges add constraint challenges_group_reward check (
  (group_id is null and edensteine is null)
  or (group_id is not null and edensteine between 1 and 10 and bounty_amount is null and type = 'individual')
  or (group_id is not null and type = 'before_after')
);

-- Für den Lauf, der fällige Entwürfe postet
create index if not exists challenges_before_after_due_idx
  on public.challenges (timer_started_at)
  where type = 'before_after' and status = 'draft';

-- ---------------------------------------------------------------------------
-- Annehmen nur bei echten Challenges (wie 20261022000100, plus before_after)
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
   where id = p_challenge_id and status = 'open' and author_id <> auth.uid() and deadline > now()
     and type not in ('photo', 'before_after');
  if not found then perform public.challenge_not_changed('angenommen werden'); end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funktionen
-- ---------------------------------------------------------------------------

-- Pfad im eigenen Ordner des Speichers „photos“
create or replace function public.before_after_own_path(p_path text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_path is not null and p_path like auth.uid()::text || '/%';
$$;

-- 1. Entwurf mit Vorher-Foto anlegen. p_group_id leer: öffentlich im Kiez.
create or replace function public.start_before_after(
  p_group_id uuid,
  p_title text,
  p_before_text text,
  p_image_before_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_image_before_path is null or btrim(p_image_before_path) = '' then
    raise exception 'Bitte füge ein Vorher-Foto hinzu.' using errcode = 'P0001', hint = 'photo_required';
  end if;
  if not public.before_after_own_path(p_image_before_path) then
    raise exception 'Das Foto liegt nicht in Deinem Ordner.' using errcode = 'P0001', hint = 'invalid_image';
  end if;
  if p_group_id is not null then
    if not public.is_group_member(p_group_id) then
      raise exception 'Du bist nicht in dieser Gruppe.' using errcode = 'P0001', hint = 'not_group_member';
    end if;
  elsif not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;

  insert into public.challenges
    (author_id, type, status, group_id, title, location, before_text, image_before_path, image_path)
  values
    (auth.uid(), 'before_after', 'draft', p_group_id, left(btrim(coalesce(p_title, '')), 60), '',
     nullif(btrim(coalesce(p_before_text, '')), ''), p_image_before_path, p_image_before_path)
  returning id into v_id;
  return v_id;
end;
$$;

-- 2. Timer starten. Ein zweiter Aufruf ändert nichts.
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
     set timer_started_at = coalesce(timer_started_at, now())
   where id = p_challenge_id and author_id = auth.uid() and status = 'draft' and type = 'before_after'
  returning timer_started_at into v_started;
  if not found then perform public.challenge_not_changed('gestartet werden'); end if;
  return v_started;
end;
$$;

-- 3. Entwurf ändern. null lässt einen Wert, wie er ist. '' leert einen Text.
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
     set title = coalesce(left(btrim(p_title), 60), title),
         before_text = case when p_before_text is null then before_text else nullif(btrim(p_before_text), '') end,
         after_text = case when p_after_text is null then after_text else nullif(btrim(p_after_text), '') end,
         image_before_path = coalesce(p_image_before_path, image_before_path),
         image_after_path = coalesce(p_image_after_path, image_after_path),
         image_path = coalesce(p_image_before_path, image_before_path)
   where id = p_challenge_id and author_id = auth.uid() and status = 'draft' and type = 'before_after';
  if not found then perform public.challenge_not_changed('bearbeitet werden'); end if;
end;
$$;

-- Posten, intern. Die Dauer endet beim Posten, höchstens 48 h nach dem Timerstart.
-- deadline braucht jeder veröffentlichte Beitrag; bei Vorher-Nachher hat sie keine Bedeutung.
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
         created_at = now(),
         deadline = now()
   where id = p_challenge_id and status = 'draft' and type = 'before_after';
  return found;
end;
$$;

-- 4. Beitrag posten (Knopf „Posten“)
create or replace function public.finish_before_after(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.challenges
     where id = p_challenge_id and author_id = auth.uid() and status = 'draft' and type = 'before_after'
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

-- Fällige Entwürfe posten: 48 h nach dem Timerstart, auch ohne Nachher-Foto
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
     where type = 'before_after' and status = 'draft'
       and timer_started_at <= now() - interval '48 hours'
  loop
    if public.publish_before_after_row(v_id) then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function
  public.before_after_own_path(text),
  public.start_before_after(uuid, text, text, text),
  public.start_before_after_timer(uuid),
  public.update_before_after(uuid, text, text, text, text, text),
  public.finish_before_after(uuid)
from public, anon;
grant execute on function
  public.before_after_own_path(text),
  public.start_before_after(uuid, text, text, text),
  public.start_before_after_timer(uuid),
  public.update_before_after(uuid, text, text, text, text, text),
  public.finish_before_after(uuid)
to authenticated;

-- Nur der Server postet ohne Prüfung
revoke execute on function
  public.publish_before_after_row(uuid),
  public.publish_due_before_after()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Alle 5 Minuten fällige Entwürfe posten
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'vorher_nachher_nach_48_stunden_posten') then
    perform cron.unschedule('vorher_nachher_nach_48_stunden_posten');
  end if;
  perform cron.schedule(
    'vorher_nachher_nach_48_stunden_posten',
    '*/5 * * * *',
    $job$select public.publish_due_before_after()$job$
  );
end;
$$;
