-- Kommentare liken (Daria, 2026-11-08). Wie bei Posts: Alle, die den Kommentar sehen, sehen die Zahl und wer
-- geliked hat. Die Tabelle comment_likes bleibt privat (jede Person liest nur ihre eigenen Likes); Zahlen und
-- Personen gibt es nur über die Funktionen unten, und nur für Challenges, die die Person sehen darf.

create table public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index comment_likes_user_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;
revoke update on public.comment_likes from authenticated;

create policy "Eigene Kommentar-Likes lesen" on public.comment_likes for select to authenticated
  using (user_id = (select auth.uid()));
-- Liken nur, was man sehen darf: Die Abfrage auf comments prüft deren Regel (und damit die der Challenge).
create policy "Kommentar liken" on public.comment_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.comments c where c.id = comment_id)
  );
create policy "Kommentar-Like zurücknehmen" on public.comment_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Darf die angemeldete Person die Challenge sehen? Gleiche Regel wie die Policy „Challenges lesen“
-- (Migration 20261028000100).
create or replace function public.can_see_challenge(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenges c
     where c.id = p_challenge_id
       and (c.status not in ('draft', 'deleted') or c.author_id = (select auth.uid()))
       and (c.visibility = 'public' or c.author_id = (select auth.uid()))
       and (c.group_id is null or public.is_group_member(c.group_id))
  );
$$;

revoke execute on function public.can_see_challenge(uuid) from public, anon;
grant execute on function public.can_see_challenge(uuid) to authenticated;

-- Zahl der Likes je Kommentar und ob ich ihn geliked habe, für alle Kommentare der angegebenen Challenges.
-- Likes von Personen, die ich blockiert habe, zählen nicht mit (wie in der Liste).
create or replace function public.comment_like_counts(p_challenge_ids uuid[])
returns table (comment_id uuid, n integer, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select l.comment_id,
         count(*)::integer,
         bool_or(l.user_id = (select auth.uid()))
    from public.comment_likes l
    join public.comments k on k.id = l.comment_id
   where k.challenge_id = any (p_challenge_ids)
     and public.can_see_challenge(k.challenge_id)
     and not exists (
       select 1 from public.blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = l.user_id
     )
   group by l.comment_id;
$$;

revoke execute on function public.comment_like_counts(uuid[]) from public, anon;
grant execute on function public.comment_like_counts(uuid[]) to authenticated;

-- Wer einen Kommentar geliked hat, neueste zuerst, ohne Personen, die ich blockiert habe.
create or replace function public.comment_likers(p_comment_id uuid)
returns table (user_id uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.user_id, l.created_at
    from public.comment_likes l
    join public.comments k on k.id = l.comment_id
   where l.comment_id = p_comment_id
     and public.can_see_challenge(k.challenge_id)
     and not exists (
       select 1 from public.blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = l.user_id
     )
   order by l.created_at desc;
$$;

revoke execute on function public.comment_likers(uuid) from public, anon;
grant execute on function public.comment_likers(uuid) to authenticated;
