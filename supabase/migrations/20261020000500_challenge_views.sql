-- Aufrufe einer Challenge: pro Person höchstens einer, die eigenen zählen nicht.
-- Die Zahl sieht nur, wer die Challenge erstellt hat („Deine Challenges“).

create table public.challenge_views (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenge_views enable row level security;
revoke update, delete on public.challenge_views from authenticated;

create policy "Aufruf zählen" on public.challenge_views for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.challenges c where c.id = challenge_id and c.author_id = (select auth.uid())
    )
  );

create policy "Aufrufe eigener Challenges lesen" on public.challenge_views for select to authenticated
  using (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.author_id = (select auth.uid()))
  );
