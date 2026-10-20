-- ---------------------------------------------------------------------------
-- Statuswechsel einer Challenge
-- Ablauf: open → accepted → reported → confirmed (ohne Bounty) bzw. payment_open → paid_marked → paid.
-- Jede Funktion prüft Rolle und aktuellen Status und wirft sonst einen Fehler.
-- ---------------------------------------------------------------------------

create function public.challenge_not_changed(p_action text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Challenge kann gerade nicht %: Status oder Rolle passen nicht.', p_action
    using errcode = 'P0001', hint = 'invalid_transition';
end;
$$;

create function public.accept_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'Bitte leg zuerst Deinen Kiez fest.' using errcode = 'P0001', hint = 'not_active_member';
  end if;
  update public.challenges
     set status = 'accepted', assignee_id = auth.uid(), accepted_at = now(), rejection_reason = null
   where id = p_challenge_id and status = 'open' and author_id <> auth.uid() and deadline > now();
  if not found then perform public.challenge_not_changed('angenommen werden'); end if;
end;
$$;

create function public.report_challenge(p_challenge_id uuid, p_photo_path text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_photo_path is null or p_photo_path not like auth.uid()::text || '/%' then
    raise exception 'Ein eigenes Nachher-Foto ist Pflicht.' using errcode = 'P0001', hint = 'photo_required';
  end if;
  update public.challenges
     set status = 'reported', report_photo_path = p_photo_path, report_note = nullif(btrim(p_note), ''),
         reported_at = now()
   where id = p_challenge_id and status = 'accepted' and assignee_id = auth.uid();
  if not found then perform public.challenge_not_changed('als erledigt gemeldet werden'); end if;
end;
$$;

create function public.confirm_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = case when bounty_amount is null then 'confirmed' else 'payment_open' end,
         confirmed_at = now(), rejection_reason = null
   where id = p_challenge_id and status = 'reported' and author_id = auth.uid();
  if not found then perform public.challenge_not_changed('bestätigt werden'); end if;
end;
$$;

create function public.undo_confirm_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'reported', confirmed_at = null
   where id = p_challenge_id and status in ('confirmed', 'payment_open') and author_id = auth.uid();
  if not found then perform public.challenge_not_changed('zurückgesetzt werden'); end if;
end;
$$;

create function public.reject_challenge(p_challenge_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Bitte gib eine Begründung ein.' using errcode = 'P0001', hint = 'reason_required';
  end if;
  update public.challenges
     set status = 'accepted', rejection_reason = btrim(p_reason)
   where id = p_challenge_id and status = 'reported' and author_id = auth.uid();
  if not found then perform public.challenge_not_changed('abgelehnt werden'); end if;
end;
$$;

create function public.mark_challenge_paid(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'paid_marked', paid_marked_at = now()
   where id = p_challenge_id and status = 'payment_open' and author_id = auth.uid();
  if not found then perform public.challenge_not_changed('als bezahlt markiert werden'); end if;
end;
$$;

create function public.unmark_challenge_paid(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'payment_open', paid_marked_at = null
   where id = p_challenge_id and status = 'paid_marked' and author_id = auth.uid();
  if not found then perform public.challenge_not_changed('als unbezahlt markiert werden'); end if;
end;
$$;

create function public.confirm_bounty_received(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'paid', paid_at = now()
   where id = p_challenge_id and status = 'paid_marked' and assignee_id = auth.uid();
  if not found then perform public.challenge_not_changed('als erhalten bestätigt werden'); end if;
end;
$$;

-- Offene Challenges oder Bounties? Dann kein Pausieren und kein Löschen.
create function public.has_open_work()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenges c
    where (c.assignee_id = (select auth.uid()) and c.status in ('accepted', 'reported', 'payment_open', 'paid_marked'))
       or (c.author_id = (select auth.uid()) and c.status in ('reported', 'payment_open'))
  );
$$;

-- Funktionen nur für Angemeldete.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_active_member(),
  public.accept_challenge(uuid),
  public.report_challenge(uuid, text, text),
  public.confirm_challenge(uuid),
  public.undo_confirm_challenge(uuid),
  public.reject_challenge(uuid, text),
  public.mark_challenge_paid(uuid),
  public.unmark_challenge_paid(uuid),
  public.confirm_bounty_received(uuid),
  public.has_open_work()
to authenticated;
revoke execute on function public.handle_new_user(), public.set_challenge_kiez(), public.challenge_not_changed(text)
  from authenticated;
