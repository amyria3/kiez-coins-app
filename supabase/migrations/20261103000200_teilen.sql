-- Öffentliche Seite für geteilte Posts (Daria, 03.11.2026).
--
-- Teilt eine Person ihren eigenen Post, bekommt er eine Seite kiezcoins.de/c/<id>, die man ohne Konto sieht.
-- Messenger und Netzwerke zeigen den Link als Vorschau mit Foto. So lernen Menschen ohne KiezCoins die App kennen.
--
-- * share_challenge(id): die Ersteller:in gibt ihren Post zum Teilen frei. Nur öffentliche Posts ohne Gruppe und
--   ohne 5-km-Grenze, nicht im Entwurf und nicht gelöscht. Fremde Posts bleiben ohne öffentliche Seite.
-- * shared_post(id, count): liefert einen freigegebenen Post für die Seite, auch ohne Anmeldung. Wird der Post
--   später privat, gelöscht oder die Person gesperrt, verschwindet die Seite. count = true zählt einen Besuch.
-- * challenge_shares, share_visits: Freigaben und Besuche, nur für Auswertungen per SQL.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

create table if not exists public.challenge_shares (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  shared_at timestamptz not null default now(),
  times integer not null default 1,
  primary key (challenge_id, user_id)
);
alter table public.challenge_shares enable row level security;
revoke all on public.challenge_shares from anon, authenticated;

create table if not exists public.share_visits (
  id bigint generated always as identity primary key,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  visited_at timestamptz not null default now()
);
create index if not exists share_visits_challenge_idx on public.share_visits (challenge_id);
alter table public.share_visits enable row level security;
revoke all on public.share_visits from anon, authenticated;

-- Darf dieser Post eine öffentliche Seite haben?
create or replace function public.can_have_share_page(c public.challenges)
returns boolean
language sql
stable
set search_path = ''
as $$
  select c.visibility = 'public' and c.group_id is null and not coalesce(c.local_only, false)
     and c.status not in ('draft', 'deleted')
     and not exists (select 1 from public.profiles p where p.id = c.author_id and p.banned_at is not null);
$$;
revoke execute on function public.can_have_share_page(public.challenges) from public, anon, authenticated;

create or replace function public.share_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges;
begin
  select * into c from public.challenges where id = p_challenge_id;
  if c.id is null or c.author_id <> auth.uid() or not public.can_have_share_page(c) then
    raise exception 'Dieser Post lässt sich nicht öffentlich teilen.' using errcode = 'P0001', hint = 'not_shareable';
  end if;
  insert into public.challenge_shares (challenge_id, user_id) values (c.id, c.author_id)
  on conflict (challenge_id, user_id) do update
    set shared_at = now(), times = public.challenge_shares.times + 1;
end;
$$;
revoke execute on function public.share_challenge(uuid) from public, anon;
grant execute on function public.share_challenge(uuid) to authenticated;

create or replace function public.shared_post(p_challenge_id uuid, p_count boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges;
  v_handle text;
begin
  select * into c from public.challenges where id = p_challenge_id;
  if c.id is null or not public.can_have_share_page(c)
     or not exists (select 1 from public.challenge_shares s where s.challenge_id = c.id and s.user_id = c.author_id) then
    return null;
  end if;
  select p.handle into v_handle from public.profiles p where p.id = c.author_id;
  if p_count then
    insert into public.share_visits (challenge_id) values (c.id);
  end if;
  return jsonb_build_object(
    'id', c.id,
    'type', c.type,
    'title', c.title,
    'body', c.body,
    'kiez', c.kiez,
    'handle', v_handle,
    'image_path', c.image_path,
    'image_before_path', c.image_before_path,
    'image_after_path', c.image_after_path,
    'created_at', c.created_at
  );
end;
$$;
revoke execute on function public.shared_post(uuid, boolean) from public;
grant execute on function public.shared_post(uuid, boolean) to anon, authenticated;
