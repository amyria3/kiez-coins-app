-- Kommentare liken (Daria, 2026-11-09). Wie bei den Posts sehen alle, die den Kommentar sehen dürfen,
-- wer ihn geliked hat. Die Lesefreigabe hängt am Kommentar: Wer ihn lesen darf (Policy „Kommentare lesen“,
-- die wiederum an der Challenge hängt), liest auch seine Likes.
create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists comment_likes_user_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;
revoke update on public.comment_likes from authenticated;

drop policy if exists "Kommentar-Likes lesen" on public.comment_likes;
create policy "Kommentar-Likes lesen" on public.comment_likes for select to authenticated
  using (exists (select 1 from public.comments c where c.id = comment_id));

drop policy if exists "Kommentar liken" on public.comment_likes;
create policy "Kommentar liken" on public.comment_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_member())
    and exists (select 1 from public.comments c where c.id = comment_id)
  );

drop policy if exists "Kommentar-Like zurücknehmen" on public.comment_likes;
create policy "Kommentar-Like zurücknehmen" on public.comment_likes for delete to authenticated
  using (user_id = (select auth.uid()));
