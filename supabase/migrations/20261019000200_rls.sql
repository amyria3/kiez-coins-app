-- ---------------------------------------------------------------------------
-- Rechte und Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profile_settings enable row level security;
alter table public.payout_details enable row level security;
alter table public.challenges enable row level security;
alter table public.operation_names enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.payout_shares enable row level security;
alter table public.user_reports enable row level security;
alter table public.support_requests enable row level security;

-- Ohne Anmeldung gibt es keine Daten.
revoke all on all tables in schema public from anon;

-- profiles: lesen alle Angemeldeten; ändern nur Deckname, Bild und Kiez am eigenen Profil.
revoke insert, update, delete on public.profiles from authenticated;
grant update (handle, avatar_path, kiez) on public.profiles to authenticated;
create policy "Profile lesen" on public.profiles for select to authenticated using (true);
create policy "Eigenes Profil ändern" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- profile_settings: nur die eigene Zeile.
revoke insert, delete on public.profile_settings from authenticated;
create policy "Eigene Einstellungen lesen" on public.profile_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Eigene Einstellungen ändern" on public.profile_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- payout_details: nur die eigene Zeile.
create policy "Eigene Zahlungsdaten" on public.payout_details for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- challenges: lesen alle Angemeldeten. Anlegen nur offen, ohne Annehmende, als aktive Person.
-- Bounty nur, wenn die Person Bounties anbieten darf. Statuswechsel nur über Funktionen.
revoke update on public.challenges from authenticated;
create policy "Challenges lesen" on public.challenges for select to authenticated using (true);
create policy "Challenge erstellen" on public.challenges for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'open'
    and type = 'individual'
    and assignee_id is null
    and accepted_at is null
    and reported_at is null
    and confirmed_at is null
    and paid_marked_at is null
    and paid_at is null
    and report_photo_path is null
    and deadline > now()
    and (select public.is_active_member())
    and (
      bounty_amount is null
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.can_offer_bounties)
    )
  );
create policy "Offene eigene Challenge löschen" on public.challenges for delete to authenticated
  using (author_id = (select auth.uid()) and status = 'open');

-- operation_names: nur eigene, nur für Challenges, die man angenommen hat.
create policy "Eigene Operationsnamen lesen" on public.operation_names for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Operation taufen" on public.operation_names for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.assignee_id = (select auth.uid()))
  );
create policy "Operation umtaufen" on public.operation_names for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Operationsname löschen" on public.operation_names for delete to authenticated
  using (user_id = (select auth.uid()));

-- comments: lesen alle Angemeldeten, schreiben aktive Personen, löschen nur eigene.
revoke update on public.comments from authenticated;
create policy "Kommentare lesen" on public.comments for select to authenticated using (true);
create policy "Kommentar schreiben" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_active_member()));
create policy "Eigenen Kommentar löschen" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- likes: nur eigene.
revoke update on public.likes from authenticated;
create policy "Eigene Likes lesen" on public.likes for select to authenticated using (user_id = (select auth.uid()));
create policy "Liken" on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Like zurücknehmen" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

-- payout_shares: die annehmende Person verwaltet ihre Freigabe.
-- Die Ersteller:in sieht sie erst ab der Bestätigung (payment_open, paid_marked, paid).
create policy "Freigabe lesen" on public.payout_shares for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_id
        and c.author_id = (select auth.uid())
        and c.status in ('payment_open', 'paid_marked', 'paid')
    )
  );
create policy "Zahlungsdaten freigeben" on public.payout_shares for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.assignee_id = (select auth.uid()) and c.bounty_amount is not null
    )
  );
create policy "Freigabe ändern" on public.payout_shares for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Freigabe zurückziehen" on public.payout_shares for delete to authenticated
  using (user_id = (select auth.uid()));

-- user_reports und support_requests: nur anlegen und die eigenen lesen.
revoke update, delete on public.user_reports from authenticated;
create policy "Eigene Meldungen lesen" on public.user_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "Person melden" on public.user_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'new');

revoke update, delete on public.support_requests from authenticated;
create policy "Eigene Anfragen lesen" on public.support_requests for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Support anfragen" on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
