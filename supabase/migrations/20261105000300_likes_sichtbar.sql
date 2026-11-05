-- Wer hat geliked (Daria, 2026-11-05): Alle, die einen Post sehen dürfen, sehen auch, wer ihn geliked hat.
-- Die Tabelle likes bleibt privat (RLS „Eigene Likes lesen“). Die Funktion liefert die Personen nur für
-- Challenges, die die Person sehen darf (gleiche Regel wie like_counts), ohne Personen, die sie blockiert hat.
create or replace function public.challenge_likers(p_challenge_id uuid)
returns table (user_id uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.user_id, l.created_at
    from public.likes l
    join public.challenges c on c.id = l.challenge_id
   where l.challenge_id = p_challenge_id
     and (c.group_id is null or public.is_group_member(c.group_id) or c.author_id = (select auth.uid()))
     and not exists (
       select 1 from public.blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = l.user_id
     )
   order by l.created_at desc;
$$;

revoke execute on function public.challenge_likers(uuid) from public, anon;
grant execute on function public.challenge_likers(uuid) to authenticated;
