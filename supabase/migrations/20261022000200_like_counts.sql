-- Anzahl Likes je Challenge (Daria, 22.10.2026). Likes selbst bleiben privat (RLS „Eigene Likes lesen“),
-- die Funktion liefert nur die Summe, und nur für Challenges, die die Person sehen darf.
create or replace function public.like_counts(p_ids uuid[])
returns table (challenge_id uuid, n integer)
language sql
stable
security definer
set search_path = ''
as $$
  select l.challenge_id, count(*)::integer
    from public.likes l
   where l.challenge_id = any (p_ids)
     and exists (
       select 1 from public.challenges c
        where c.id = l.challenge_id
          and (c.group_id is null or public.is_group_member(c.group_id) or c.author_id = (select auth.uid()))
     )
   group by l.challenge_id;
$$;

revoke execute on function public.like_counts(uuid[]) from public, anon;
grant execute on function public.like_counts(uuid[]) to authenticated;
