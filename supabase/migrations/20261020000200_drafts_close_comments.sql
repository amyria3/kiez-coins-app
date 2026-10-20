-- Entwürfe, Schließen und Kommentare für alle.
--
-- * Entwurf (status draft): sieht nur die Ersteller:in. Titel, Ort und Frist dürfen noch fehlen.
--   Bearbeiten direkt in der Tabelle (nur Inhaltsspalten), Veröffentlichen über publish_challenge.
--   Ein Entwurf lässt sich löschen.
-- * Schließen (status closed): Die Ersteller:in beendet eine offene Challenge, die noch niemand
--   angenommen hat. Sie bleibt in der Timeline sichtbar, lässt sich aber nicht mehr annehmen,
--   bearbeiten oder kommentieren. Löschen ist nur noch für Entwürfe erlaubt.
-- * Kommentare: alle aktiven Personen unter jeder veröffentlichten Challenge, die nicht geschlossen ist.

-- ---------------------------------------------------------------------------
-- Spalten und Prüfungen
-- ---------------------------------------------------------------------------

alter table public.challenges add column closed_at timestamptz;

alter table public.challenges drop constraint challenges_status_check;
alter table public.challenges add constraint challenges_status_check check (
  status in ('draft', 'open', 'accepted', 'reported', 'confirmed', 'payment_open', 'paid_marked', 'paid', 'closed')
);

-- Ein Entwurf darf leer sein, alles andere braucht Titel, Ort und Frist.
alter table public.challenges drop constraint challenges_title_check;
alter table public.challenges add constraint challenges_title_check check (
  char_length(btrim(title)) <= 60 and (status = 'draft' or char_length(btrim(title)) >= 1)
);
alter table public.challenges drop constraint challenges_location_check;
alter table public.challenges add constraint challenges_location_check check (
  char_length(btrim(location)) <= 120 and (status = 'draft' or char_length(btrim(location)) >= 1)
);
alter table public.challenges alter column title set default '';
alter table public.challenges alter column location set default '';
alter table public.challenges alter column deadline drop not null;
alter table public.challenges add constraint challenges_deadline_required check (status = 'draft' or deadline is not null);

create index challenges_author_status_idx on public.challenges (author_id, status);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Entwürfe sieht nur die Ersteller:in.
alter policy "Challenges lesen" on public.challenges
  using (status <> 'draft' or author_id = (select auth.uid()));

-- Anlegen: veröffentlicht (open) wie bisher oder als Entwurf.
alter policy "Challenge erstellen" on public.challenges
  with check (
    author_id = (select auth.uid())
    and type = 'individual'
    and assignee_id is null
    and accepted_at is null
    and reported_at is null
    and confirmed_at is null
    and paid_marked_at is null
    and paid_at is null
    and closed_at is null
    and report_photo_path is null
    and (status = 'draft' or (status = 'open' and deadline > now()))
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
    and (select public.is_active_member())
    and (
      bounty_amount is null
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.can_offer_bounties)
    )
  );

-- Entwurf bearbeiten: nur Inhaltsspalten, Status bleibt draft.
grant update (title, body, location, bounty_amount, image_path) on public.challenges to authenticated;
create policy "Eigenen Entwurf bearbeiten" on public.challenges for update to authenticated
  using (author_id = (select auth.uid()) and status = 'draft')
  with check (
    author_id = (select auth.uid())
    and status = 'draft'
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
    and (
      bounty_amount is null
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.can_offer_bounties)
    )
  );

-- Löschen nur noch für Entwürfe. Veröffentlichte Challenges werden geschlossen.
alter policy "Offene eigene Challenge löschen" on public.challenges rename to "Eigenen Entwurf löschen";
alter policy "Eigenen Entwurf löschen" on public.challenges
  using (author_id = (select auth.uid()) and status = 'draft');

-- Kommentare: nur unter veröffentlichten Challenges, die nicht geschlossen sind.
alter policy "Kommentar schreiben" on public.comments
  with check (
    author_id = (select auth.uid())
    and (select public.is_active_member())
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.status not in ('draft', 'closed')
    )
  );

-- Likes: keine Entwürfe.
alter policy "Liken" on public.likes
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.status <> 'draft')
  );

-- ---------------------------------------------------------------------------
-- Funktionen
-- ---------------------------------------------------------------------------

-- Entwurf veröffentlichen. Prüft alles, was beim direkten Anlegen gilt. Die Challenge erscheint
-- mit dem Zeitpunkt der Veröffentlichung oben im Feed.
create function public.publish_challenge(p_challenge_id uuid, p_deadline timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.challenges;
begin
  select * into v from public.challenges
   where id = p_challenge_id and author_id = auth.uid() and status = 'draft';
  if not found then perform public.challenge_not_changed('veröffentlicht werden'); end if;

  if not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;
  if char_length(btrim(v.title)) = 0 then
    raise exception 'Bitte gib einen Titel ein.' using errcode = 'P0001', hint = 'title_required';
  end if;
  if char_length(btrim(v.location)) = 0 then
    raise exception 'Bitte gib einen Ort ein.' using errcode = 'P0001', hint = 'location_required';
  end if;
  if v.image_path is null then
    raise exception 'Bitte füge ein Foto hinzu.' using errcode = 'P0001', hint = 'photo_required';
  end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'Die Frist muss in der Zukunft liegen.' using errcode = 'P0001', hint = 'invalid_deadline';
  end if;
  if v.bounty_amount is not null
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set status = 'open', deadline = p_deadline, created_at = now()
   where id = p_challenge_id;
end;
$$;

-- Offene Challenge schließen, solange niemand sie angenommen hat. Sie bleibt in der Timeline.
create function public.close_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'closed', closed_at = now()
   where id = p_challenge_id and author_id = auth.uid() and status = 'open' and assignee_id is null;
  if not found then perform public.challenge_not_changed('geschlossen werden'); end if;
end;
$$;

revoke execute on function public.publish_challenge(uuid, timestamptz), public.close_challenge(uuid) from public, anon;
grant execute on function public.publish_challenge(uuid, timestamptz), public.close_challenge(uuid) to authenticated;
