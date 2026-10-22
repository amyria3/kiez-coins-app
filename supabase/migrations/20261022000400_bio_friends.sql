-- Kurze Bio und Webseite im Profil, Freundschaftsanfragen.

-- 1. Bio und Webseite: lesen alle Angemeldeten (wie das übrige Profil), ändern nur die Person selbst.
alter table public.profiles
  add column if not exists bio text,
  add column if not exists website text;
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160);
alter table public.profiles drop constraint if exists profiles_website_format;
alter table public.profiles add constraint profiles_website_format
  check (website is null or (char_length(website) <= 200 and website ~* '^https?://[^\s]+\.[^\s]+$'));
grant update (bio, website) on public.profiles to authenticated;

-- 2. Freundschaften: eine Zeile je Anfrage. pending = angefragt, accepted = befreundet.
--    Annehmen darf nur die angefragte Person. Löschen dürfen beide (zurückziehen, ablehnen, Freundschaft beenden).
create table if not exists public.friendships (
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  constraint friendships_not_self check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
-- Je Paar nur eine Zeile, egal wer gefragt hat
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;
revoke all on public.friendships from anon;
grant select, insert, delete on public.friendships to authenticated;
grant update (status, accepted_at) on public.friendships to authenticated;

drop policy if exists "Eigene Freundschaften lesen" on public.friendships;
create policy "Eigene Freundschaften lesen" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Anfragen nur selbst, nur als pending und nicht an Personen, die blockieren oder blockiert sind
drop policy if exists "Freundschaft anfragen" on public.friendships;
create policy "Freundschaft anfragen" on public.friendships for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and not exists (
      select 1 from public.blocks b
       where (b.blocker_id = requester_id and b.blocked_id = addressee_id)
          or (b.blocker_id = addressee_id and b.blocked_id = requester_id)
    )
  );

drop policy if exists "Anfrage annehmen" on public.friendships;
create policy "Anfrage annehmen" on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

drop policy if exists "Freundschaft lösen" on public.friendships;
create policy "Freundschaft lösen" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Wer blockiert, beendet damit auch die Freundschaft
create or replace function public.end_friendship_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.friendships f
   where (f.requester_id = new.blocker_id and f.addressee_id = new.blocked_id)
      or (f.requester_id = new.blocked_id and f.addressee_id = new.blocker_id);
  return new;
end;
$$;
drop trigger if exists end_friendship_on_block on public.blocks;
create trigger end_friendship_on_block after insert on public.blocks
  for each row execute function public.end_friendship_on_block();
