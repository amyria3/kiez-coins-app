-- Offene Challenge löschen und wieder veröffentlichen.
--
-- * Löschen (status deleted): Die Ersteller:in nimmt eine offene Challenge, die noch niemand angenommen
--   hat, aus dem Feed. Nur sie sieht die Challenge noch, in „Deine Challenges“ als gelöscht.
-- * Wieder veröffentlichen: setzt die Challenge zurück auf open. Ist die Frist abgelaufen, gibt die App
--   eine neue Frist mit.
-- * Entwürfe lassen sich weiterhin endgültig löschen.
--
-- Ersetzt 20261020000600_delete_open_challenge.sql (endgültiges Löschen offener Challenges).
-- Läuft nach 20261021000100_groups.sql und übernimmt deren Regeln für Gruppenaufgaben.

-- ---------------------------------------------------------------------------
-- Spalten und Prüfungen
-- ---------------------------------------------------------------------------

alter table public.challenges add column deleted_at timestamptz;

alter table public.challenges drop constraint challenges_status_check;
alter table public.challenges add constraint challenges_status_check check (
  status in ('draft', 'open', 'accepted', 'reported', 'confirmed', 'payment_open', 'paid_marked', 'paid', 'closed', 'deleted')
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Entwürfe und gelöschte Challenges sieht nur die Ersteller:in. Gruppenaufgaben nur Mitglieder.
alter policy "Challenges lesen" on public.challenges
  using (
    (status not in ('draft', 'deleted') or author_id = (select auth.uid()))
    and (group_id is null or (select public.is_group_member(group_id)))
  );

-- Endgültig löschen nur Entwürfe. Die Policy heißt je nach Stand „Eigenen Entwurf löschen“ oder,
-- falls 20261020000600 schon lief, „Eigene Challenge löschen“.
drop policy if exists "Eigene Challenge löschen" on public.challenges;
drop policy if exists "Eigenen Entwurf löschen" on public.challenges;
create policy "Eigenen Entwurf löschen" on public.challenges for delete to authenticated
  using (author_id = (select auth.uid()) and status = 'draft');

-- Kommentare und Likes nicht unter gelöschten Challenges.
alter policy "Kommentar schreiben" on public.comments
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_id
        and c.status not in ('draft', 'closed', 'deleted')
        and (c.group_id is not null or (select public.is_active_member()))
    )
  );

alter policy "Liken" on public.likes
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.status not in ('draft', 'deleted'))
  );

-- ---------------------------------------------------------------------------
-- Funktionen
-- ---------------------------------------------------------------------------

-- Offene Challenge löschen, solange niemand sie angenommen hat.
create function public.delete_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'deleted', deleted_at = now()
   where id = p_challenge_id and author_id = auth.uid() and status = 'open' and assignee_id is null;
  if not found then perform public.challenge_not_changed('gelöscht werden'); end if;
end;
$$;

-- Gelöschte Challenge wieder veröffentlichen. Ohne neue Frist bleibt die alte, sie muss aber
-- in der Zukunft liegen.
create function public.restore_challenge(p_challenge_id uuid, p_deadline timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.challenges;
begin
  select * into v from public.challenges
   where id = p_challenge_id and author_id = auth.uid() and status = 'deleted';
  if not found then perform public.challenge_not_changed('wieder veröffentlicht werden'); end if;

  if v.group_id is null and not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;
  if coalesce(p_deadline, v.deadline) <= now() then
    raise exception 'Die Frist muss in der Zukunft liegen.' using errcode = 'P0001', hint = 'invalid_deadline';
  end if;
  if v.bounty_amount is not null
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_offer_bounties) then
    raise exception 'Du kannst gerade keine Bounties anbieten.' using errcode = 'P0001', hint = 'no_bounties';
  end if;

  update public.challenges
     set status = 'open', deleted_at = null, deadline = coalesce(p_deadline, v.deadline)
   where id = p_challenge_id;
end;
$$;

revoke execute on function public.delete_challenge(uuid), public.restore_challenge(uuid, timestamptz) from public, anon;
grant execute on function public.delete_challenge(uuid), public.restore_challenge(uuid, timestamptz) to authenticated;
