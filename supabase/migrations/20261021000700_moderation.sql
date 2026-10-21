-- Blockieren, Melden, Lob und Moderation (Community-Regeln, Digital Services Act Art. 16).
--
-- * blocks: Wer blockiert, sieht die Person nicht mehr. Die blockierte Person kann
--   Challenges der blockierenden Person weder annehmen noch kommentieren (und umgekehrt).
-- * challenge_reports: Challenges melden (Fahne im Detail).
-- * user_reports: neue Gründe für Sexismus, Rassismus, Antisemitismus, Belästigung, Gewalt.
-- * praises: „Lob zollen“, einmal pro Person. Die Zahl liefert praise_count().
-- * moderators: Wer hier steht, sieht alle Meldungen und setzt ihren Status.
--   Eintragen nur im SQL-Editor: insert into public.moderators (user_id) values ('<id>');

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

create table public.moderators (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.moderators enable row level security;
revoke all on public.moderators from authenticated;

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moderators m where m.user_id = (select auth.uid()));
$$;
revoke execute on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

-- ---------------------------------------------------------------------------
-- Blockieren
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;
revoke update on public.blocks from authenticated;
create policy "Eigene Blockierungen lesen" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "Person blockieren" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "Blockierung aufheben" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

/** true, wenn eine der beiden Personen die andere blockiert hat. */
create function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- Kommentare: nicht unter Challenges von Personen, mit denen eine Blockierung besteht.
create function public.check_comment_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.challenges c
    where c.id = new.challenge_id and public.is_blocked_between(c.author_id, new.author_id)
  ) then
    raise exception 'Hier kannst Du nicht kommentieren.' using errcode = 'P0001', hint = 'blocked';
  end if;
  return new;
end;
$$;
create trigger comments_check_block before insert on public.comments
  for each row execute function public.check_comment_block();

-- Annehmen: nicht bei Personen, mit denen eine Blockierung besteht (greift auch in accept_challenge).
create function public.check_accept_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_id is not null
    and new.assignee_id is distinct from old.assignee_id
    and public.is_blocked_between(new.author_id, new.assignee_id) then
    raise exception 'Diese Challenge kannst Du nicht annehmen.' using errcode = 'P0001', hint = 'blocked';
  end if;
  return new;
end;
$$;
create trigger challenges_check_accept_block before update of assignee_id on public.challenges
  for each row execute function public.check_accept_block();

revoke execute on function public.check_comment_block(), public.check_accept_block() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Person melden: neue Gründe, Moderation liest und setzt den Status
-- ---------------------------------------------------------------------------

alter table public.user_reports drop constraint user_reports_reason_check;
alter table public.user_reports add constraint user_reports_reason_check check (
  reason in ('not_paid', 'abusive', 'discrimination', 'harassment', 'violence', 'spam', 'other')
);
alter table public.user_reports add column handled_at timestamptz;

grant update (status, handled_at) on public.user_reports to authenticated;
create policy "Moderation liest Meldungen" on public.user_reports for select to authenticated
  using ((select public.is_moderator()));
create policy "Moderation bearbeitet Meldungen" on public.user_reports for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- ---------------------------------------------------------------------------
-- Challenge melden
-- ---------------------------------------------------------------------------

create table public.challenge_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  reason text not null check (
    reason in ('discrimination', 'harassment', 'violence', 'dangerous', 'illegal', 'spam', 'other')
  ),
  description text check (char_length(description) <= 500),
  status text not null default 'new' check (status in ('new', 'confirmed', 'dismissed')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  unique (reporter_id, challenge_id)
);
create index challenge_reports_challenge_idx on public.challenge_reports (challenge_id);

alter table public.challenge_reports enable row level security;
revoke update, delete on public.challenge_reports from authenticated;
grant update (status, handled_at) on public.challenge_reports to authenticated;
create policy "Eigene Challenge-Meldungen lesen" on public.challenge_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_moderator()));
create policy "Challenge melden" on public.challenge_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'new'
    and not exists (
      select 1 from public.challenges c where c.id = challenge_id and c.author_id = (select auth.uid())
    )
  );
create policy "Moderation bearbeitet Challenge-Meldungen" on public.challenge_reports for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- ---------------------------------------------------------------------------
-- Lob zollen
-- ---------------------------------------------------------------------------

create table public.praises (
  giver_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (giver_id, receiver_id),
  constraint praises_not_self check (giver_id <> receiver_id)
);
create index praises_receiver_idx on public.praises (receiver_id);

alter table public.praises enable row level security;
revoke update on public.praises from authenticated;
create policy "Eigenes Lob lesen" on public.praises for select to authenticated
  using (giver_id = (select auth.uid()));
create policy "Lob zollen" on public.praises for insert to authenticated
  with check (giver_id = (select auth.uid()) and not public.is_blocked_between(giver_id, receiver_id));
create policy "Lob zurücknehmen" on public.praises for delete to authenticated
  using (giver_id = (select auth.uid()));

-- is_blocked_between braucht in der Regel oben das Ausführungsrecht der Rolle.
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

/** Anzahl Lob für eine Person. Wer gelobt hat, bleibt verborgen. */
create function public.praise_count(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.praises where receiver_id = p_user;
$$;
revoke execute on function public.praise_count(uuid) from public, anon;
grant execute on function public.praise_count(uuid) to authenticated;
